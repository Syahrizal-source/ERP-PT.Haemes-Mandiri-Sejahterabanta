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

type PpnStatus = "UNPAID" | "PARTIAL" | "PAID";

interface Ppn {
  id: number;
  id_transaksi: number;
  jenis_ppn: "masukan" | "keluaran";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
  nomor_seri: string | null;
  vendor_id: number | null;
  keterangan: string | null;
  nilai_transaksi: number;
  created_at: string;
}

interface PembayaranPpn {
  id: number;
  id_ppn: number;
  nominal: number;
}

interface PpnOption extends Ppn {
  terbayar: number;
  sisa: number;
  status: PpnStatus;
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
  id_ppn: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/*
 * COA HUTANG PPN sudah ditentukan oleh backend/helper:
 *
 * PAJAK_PPN / HUTANG
 *        ↓
 * 53 - 21301 Hutang Pajak PPN
 *
 * Frontend TIDAK mengirim id_coa_hutang.
 */
const PPN_HUTANG_COA_ID = 53;
const PPN_HUTANG_COA_LABEL = "53 - 21301 Hutang Pajak PPN";

/*
 * 3 = 11100 Kas = HEADER.
 * Tidak boleh menjadi COA kredit jurnal pembayaran.
 */
const COA_KAS_HEADER_ID = 3;

const PPN_ENDPOINT = "/api/ppn";
const PAYMENT_ENDPOINT = "/api/pembayaran-ppn";
const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_ppn: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [ppnList, setPpnList] = useState<PpnOption[]>([]);
  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [loadingPpn, setLoadingPpn] = useState<boolean>(true);
  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPpn: PpnOption | undefined = useMemo(
    (): PpnOption | undefined =>
      ppnList.find((item: PpnOption): boolean => item.id === form.id_ppn),
    [form.id_ppn, ppnList],
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

  const sisaPpn: number = selectedPpn ? Math.max(selectedPpn.sisa, 0) : 0;

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
   * LOAD PPN + PEMBAYARAN
   *
   * PENTING:
   * Tabel public.ppn TIDAK mempunyai kolom "tanggal".
   *
   * Kolom yang benar:
   * - tanggal_transaksi
   * - nilai_transaksi
   * - tarif_ppn
   * - ppn_terutang
   *
   * Tabel pembayaran_ppn digunakan untuk menghitung:
   * - terbayar
   * - sisa
   * - status
   *
   * Jadi dropdown tidak lagi bergantung pada kolom yang
   * tidak ada di database.
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPpn(): Promise<void> {
      try {
        setLoadingPpn(true);

        const [ppnResponse, paymentResponse] = await Promise.all([
          fetch(PPN_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const ppnResult: unknown = await readJsonSafely(ppnResponse);

        if (!ppnResponse.ok) {
          throw new Error(
            getErrorMessage(ppnResult, "Gagal mengambil daftar PPN."),
          );
        }

        const paymentResult: unknown = await readJsonSafely(paymentResponse);

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPN.",
            ),
          );
        }

        if (!Array.isArray(ppnResult)) {
          throw new Error("Format daftar PPN tidak valid.");
        }

        const pembayaranRows: PembayaranPpn[] =
          normalizePembayaranList(paymentResult);

        const pembayaranMap = new Map<number, number>();

        for (const pembayaran of pembayaranRows) {
          const current: number = pembayaranMap.get(pembayaran.id_ppn) ?? 0;

          pembayaranMap.set(pembayaran.id_ppn, current + pembayaran.nominal);
        }

        const normalizedPpn: Ppn[] = normalizePpnList(ppnResult);

        const options: PpnOption[] = normalizedPpn.map(
          (item: Ppn): PpnOption => {
            const terbayar: number = pembayaranMap.get(item.id) ?? 0;

            const sisa: number = Math.max(item.nilai_ppn - terbayar, 0);

            return {
              ...item,
              terbayar,
              sisa,
              status: getPpnStatus(sisa, terbayar),
            };
          },
        );

        if (!active) {
          return;
        }

        setPpnList(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPN PAYMENT SOURCE ERROR:", error);
        setPpnList([]);

        await Swal.fire(
          "Data PPN Tidak Dapat Dimuat",
          getUnknownErrorMessage(
            error,
            "Daftar PPN tidak dapat digunakan untuk pembayaran.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPpn(false);
        }
      }
    }

    void loadPpn();

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
      return "Tanggal pembayaran PPN wajib diisi.";
    }

    if (form.id_ppn <= 0) {
      return "Pilih PPN yang akan dibayar.";
    }

    if (!selectedPpn) {
      return "Data PPN yang dipilih tidak tersedia.";
    }

    if (selectedPpn.nilai_ppn <= 0) {
      return "Nilai nilai PPN terutang tidak valid.";
    }

    if (selectedPpn.sisa <= 0 || selectedPpn.status === "PAID") {
      return "PPN yang dipilih sudah lunas.";
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
      return "Nominal pembayaran PPN harus lebih besar dari 0.";
    }

    if (form.nominal > selectedPpn.sisa + 0.01) {
      return (
        `Nominal pembayaran melebihi sisa PPN. ` +
        `Maksimal pembayaran: ${formatRupiah(selectedPpn.sisa)}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan pembayaran PPN wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   *
   * Database pembayaran_ppn:
   * - tanggal
   * - id_ppn
   * - nominal
   * - keterangan
   * - id_coa_kas
   *
   * Tidak mengirim:
   * - id_coa_hutang
   * - ppn
   * - pph23
   * - total
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
       * PAJAK_PPN / HUTANG
       *        ↓
       * 53 - 21301 Hutang Pajak PPN
       *
       * Kredit:
       * id_coa_kas pilihan user.
       */
      const payload = {
        tanggal: form.tanggal,
        id_ppn: form.id_ppn,
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
          getErrorMessage(result, "Gagal menyimpan pembayaran PPN."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(result, "Pembayaran PPN dan jurnal berhasil dibuat."),
        "success",
      );

      router.push("/pajak/pembayaran-ppn");

      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PEMBAYARAN PPN ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal menyimpan pembayaran PPN."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loadingPpn || loadingCoa) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Tambah Pembayaran PPN">
          <div className="flex items-center justify-center py-12">
            <Loader2Icon />

            <span>Memuat data pembayaran PPN...</span>
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
      <Card title="Tambah Pembayaran PPN">
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
              PPN YANG DIBAYAR
              ================================================== */}

          <div>
            <label className="text-sm">PPN yang Dibayar</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_ppn}
              disabled={saving}
              onChange={(event) => {
                const idPpn: number = Number(event.target.value);

                const selected: PpnOption | undefined = ppnList.find(
                  (item: PpnOption): boolean => item.id === idPpn,
                );

                handleChange("id_ppn", idPpn);

                /*
                 * Saat memilih PPN baru, isi nominal
                 * dengan 0 agar user secara sadar mengisi
                 * jumlah pembayaran.
                 */
                handleChange("nominal", 0);

                /*
                 * Keterangan tidak diubah otomatis.
                 * User tetap mengontrol keterangan pembayaran.
                 */
                void selected;
              }}
            >
              <option value={0}>
                {ppnList.length === 0
                  ? "Tidak ada PPN yang dapat dibayar"
                  : "Pilih PPN"}
              </option>

              {ppnList.map((item: PpnOption) => {
                const disabled: boolean =
                  item.sisa <= 0 || item.status === "PAID";

                const jenisPpnLabel: string =
                  item.jenis_ppn === "masukan" ? "PPN Masukan" : "PPN Keluaran";

                return (
                  <option key={item.id} value={item.id} disabled={disabled}>
                    #{item.id} | {jenisPpnLabel} |{" "}
                    {formatTanggal(item.tanggal_transaksi)} | PPN:{" "}
                    {formatRupiah(item.nilai_ppn)} | Sisa:{" "}
                    {formatRupiah(item.sisa)} | {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Data diambil dari public.ppn menggunakan tanggal_transaksi. Sisa
              dihitung dari nilai PPN terutang dikurangi pembayaran sebelumnya.
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
              Hanya COA kas/bank DETAIL yang aktif. COA 3 - 11100 Kas adalah
              HEADER dan tidak dapat digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPN"
            type="number"
            min={0}
            value={form.nominal}
            disabled={saving || !selectedPpn}
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
            INFORMASI PPN
            ==================================================== */}

        {selectedPpn ? (
          <div className="mt-4 rounded border p-4 text-sm">
            <p className="font-semibold">Informasi PPN</p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem
                label="Jenis PPN"
                value={
                  selectedPpn.jenis_ppn === "masukan"
                    ? "PPN Masukan"
                    : "PPN Keluaran"
                }
              />

              <InfoItem
                label="Tanggal Transaksi"
                value={formatTanggal(selectedPpn.tanggal_transaksi)}
              />

              <InfoItem
                label="ID Transaksi"
                value={`#${selectedPpn.id_transaksi}`}
              />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(selectedPpn.nilai_transaksi)}
              />

              <InfoItem
                label="Nilai Dasar"
                value={formatRupiah(selectedPpn.nilai_dasar)}
              />

              <InfoItem
                label="Tarif PPN"
                value={`${formatNumber(selectedPpn.tarif_ppn)}%`}
              />

              <InfoItem
                label="Nilai PPN"
                value={formatRupiah(selectedPpn.nilai_ppn)}
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(selectedPpn.terbayar)}
              />

              <InfoItem
                label="Sisa PPN"
                value={formatRupiah(selectedPpn.sisa)}
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
              value={formatRupiah(sisaPpn)}
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">Jurnal Pembayaran PPN</p>

          <p className="mt-2">
            <strong>Debit:</strong> {PPN_HUTANG_COA_LABEL}
          </p>

          <p className="mt-1">
            <strong>Kredit:</strong>{" "}
            {selectedCoaKas
              ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
              : "COA Kas / Bank DETAIL yang dipilih"}
          </p>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPN tidak dipilih dari frontend. Backend/helper
            menetapkan COA 53.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Pembayaran PPN tidak menggunakan COA 2265 Beban Pajak PPN dan tidak
            menggunakan COA 3 - 11100 Kas HEADER.
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
            disabled={saving || ppnList.length === 0 || coaKasList.length === 0}
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving ? "Menyimpan..." : "Simpan Pembayaran PPN"}
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
 * NORMALIZE PPN
 *
 * Mengikuti struktur database public.ppn:
 *
 * id
 * id_vendor
 * jenis_objek
 * nilai_transaksi
 * tarif_ppn
 * ppn_terutang
 * tanggal_transaksi
 * created_at
 * ...
 * ============================================================ */

function normalizePpnList(value: unknown[]): Ppn[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): Ppn => ({
        id: Number(item.id),
        id_transaksi: Number(item.id_transaksi),
        jenis_ppn: item.jenis_ppn === "masukan" ? "masukan" : "keluaran",
        nilai_dasar: Number(item.nilai_dasar ?? 0),
        tarif_ppn: Number(item.tarif_ppn ?? 0),
        nilai_ppn: Number(item.nilai_ppn ?? 0),
        tanggal_transaksi: String(item.tanggal_transaksi ?? ""),
        nomor_seri:
          item.nomor_seri === null || item.nomor_seri === undefined
            ? null
            : String(item.nomor_seri),
        vendor_id:
          item.vendor_id === null || item.vendor_id === undefined
            ? null
            : Number(item.vendor_id),
        keterangan:
          item.keterangan === null || item.keterangan === undefined
            ? null
            : String(item.keterangan),
        nilai_transaksi: Number(item.nilai_transaksi ?? 0),
        created_at: String(item.created_at ?? ""),
      }),
    )
    .filter(
      (item: Ppn): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_transaksi) &&
        item.id_transaksi > 0 &&
        item.tanggal_transaksi.length > 0 &&
        Number.isFinite(item.nilai_ppn) &&
        item.nilai_ppn > 0,
    );
}

/* ============================================================
 * NORMALIZE PEMBAYARAN
 *
 * Hanya mengambil kolom yang benar-benar diperlukan:
 *
 * id
 * id_ppn
 * nominal
 * ============================================================ */

function normalizePembayaranList(value: unknown): PembayaranPpn[] {
  const rows: unknown[] = Array.isArray(value)
    ? value
    : getArrayFromResponse(value);

  return rows
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPpn => ({
        id: Number(item.id),
        id_ppn: Number(item.id_ppn),
        nominal: Number(item.nominal ?? 0),
      }),
    )
    .filter(
      (item: PembayaranPpn): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_ppn) &&
        item.id_ppn > 0 &&
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
 * - aktif
 * - is_cash
 * - bukan header
 * - bukan id_coa 3
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

function getPpnStatus(sisa: number, terbayar: number): PpnStatus {
  if (sisa <= 0) {
    return "PAID";
  }

  if (terbayar > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: PpnStatus): string {
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
