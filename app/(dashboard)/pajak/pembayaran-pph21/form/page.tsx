"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";
import { ArrowLeft, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type Pph21Status = "UNPAID" | "PARTIAL" | "PAID";

interface Pph21 {
  id: number;
  id_payroll: number;
  nama: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  nilai_pph21: number;
  tanggal: string;
  created_at: string;
  thr: number;
  penghasilan_bruto: number;
  status_ptkp: string;
}

interface PembayaranPph21 {
  id: number;
  id_pph21: number;
  nominal: number;
}

interface Pph21Option extends Pph21 {
  terbayar: number;
  sisa: number;
  status: Pph21Status;
}

interface CoaKas {
  id_coa: number;
  kode: string;
  nama: string;
  is_cash: boolean;
  is_header: boolean;
  aktif: boolean;
}

interface FormState {
  tanggal: string;
  id_pph21: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/**
 * COA HUTANG PPh21 ditentukan oleh backend/helper.
 *
 * Mapping yang sudah ada:
 *
 * PAJAK / HUTANG
 *       ↓
 * 54 - 21302 Hutang Pajak PPh 21
 *
 * Frontend TIDAK mengirim id_coa_hutang.
 */
const PPH21_HUTANG_COA_ID = 54;

const PPH21_HUTANG_COA_LABEL = "54 - 21302 Hutang Pajak PPh 21";

/**
 * 2263 - 62001 Beban Pajak PPh21
 *
 * Tidak digunakan saat pembayaran.
 */
const PPH21_BEBAN_COA_ID = 2263;

const PPH21_BEBAN_COA_LABEL = "2263 - 62001 Beban Pajak PPh21";

/**
 * 1212 - 21307 Hutang PPh21 Proyek
 *
 * Khusus proyek.
 * Tidak digunakan untuk pembayaran PPh21 umum.
 */
const PPH21_PROYEK_HUTANG_COA_ID = 1212;

const PPH21_PROYEK_HUTANG_COA_LABEL = "1212 - 21307 Hutang PPh21 Proyek";

/**
 * 3 - 11100 Kas
 *
 * HEADER.
 * Tidak boleh menjadi COA kredit jurnal pembayaran.
 */
const COA_KAS_HEADER_ID = 3;

const COA_KAS_HEADER_LABEL = "3 - 11100 Kas";

/* ============================================================
 * ENDPOINT
 * ============================================================ */

const PPH21_ENDPOINT = "/api/pph21";

const PAYMENT_ENDPOINT = "/api/pembayaran-pph21";

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),

    id_pph21: 0,

    id_coa_kas: 0,

    nominal: 0,

    keterangan: "",
  });

  const [pph21List, setPph21List] = useState<Pph21Option[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [loadingPph21, setLoadingPph21] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPph21: Pph21Option | undefined = useMemo(
    (): Pph21Option | undefined =>
      pph21List.find((item: Pph21Option): boolean => item.id === form.id_pph21),
    [form.id_pph21, pph21List],
  );

  const selectedCoaKas: CoaKas | undefined = useMemo(
    (): CoaKas | undefined =>
      coaKasList.find(
        (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
      ),
    [coaKasList, form.id_coa_kas],
  );

  const nominal: number = Number.isFinite(form.nominal)
    ? Math.max(form.nominal, 0)
    : 0;

  const sisaPph21: number = selectedPph21 ? Math.max(selectedPph21.sisa, 0) : 0;

  /* ==========================================================
   * CHANGE FORM
   * ========================================================== */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm(
      (previous: FormState): FormState => ({
        ...previous,
        [field]: value,
      }),
    );
  }

  /* ==========================================================
   * LOAD PPH21 + PEMBAYARAN
   *
   * public.pph21:
   *
   * - id
   * - id_payroll
   * - nama
   * - gaji_bruto
   * - biaya_jabatan
   * - iuran
   * - tarif_pph21
   * - nilai_pph21
   * - tanggal
   * - created_at
   * - thr
   * - penghasilan_bruto
   * - status_ptkp
   *
   * pembayaran_pph21:
   *
   * - id
   * - id_pph21
   * - nominal
   *
   * Sisa:
   *
   * nilai_pph21
   * -
   * SUM(pembayaran_pph21.nominal)
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph21(): Promise<void> {
      try {
        setLoadingPph21(true);

        const [pph21Response, paymentResponse] = await Promise.all([
          fetch(PPH21_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),

          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const pph21Result: unknown = await readJsonSafely(pph21Response);

        if (!pph21Response.ok) {
          throw new Error(
            getErrorMessage(pph21Result, "Gagal mengambil daftar PPh21."),
          );
        }

        const paymentResult: unknown = await readJsonSafely(paymentResponse);

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPh21.",
            ),
          );
        }

        if (!Array.isArray(pph21Result)) {
          throw new Error("Format daftar PPh21 tidak valid.");
        }

        const pembayaranRows: PembayaranPph21[] =
          normalizePembayaranList(paymentResult);

        /*
         * Total pembayaran per id_pph21.
         */

        const pembayaranMap = new Map<number, number>();

        for (const pembayaran of pembayaranRows) {
          const current: number = pembayaranMap.get(pembayaran.id_pph21) ?? 0;

          pembayaranMap.set(pembayaran.id_pph21, current + pembayaran.nominal);
        }

        const normalizedPph21: Pph21[] = normalizePph21List(pph21Result);

        const options: Pph21Option[] = normalizedPph21.map(
          (item: Pph21): Pph21Option => {
            const terbayar: number = pembayaranMap.get(item.id) ?? 0;

            const sisa: number = Math.max(item.nilai_pph21 - terbayar, 0);

            return {
              ...item,
              terbayar,
              sisa,
              status: getPph21Status(sisa, terbayar),
            };
          },
        );

        if (!active) {
          return;
        }

        setPph21List(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPH21 PAYMENT SOURCE ERROR:", error);

        setPph21List([]);

        await Swal.fire(
          "Data PPh21 Tidak Dapat Dimuat",
          getUnknownErrorMessage(
            error,
            "Daftar PPh21 tidak dapat digunakan untuk pembayaran.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPph21(false);
        }
      }
    }

    void loadPph21();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
   *
   * Hanya:
   * - aktif
   * - is_cash = true
   * - bukan header
   * - bukan id_coa 3
   *
   * COA 3 - 11100 Kas sengaja dikeluarkan.
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingCoa(true);

        const response = await fetch(COA_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar COA kas/bank."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format daftar COA tidak valid.");
        }

        const normalized: CoaKas[] = normalizeCoaKasList(result);

        if (!active) {
          return;
        }

        setCoaKasList(normalized);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD COA KAS ERROR:", error);

        setCoaKasList([]);

        await Swal.fire(
          "COA Tidak Tersedia",
          getUnknownErrorMessage(
            error,
            "Daftar COA kas/bank tidak dapat dimuat.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingCoa(false);
        }
      }
    }

    void loadCoaKas();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * VALIDASI FORM
   * ========================================================== */

  function validateForm(): string | null {
    if (!form.tanggal) {
      return "Tanggal pembayaran PPh21 wajib diisi.";
    }

    if (form.id_pph21 <= 0) {
      return "Pilih PPh21 yang akan dibayar.";
    }

    if (!selectedPph21) {
      return "Data PPh21 yang dipilih tidak tersedia.";
    }

    if (selectedPph21.nilai_pph21 <= 0) {
      return "Nilai PPh21 terutang tidak valid.";
    }

    if (selectedPph21.sisa <= 0 || selectedPph21.status === "PAID") {
      return "PPh21 yang dipilih sudah lunas.";
    }

    if (form.id_coa_kas <= 0) {
      return "Pilih kas/bank pembayaran.";
    }

    if (!selectedCoaKas) {
      return "COA kas/bank yang dipilih tidak tersedia.";
    }

    if (!selectedCoaKas.aktif) {
      return "COA kas/bank tidak aktif.";
    }

    if (!selectedCoaKas.is_cash) {
      return "COA yang dipilih bukan akun kas/bank.";
    }

    if (selectedCoaKas.is_header) {
      return "COA kas/bank harus berupa COA DETAIL, bukan HEADER.";
    }

    if (selectedCoaKas.id_coa === COA_KAS_HEADER_ID) {
      return (
        "COA 3 - 11100 Kas adalah COA HEADER. " + "Gunakan COA kas/bank DETAIL."
      );
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran PPh21 harus lebih besar dari 0.";
    }

    if (form.nominal > selectedPph21.sisa + 0.01) {
      return (
        `Nominal pembayaran melebihi sisa PPh21. ` +
        `Maksimal pembayaran: ${formatRupiah(selectedPph21.sisa)}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan pembayaran PPh21 wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   *
   * Database:
   *
   * public.pembayaran_pph21
   *
   * - tanggal
   * - id_pph21
   * - nominal
   * - keterangan
   * - id_coa_kas
   * - id_jurnal
   *
   * Frontend hanya mengirim:
   *
   * - tanggal
   * - id_pph21
   * - id_coa_kas
   * - nominal
   * - keterangan
   *
   * TIDAK mengirim:
   *
   * - id_coa_hutang
   * - id_coa_beban
   * - id_coa_proyek
   *
   * COA hutang ditentukan backend/helper:
   *
   * PAJAK / HUTANG
   *       ↓
   * 54 - 21302 Hutang Pajak PPh 21
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError: string | null = validateForm();

    if (validationError) {
      await Swal.fire("Data Belum Lengkap", validationError, "warning");

      return;
    }

    try {
      setSaving(true);

      /*
       * COA HUTANG TIDAK DIKIRIM DARI FRONTEND.
       *
       * Backend/helper harus menghasilkan:
       *
       * PAJAK / HUTANG
       *       ↓
       * 54 - 21302 Hutang Pajak PPh 21
       *
       * Kredit:
       * id_coa_kas pilihan user.
       */

      const payload = {
        tanggal: form.tanggal,

        id_pph21: form.id_pph21,

        id_coa_kas: form.id_coa_kas,

        nominal: form.nominal,

        keterangan: form.keterangan.trim(),
      };

      const response = await fetch(PAYMENT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menyimpan pembayaran PPh21."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(
          result,
          "Pembayaran PPh21 dan jurnal berhasil dibuat.",
        ),
        "success",
      );

      router.push("/pajak/pembayaran-pph21");

      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PEMBAYARAN PPH21 ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal menyimpan pembayaran PPh21."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loadingPph21 || loadingCoa) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Tambah Pembayaran PPh21">
          <div className="flex items-center justify-center py-12">
            <Loader2Icon />

            <span>Memuat data pembayaran PPh21...</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Tambah Pembayaran PPh21">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
              TANGGAL PEMBAYARAN
              ================================================== */}

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* ==================================================
              PPH21 YANG DIBAYAR
              ================================================== */}

          <div>
            <label className="text-sm">PPh21 yang Dibayar</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph21}
              disabled={saving}
              onChange={(event) => {
                const idPph21: number = Number(event.target.value);

                handleChange("id_pph21", idPph21);

                /*
                 * Saat memilih PPh21 baru,
                 * nominal dikembalikan ke 0
                 * agar user mengisi jumlah
                 * pembayaran secara sadar.
                 */

                handleChange("nominal", 0);
              }}
            >
              <option value={0}>
                {pph21List.length === 0
                  ? "Tidak ada PPh21 yang dapat dibayar"
                  : "Pilih PPh21"}
              </option>

              {pph21List.map((item: Pph21Option) => {
                const disabled: boolean =
                  item.sisa <= 0 || item.status === "PAID";

                return (
                  <option key={item.id} value={item.id} disabled={disabled}>
                    #{item.id} | {item.nama} | Payroll #{item.id_payroll} |{" "}
                    {formatTanggal(item.tanggal)} | PPh21:{" "}
                    {formatRupiah(item.nilai_pph21)} | Sisa:{" "}
                    {formatRupiah(item.sisa)} | {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Data kewajiban diambil dari public.pph21. Nilai terutang
              menggunakan field nilai_pph21. Sisa dihitung dari nilai_pph21
              dikurangi pembayaran sebelumnya.
            </p>
          </div>

          {/* ==================================================
              COA KAS / BANK
              ================================================== */}

          <div>
            <label className="text-sm">Kas / Bank Pembayaran</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_coa_kas}
              disabled={saving}
              onChange={(event) =>
                handleChange("id_coa_kas", Number(event.target.value))
              }
            >
              <option value={0}>
                {coaKasList.length === 0
                  ? "Tidak ada COA kas/bank detail"
                  : "Pilih kas/bank"}
              </option>

              {coaKasList.map((coa: CoaKas) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya COA kas/bank DETAIL yang aktif. COA {COA_KAS_HEADER_LABEL}{" "}
              adalah HEADER dan tidak dapat digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPh21"
            type="number"
            min={0}
            value={form.nominal}
            disabled={saving || !selectedPph21}
            onChange={(event) =>
              handleChange("nominal", Number(event.target.value))
            }
          />

          {/* ==================================================
              KETERANGAN
              ================================================== */}

          <div className="md:col-span-2">
            <Input
              label="Keterangan"
              value={form.keterangan}
              disabled={saving}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI PPH21
            ==================================================== */}

        {selectedPph21 ? (
          <div className="mt-4 rounded border p-4 text-sm">
            <p className="font-semibold">Informasi PPh21</p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem label="Nama" value={selectedPph21.nama || "-"} />

              <InfoItem
                label="ID Payroll"
                value={`#${selectedPph21.id_payroll}`}
              />

              <InfoItem
                label="Tanggal PPh21"
                value={formatTanggal(selectedPph21.tanggal)}
              />

              <InfoItem
                label="Status PTKP"
                value={selectedPph21.status_ptkp || "-"}
              />

              <InfoItem
                label="Gaji Bruto"
                value={formatRupiah(selectedPph21.gaji_bruto)}
              />

              <InfoItem label="THR" value={formatRupiah(selectedPph21.thr)} />

              <InfoItem
                label="Penghasilan Bruto"
                value={formatRupiah(selectedPph21.penghasilan_bruto)}
              />

              <InfoItem
                label="Biaya Jabatan"
                value={formatRupiah(selectedPph21.biaya_jabatan)}
              />

              <InfoItem
                label="Iuran"
                value={formatRupiah(selectedPph21.iuran)}
              />

              <InfoItem
                label="Tarif PPh21"
                value={`${formatNumber(selectedPph21.tarif_pph21)}%`}
              />

              <InfoItem
                label="PPh21 Terutang"
                value={formatRupiah(selectedPph21.nilai_pph21)}
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(selectedPph21.terbayar)}
              />

              <InfoItem
                label="Sisa PPh21"
                value={formatRupiah(selectedPph21.sisa)}
              />

              <InfoItem
                label="Status"
                value={getStatusLabel(selectedPph21.status)}
              />
            </div>
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI PEMBAYARAN
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">Informasi Pembayaran</p>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <InfoItem
              label="Nominal Pembayaran"
              value={formatRupiah(nominal)}
            />

            <InfoItem
              label="Maksimal Pembayaran"
              value={formatRupiah(sisaPph21)}
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI COA
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">Accounting Pembayaran PPh21</p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Debit</p>

              <p className="mt-1 font-medium">{PPH21_HUTANG_COA_LABEL}</p>

              <p className="mt-1 text-xs text-gray-500">
                Pelunasan kewajiban PPh21.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Kredit</p>

              <p className="mt-1 font-medium">
                {selectedCoaKas
                  ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
                  : "COA Kas / Bank DETAIL yang dipilih"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                COA harus aktif, is_cash=true, dan bukan header.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded bg-gray-50 p-3">
            <p className="text-xs font-medium">
              COA yang tidak digunakan pada pembayaran ini
            </p>

            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>
                {PPH21_BEBAN_COA_ID} - {PPH21_BEBAN_COA_LABEL} → beban, bukan
                akun pembayaran.
              </li>

              <li>
                {PPH21_PROYEK_HUTANG_COA_ID} - {PPH21_PROYEK_HUTANG_COA_LABEL} →
                khusus PPh21 proyek.
              </li>

              <li>
                {COA_KAS_HEADER_LABEL} → COA HEADER, tidak boleh diposting.
              </li>
            </ul>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh21 tidak dipilih dari frontend. Backend/helper
            menetapkan COA 54 melalui mapping yang sudah tersedia.
          </p>
        </div>

        {/* ====================================================
            BUTTON
            ==================================================== */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            type="button"
            disabled={saving}
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            type="button"
            disabled={
              saving || pph21List.length === 0 || coaKasList.length === 0
            }
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving ? "Menyimpan..." : "Simpan Pembayaran PPh21"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * LOADING ICON
 * ============================================================ */

function Loader2Icon(): React.JSX.Element {
  return (
    <span
      className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-label="Memuat"
    />
  );
}

/* ============================================================
 * INFO ITEM
 * ============================================================ */

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PPH21
 *
 * Mengikuti public.pph21:
 *
 * id
 * id_payroll
 * nama
 * gaji_bruto
 * biaya_jabatan
 * iuran
 * tarif_pph21
 * nilai_pph21
 * tanggal
 * created_at
 * thr
 * penghasilan_bruto
 * status_ptkp
 * ============================================================ */

function normalizePph21List(value: unknown[]): Pph21[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): Pph21 => ({
        id: Number(item.id),

        id_payroll: Number(item.id_payroll),

        nama: String(item.nama ?? ""),

        gaji_bruto: Number(item.gaji_bruto ?? 0),

        biaya_jabatan: Number(item.biaya_jabatan ?? 0),

        iuran: Number(item.iuran ?? 0),

        tarif_pph21: Number(item.tarif_pph21 ?? 0),

        nilai_pph21: Number(item.nilai_pph21 ?? 0),

        tanggal: String(item.tanggal ?? ""),

        created_at: String(item.created_at ?? ""),

        thr: Number(item.thr ?? 0),

        penghasilan_bruto: Number(item.penghasilan_bruto ?? 0),

        status_ptkp: String(item.status_ptkp ?? ""),
      }),
    )
    .filter(
      (item: Pph21): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_payroll) &&
        item.id_payroll > 0 &&
        item.nama.length > 0 &&
        item.tanggal.length > 0 &&
        Number.isFinite(item.nilai_pph21) &&
        item.nilai_pph21 > 0,
    );
}

/* ============================================================
 * NORMALIZE PEMBAYARAN
 *
 * Hanya:
 *
 * id
 * id_pph21
 * nominal
 * ============================================================ */

function normalizePembayaranList(value: unknown): PembayaranPph21[] {
  const rows: unknown[] = Array.isArray(value)
    ? value
    : getArrayFromResponse(value);

  return rows
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPph21 => ({
        id: Number(item.id),

        id_pph21: Number(item.id_pph21),

        nominal: Number(item.nominal ?? 0),
      }),
    )
    .filter(
      (item: PembayaranPph21): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_pph21) &&
        item.id_pph21 > 0 &&
        Number.isFinite(item.nominal) &&
        item.nominal > 0,
    );
}

