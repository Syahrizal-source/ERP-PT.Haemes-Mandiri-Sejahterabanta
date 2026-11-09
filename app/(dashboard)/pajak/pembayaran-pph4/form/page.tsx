"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { ArrowLeft, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* ============================================================
 * TYPE
 * ============================================================ */

type Pph4Status = "UNPAID" | "PARTIAL" | "PAID";

interface VendorInfo {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
}

interface Pph4 {
  id: number;
  id_vendor: number;
  jenis_objek: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
  tanggal_transaksi: string;
  vendor: VendorInfo | null;
}

interface Pph4Option extends Pph4 {
  total_pembayaran: number;
  sisa: number;
  status: Pph4Status;
}

interface PembayaranPph4Row {
  id: number;
  id_pph4: number;
  nominal: number;
}

interface CoaKas {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

interface FormState {
  tanggal: string;
  id_pph4: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

const PAYMENT_ENDPOINT = "/api/pembayaran-pph4";
const PPH4_ENDPOINT = "/api/pph4";
const COA_ENDPOINT = "/api/coa";

const PPH4_HUTANG_COA_ID = 2504;
const PPH4_HUTANG_COA_LABEL = "2504 - 21304 Hutang Pajak PPh4";

const COA_KAS_HEADER_ID = 3;

/* ============================================================
 * PAGE
 * ============================================================ */

export default function PembayaranPph4FormPage(): React.JSX.Element {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tanggal: getLocalDate(),
    id_pph4: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [pph4List, setPph4List] = useState<Pph4Option[]>([]);
  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [loadingPph4, setLoadingPph4] = useState<boolean>(true);
  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPph4 = useMemo(
    (): Pph4Option | undefined =>
      pph4List.find((item: Pph4Option): boolean => item.id === form.id_pph4),
    [pph4List, form.id_pph4],
  );

  const selectedCoaKas = useMemo(
    (): CoaKas | undefined =>
      coaKasList.find(
        (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
      ),
    [coaKasList, form.id_coa_kas],
  );

  const sisaPph4: number = selectedPph4?.sisa ?? 0;

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
   * LOAD PPH4 DAN RIWAYAT PEMBAYARAN
   *
   * Sumber PPh4:
   * /api/pph4
   *
   * Sumber pembayaran sebelumnya:
   * /api/pembayaran-pph4
   *
   * Kolom tanggal PPh4 yang digunakan:
   * tanggal_transaksi
   *
   * Bukan tanggal.
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph4(): Promise<void> {
      try {
        setLoadingPph4(true);

        const [pph4Response, paymentResponse] = await Promise.all([
          fetch(PPH4_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const pph4Result: unknown = await readJsonSafely(pph4Response);

        if (!pph4Response.ok) {
          throw new Error(
            getErrorMessage(pph4Result, "Gagal mengambil daftar PPh4."),
          );
        }

        const paymentResult: unknown = await readJsonSafely(paymentResponse);

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPh4.",
            ),
          );
        }

        if (!Array.isArray(pph4Result)) {
          throw new Error("Format daftar PPh4 tidak valid.");
        }

        const pph4Rows: Pph4[] = normalizePph4List(pph4Result);

        const paymentRows: PembayaranPph4Row[] =
          normalizePembayaranList(paymentResult);

        const paymentMap = new Map<number, number>();

        for (const payment of paymentRows) {
          const current = paymentMap.get(payment.id_pph4) ?? 0;

          paymentMap.set(payment.id_pph4, current + payment.nominal);
        }

        const options: Pph4Option[] = pph4Rows.map((item: Pph4): Pph4Option => {
          const totalPembayaran = paymentMap.get(item.id) ?? 0;

          const sisa = Math.max(item.pph4_terutang - totalPembayaran, 0);

          return {
            ...item,
            total_pembayaran: totalPembayaran,
            sisa,
            status: getPph4Status(sisa, totalPembayaran),
          };
        });

        if (!active) {
          return;
        }

        setPph4List(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPH4 PAYMENT ERROR:", error);

        setPph4List([]);

        await Swal.fire({
          icon: "error",
          title: "Data PPh4 Tidak Dapat Dimuat",
          text: getUnknownErrorMessage(
            error,
            "Daftar PPh4 tidak dapat digunakan untuk pembayaran.",
          ),
        });
      } finally {
        if (active) {
          setLoadingPph4(false);
        }
      }
    }

    void loadPph4();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
   *
   * Ketentuan:
   * - aktif
   * - is_cash = true
   * - is_header = false
   * - bukan COA 3
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

        const normalized = normalizeCoaKasList(result);

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

        await Swal.fire({
          icon: "error",
          title: "COA Tidak Tersedia",
          text: getUnknownErrorMessage(
            error,
            "Daftar COA kas/bank tidak dapat dimuat.",
          ),
        });
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
    if (!isValidDateOnly(form.tanggal)) {
      return "Tanggal pembayaran tidak valid.";
    }

    if (!Number.isSafeInteger(form.id_pph4) || form.id_pph4 <= 0) {
      return "Pilih data PPh4 yang akan dibayar.";
    }

    if (!selectedPph4) {
      return "Data PPh4 yang dipilih tidak ditemukan.";
    }

    if (
      !Number.isFinite(selectedPph4.pph4_terutang) ||
      selectedPph4.pph4_terutang <= 0
    ) {
      return "Nilai PPh4 terutang tidak valid.";
    }

    if (selectedPph4.sisa <= 0 || selectedPph4.status === "PAID") {
      return "PPh4 yang dipilih sudah lunas.";
    }

    if (!Number.isSafeInteger(form.id_coa_kas) || form.id_coa_kas <= 0) {
      return "Pilih COA kas/bank pembayaran.";
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
      return "COA 3 - 11100 Kas adalah HEADER. Pilih COA kas/bank DETAIL.";
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran harus lebih besar dari 0.";
    }

    if (Math.round(form.nominal * 100) !== form.nominal * 100) {
      return "Nominal pembayaran maksimal dua angka desimal.";
    }

    if (form.nominal > selectedPph4.sisa + 0.01) {
      return (
        "Nominal pembayaran melebihi sisa kewajiban PPh4. " +
        `Maksimal pembayaran: ${formatRupiah(selectedPph4.sisa)}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan pembayaran wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   *
   * Payload sesuai API:
   * tanggal
   * id_pph4
   * id_coa_kas
   * nominal
   * keterangan
   *
   * COA hutang ditentukan backend.
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      await Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        text: validationError,
      });

      return;
    }

    try {
      setSaving(true);

      const payload = {
        tanggal: form.tanggal,
        id_pph4: form.id_pph4,
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
          getErrorMessage(result, "Gagal menyimpan pembayaran PPh4."),
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Pembayaran PPh4 Berhasil",
        text: getSuccessMessage(
          result,
          "Pembayaran PPh4 dan jurnal berhasil dibuat.",
        ),
      });

      router.push("/pajak/pembayaran-pph4");
      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PEMBAYARAN PPH4 ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: getUnknownErrorMessage(error, "Gagal menyimpan pembayaran PPh4."),
      });
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loadingPph4 || loadingCoa) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Tambah Pembayaran PPh4">
          <div className="flex items-center justify-center gap-3 py-12">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            <span className="text-sm text-gray-600">
              Memuat data PPh4 dan COA kas/bank...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card title="Tambah Pembayaran PPh4">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* TANGGAL */}

          <div>
            <label htmlFor="tanggal" className="mb-1 block text-sm font-medium">
              Tanggal Pembayaran
            </label>

            <input
              id="tanggal"
              type="date"
              value={form.tanggal}
              disabled={saving}
              onChange={(event) => handleChange("tanggal", event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* PILIH PPH4 */}

          <div>
            <label htmlFor="id_pph4" className="mb-1 block text-sm font-medium">
              PPh4 yang Dibayar
            </label>

            <select
              id="id_pph4"
              value={form.id_pph4}
              disabled={saving || pph4List.length === 0}
              onChange={(event) => {
                handleChange("id_pph4", Number(event.target.value));

                handleChange("nominal", 0);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value={0}>
                {pph4List.length === 0
                  ? "Tidak ada PPh4 yang dapat dibayar"
                  : "Pilih PPh4"}
              </option>

              {pph4List.map((item: Pph4Option) => {
                const vendorName =
                  item.vendor?.nama_vendor ?? `Vendor #${item.id_vendor}`;

                return (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.sisa <= 0 || item.status === "PAID"}
                  >
                    #{item.id} | {vendorName} |{" "}
                    {formatTanggal(item.tanggal_transaksi)} | PPh4:{" "}
                    {formatRupiah(item.pph4_terutang)} | Sisa:{" "}
                    {formatRupiah(item.sisa)} | {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya kewajiban PPh4 yang belum lunas yang dapat dipilih.
            </p>
          </div>

          {/* COA KAS */}

          <div>
            <label
              htmlFor="id_coa_kas"
              className="mb-1 block text-sm font-medium"
            >
              Kas / Bank Pembayaran
            </label>

            <select
              id="id_coa_kas"
              value={form.id_coa_kas}
              disabled={saving || coaKasList.length === 0}
              onChange={(event) =>
                handleChange("id_coa_kas", Number(event.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value={0}>
                {coaKasList.length === 0
                  ? "Tidak ada COA kas/bank DETAIL"
                  : "Pilih kas/bank"}
              </option>

              {coaKasList.map((coa: CoaKas) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya COA kas/bank aktif dan DETAIL. COA HEADER tidak dapat
              digunakan.
            </p>
          </div>

          {/* NOMINAL */}

          <div>
            <label htmlFor="nominal" className="mb-1 block text-sm font-medium">
              Nominal Pembayaran
            </label>

            <input
              id="nominal"
              type="number"
              min="0.01"
              step="0.01"
              max={selectedPph4?.sisa ?? undefined}
              value={form.nominal === 0 ? "" : form.nominal}
              disabled={saving || !selectedPph4}
              onChange={(event) =>
                handleChange(
                  "nominal",
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
              placeholder="Masukkan nominal pembayaran"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Maksimal pembayaran: {formatRupiah(sisaPph4)}
            </p>
          </div>

          {/* KETERANGAN */}

          <div className="md:col-span-2">
            <label
              htmlFor="keterangan"
              className="mb-1 block text-sm font-medium"
            >
              Keterangan Pembayaran
            </label>

            <textarea
              id="keterangan"
              rows={3}
              value={form.keterangan}
              disabled={saving}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
              placeholder="Masukkan keterangan pembayaran PPh4"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* INFORMASI PPH4 */}

        {selectedPph4 ? (
          <div className="mt-5 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 font-semibold">Informasi Kewajiban PPh4</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="ID PPh4" value={`#${selectedPph4.id}`} />

              <InfoItem
                label="Vendor"
                value={
                  selectedPph4.vendor?.nama_vendor ??
                  `Vendor #${selectedPph4.id_vendor}`
                }
              />

              <InfoItem
                label="Tanggal Transaksi"
                value={formatTanggal(selectedPph4.tanggal_transaksi)}
              />

              <InfoItem label="Jenis Objek" value={selectedPph4.jenis_objek} />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(selectedPph4.nilai_transaksi)}
              />

              <InfoItem
                label="Tarif PPh4"
                value={`${formatNumber(selectedPph4.tarif_pph4)}%`}
              />

              <InfoItem
                label="PPh4 Terutang"
                value={formatRupiah(selectedPph4.pph4_terutang)}
              />

              <InfoItem
                label="Total Sudah Dibayar"
                value={formatRupiah(selectedPph4.total_pembayaran)}
              />

              <InfoItem
                label="Sisa Kewajiban"
                value={formatRupiah(selectedPph4.sisa)}
              />
            </div>
          </div>
        ) : null}

        {/* INFORMASI JURNAL */}

        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-gray-800">
            Rencana Jurnal Pembayaran PPh4
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <p>
              <strong>Debit:</strong> {PPH4_HUTANG_COA_LABEL}
            </p>

            <p>
              <strong>Kredit:</strong>{" "}
              {selectedCoaKas
                ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
                : "COA Kas/Bank DETAIL yang dipilih"}
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-600">
            COA hutang ditentukan oleh backend. Form tidak mengirim
            id_coa_hutang. COA 2265 Beban Pajak PPh4 bukan akun pelunasan hutang
            dan COA 3 - 11100 Kas merupakan HEADER.
          </p>
        </div>

        {/* RINGKASAN PEMBAYARAN */}

        <div className="mt-4 rounded-lg border p-4">
          <h3 className="font-semibold">Ringkasan Pembayaran</h3>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem
              label="Nominal yang Dibayar"
              value={formatRupiah(form.nominal)}
            />

            <InfoItem
              label="Sisa Sebelum Pembayaran"
              value={formatRupiah(sisaPph4)}
            />
          </div>
        </div>

        {/* BUTTON */}

        <div className="mt-6 flex flex-wrap gap-3">
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
              saving || pph4List.length === 0 || coaKasList.length === 0
            }
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Pembayaran PPh4"}
          </Button>
        </div>
      </Card>
    </div>
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

      <p className="mt-1 break-words text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PPH4
 * ============================================================ */

function normalizePph4List(value: unknown[]): Pph4[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): Pph4 => ({
        id: Number(item.id),
        id_vendor: Number(item.id_vendor),
        jenis_objek: String(item.jenis_objek ?? ""),
        nilai_transaksi: Number(item.nilai_transaksi ?? 0),
        tarif_pph4: Number(item.tarif_pph4 ?? 0),
        pph4_terutang: Number(item.pph4_terutang ?? 0),
        tanggal_transaksi: String(item.tanggal_transaksi ?? ""),
        vendor: normalizeVendor(item.vendors ?? item.vendor),
      }),
    )
    .filter(
      (item: Pph4): boolean =>
        Number.isSafeInteger(item.id) &&
        item.id > 0 &&
        Number.isSafeInteger(item.id_vendor) &&
        item.id_vendor > 0 &&
        item.jenis_objek.trim().length > 0 &&
        isValidDateOnly(item.tanggal_transaksi) &&
        Number.isFinite(item.nilai_transaksi) &&
        Number.isFinite(item.tarif_pph4) &&
        Number.isFinite(item.pph4_terutang) &&
        item.pph4_terutang > 0,
    );
}

/* ============================================================
 * NORMALIZE VENDOR
 * ============================================================ */

function normalizeVendor(value: unknown): VendorInfo | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item = value as Record<string, unknown>;

  const id = Number(item.id);
  const namaVendor = String(item.nama_vendor ?? "");

  if (!Number.isSafeInteger(id) || id <= 0 || !namaVendor.trim()) {
    return null;
  }

  return {
    id,
    kode_vendor:
      item.kode_vendor === null || item.kode_vendor === undefined
        ? null
        : String(item.kode_vendor),
    nama_vendor: namaVendor,
    npwp:
      item.npwp === null || item.npwp === undefined ? null : String(item.npwp),
  };
}

/* ============================================================
 * NORMALIZE PEMBAYARAN
 * ============================================================ */

function normalizePembayaranList(value: unknown): PembayaranPph4Row[] {
  const rows: unknown[] = Array.isArray(value)
    ? value
    : getArrayFromResponse(value);

  return rows
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPph4Row => ({
        id: Number(item.id),
        id_pph4: Number(item.id_pph4),
        nominal: Number(item.nominal),
      }),
    )
    .filter(
      (item: PembayaranPph4Row): boolean =>
        Number.isSafeInteger(item.id) &&
        item.id > 0 &&
        Number.isSafeInteger(item.id_pph4) &&
        item.id_pph4 > 0 &&
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
        aktif: item.aktif === true,
        is_cash: item.is_cash === true,
        is_header: item.is_header === true,
      }),
    )
    .filter(
      (item: CoaKas): boolean =>
        Number.isSafeInteger(item.id_coa) &&
        item.id_coa > 0 &&
        item.kode.trim().length > 0 &&
        item.nama.trim().length > 0 &&
        item.aktif &&
        item.is_cash &&
        !item.is_header &&
        item.id_coa !== COA_KAS_HEADER_ID,
    )
    .sort((a: CoaKas, b: CoaKas): number =>
      a.kode.localeCompare(b.kode, "id", {
        numeric: true,
      }),
    );
}

/* ============================================================
 * STATUS PPH4
 * ============================================================ */

function getPph4Status(sisa: number, totalPembayaran: number): Pph4Status {
  if (sisa <= 0) {
    return "PAID";
  }

  if (totalPembayaran > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: Pph4Status): string {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "PARTIAL") {
    return "Sebagian";
  }

  return "Belum Dibayar";
}

/* ============================================================
 * DATE HELPERS
 * ============================================================ */

function getLocalDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

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
  const amount = Number.isFinite(value) ? value : 0;

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        responseText.slice(0, 200),
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