/* ============================================================
 * RESPONSE ARRAY
 * ============================================================ */

function getArrayFromResponse(value: unknown): unknown[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }

  if (!("data" in value)) {
    return [];
  }

  const data: unknown = value.data;

  return Array.isArray(data) ? data : [];
}

/* ============================================================
 * NORMALIZE COA KAS
 *
 * Syarat:
 *
 * - aktif
 * - is_cash
 * - bukan header
 * - bukan id_coa 3
 *
 * ============================================================ */

function normalizeCoaKasList(value: unknown[]): CoaKas[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): CoaKas => ({
        id_coa: Number(item.id_coa),

        kode: String(item.kode ?? ""),

        nama: String(item.nama ?? ""),

        is_cash: item.is_cash === true,

        is_header: item.is_header === true,

        aktif: item.aktif === true,
      }),
    )
    .filter(
      (item: CoaKas): boolean =>
        Number.isInteger(item.id_coa) &&
        item.id_coa > 0 &&
        item.kode.length > 0 &&
        item.nama.length > 0 &&
        item.aktif === true &&
        item.is_cash === true &&
        item.is_header === false &&
        item.id_coa !== COA_KAS_HEADER_ID,
    )
    .sort((a: CoaKas, b: CoaKas): number =>
      a.kode.localeCompare(b.kode, "id", {
        numeric: true,
      }),
    );
}

/* ============================================================
 * STATUS
 * ============================================================ */

function getPph21Status(sisa: number, terbayar: number): Pph21Status {
  if (sisa <= 0) {
    return "PAID";
  }

  if (terbayar > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: Pph21Status): string {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "PARTIAL") {
    return "Sebagian";
  }

  return "Belum Dibayar";
}

/* ============================================================
 * FORMAT TANGGAL
 * ============================================================ */

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date: Date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ============================================================
 * FORMAT NUMBER
 * ============================================================ */

function formatNumber(value: number): string {
  const numberValue: number = Number.isFinite(value) ? value : 0;

  return numberValue.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(value: number): string {
  const amount: number = Number.isFinite(value) ? value : 0;

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType: string = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text: string = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(0, 200)}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error: unknown = value.error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback;
}

/* ============================================================
 * SUCCESS MESSAGE
 * ============================================================ */

function getSuccessMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "message" in value) {
    const message: unknown = value.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

/* ============================================================
 * UNKNOWN ERROR
 * ============================================================ */

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
