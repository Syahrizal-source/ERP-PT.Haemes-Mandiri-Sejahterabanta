"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { ArrowLeft, Loader2, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type Pph23Status = "UNPAID" | "PARTIAL" | "PAID";

interface VendorInfo {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
}

interface Pph23 {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
  id_periode: number | null;

  vendor: VendorInfo | null;

  terbayar: number;
  sisa: number;
  status: Pph23Status;
}

interface PembayaranPph23 {
  id: number;
  tanggal: string;
  id_pph23: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
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
  id_pph23: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/*
 * ============================================================
 * COA HUTANG PPh23
 * ============================================================
 *
 * Mapping:
 *
 * PAJAK_PPH23 / HUTANG
 *        ↓
 * ID 55
 * KODE 21303
 * Hutang Pajak PPh 23
 *
 * COA ini TIDAK dipilih dari frontend.
 * Backend yang menentukan berdasarkan coa_mapping.
 */
const PPH23_HUTANG_COA_ID = 55;

const PPH23_HUTANG_COA_LABEL = "55 - 21303 Hutang Pajak PPh 23";

/*
 * COA 3:
 *
 * 11100 Kas
 *
 * HEADER.
 *
 * Tidak boleh menjadi jurnal_detail.
 */
const COA_KAS_HEADER_ID = 3;

/*
 * Endpoint database/API yang sudah dibuat.
 */
const PPH23_ENDPOINT = "/api/pph23";

const PAYMENT_ENDPOINT = "/api/pembayaran-pph23";

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const params = useParams<{ id: string }>();

  const router = useRouter();

  const id: string = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PembayaranPph23 | null>(null);

  const [pph23List, setPph23List] = useState<Pph23[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_pph23: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingPph23, setLoadingPph23] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED PPh23
   * ========================================================== */

  const selectedPph23: Pph23 | undefined = pph23List.find(
    (item: Pph23): boolean => item.id === form.id_pph23,
  );

  /* ==========================================================
   * SELECTED COA KAS
   * ========================================================== */

  const selectedCoaKas: CoaKas | undefined = coaKasList.find(
    (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
  );

  /*
   * Saat edit:
   *
   * sisa API masih memperhitungkan pembayaran
   * yang sedang diedit.
   *
   * Maka pembayaran lama dikembalikan
   * ke batas maksimal.
   */
  const maxPayment: number = selectedPph23
    ? Math.max(selectedPph23.sisa + form.nominal, 0)
    : 0;

  const nominal: number = Number.isFinite(form.nominal)
    ? Math.max(form.nominal, 0)
    : 0;

  /* ==========================================================
   * LOAD PEMBAYARAN BY ID
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPayment(): Promise<void> {
      if (!id) {
        await Swal.fire(
          "ID Tidak Valid",
          "ID pembayaran PPh23 tidak ditemukan.",
          "warning",
        );

        router.back();

        return;
      }

      try {
        setLoading(true);

        /*
         * PENTING:
         *
         * URL API berbeda dengan URL PAGE.
         *
         * PAGE:
         * /pajak/pembayaran-pph23/1
         *
         * API:
         * /api/pembayaran-pph23/1
         */
        const response = await fetch(
          `${PAYMENT_ENDPOINT}/${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil data pembayaran PPh23."),
          );
        }

        const payment = normalizePembayaranPph23(result);

        if (!active) {
          return;
        }

        setData(payment);

        setForm({
          tanggal: payment.tanggal,
          id_pph23: payment.id_pph23,
          id_coa_kas: payment.id_coa_kas,
          nominal: payment.nominal,
          keterangan: payment.keterangan,
        });
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PAYMENT PPH23 ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(
            error,
            "Gagal mengambil data pembayaran PPh23.",
          ),
          "error",
        );

        router.back();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      active = false;
    };
  }, [id, router]);

  /* ==========================================================
   * LOAD PPh23
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph23(): Promise<void> {
      try {
        setLoadingPph23(true);

        const response = await fetch(PPH23_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar PPh23."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format daftar PPh23 tidak valid.");
        }

        const normalized = normalizePph23List(result);

        if (!active) {
          return;
        }

        setPph23List(normalized);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPH23 ERROR:", error);

        setPph23List([]);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil daftar PPh23."),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPph23(false);
        }
      }
    }

    void loadPph23();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
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
            getErrorMessage(result, "Gagal mengambil daftar COA."),
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
   * CHANGE
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
   * VALIDATE
   * ========================================================== */

  function validateForm(): string | null {
    if (!data) {
      return "Data pembayaran PPh23 tidak ditemukan.";
    }

    /*
     * POSTED LOCK
     *
     * Jika id_jurnal sudah ada,
     * jangan mengubah pembayaran.
     */
    if (data.id_jurnal !== null) {
      return (
        "Pembayaran PPh23 ini sudah memiliki " +
        "jurnal POSTED dan tidak dapat diedit langsung."
      );
    }

    if (!form.tanggal) {
      return "Tanggal pembayaran PPh23 wajib diisi.";
    }

    if (form.id_pph23 <= 0) {
      return "Pilih PPh23 terlebih dahulu.";
    }

    if (!selectedPph23) {
      return "Data PPh23 tidak tersedia.";
    }

    if (
      !Number.isFinite(selectedPph23.pph23_terutang) ||
      selectedPph23.pph23_terutang <= 0
    ) {
      return "Nilai PPh23 terutang tidak valid.";
    }

    if (form.id_coa_kas <= 0) {
      return "Pilih kas/bank pembayaran.";
    }

    if (!selectedCoaKas) {
      return "COA kas/bank tidak tersedia.";
    }

    if (!selectedCoaKas.aktif) {
      return "COA kas/bank tidak aktif.";
    }

    if (!selectedCoaKas.is_cash) {
      return "COA yang dipilih bukan akun kas/bank.";
    }

    if (selectedCoaKas.is_header) {
      return "COA kas/bank harus berupa COA DETAIL, " + "bukan HEADER.";
    }

    /*
     * Guard COA 3.
     *
     * 3 = 11100 Kas
     * HEADER
     */
    if (selectedCoaKas.id_coa === COA_KAS_HEADER_ID) {
      return (
        "COA 3 - 11100 Kas adalah COA HEADER. " + "Gunakan COA kas/bank DETAIL."
      );
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran PPh23 harus " + "lebih besar dari 0.";
    }

    /*
     * Batas nominal ketika edit:
     *
     * sisa sekarang + nominal lama.
     */
    if (Number.isFinite(maxPayment) && form.nominal > maxPayment + 0.01) {
      return (
        "Nominal melebihi sisa PPh23. " +
        `Maksimal pembayaran setelah koreksi: ` +
        `${formatRupiah(maxPayment)}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      await Swal.fire("Data Tidak Dapat Disimpan", validationError, "warning");

      return;
    }

    try {
      setSaving(true);

      /*
       * PAYLOAD SESUAI DATABASE + VALIDATOR
       *
       * Tidak mengirim:
       *
       * - id_coa_hutang
       * - id_coa_hutang_pph23
       * - pph23
       * - total
       *
       * COA hutang ditentukan backend:
       *
       * PAJAK_PPH23 / HUTANG
       *       ↓
       * 55 - 21303 Hutang Pajak PPh 23
       */
      const payload = {
        tanggal: form.tanggal,
        id_pph23: form.id_pph23,
        id_coa_kas: form.id_coa_kas,
        nominal: form.nominal,
        keterangan: form.keterangan.trim(),
      };

      /*
       * PUT:
       *
       * /api/pembayaran-pph23/[id]
       */
      const response = await fetch(
        `${PAYMENT_ENDPOINT}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal mengubah pembayaran PPh23."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(result, "Pembayaran PPh23 berhasil diubah."),
        "success",
      );

      /*
       * Kembali ke list.
       */
      router.push("/pajak/pembayaran-pph23");

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PEMBAYARAN PPH23 ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal mengubah pembayaran PPh23."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPh23">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />

            <span>Memuat data pembayaran PPh23...</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * NOT FOUND
   * ========================================================== */

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPh23">
          <div className="py-8 text-center">
            <p className="text-sm">Data pembayaran PPh23 tidak ditemukan.</p>

            <div className="mt-6">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/pajak/pembayaran-pph23")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * POSTED LOCK
   * ========================================================== */

  if (data.id_jurnal !== null) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPh23">
          <div className="rounded border p-4 text-sm">
            <p className="font-semibold">Pembayaran PPh23 sudah diposting.</p>

            <p className="mt-2">
              Pembayaran ini sudah terhubung dengan jurnal:
            </p>

            <p className="mt-1 font-semibold">ID Jurnal: {data.id_jurnal}</p>

            <div className="mt-4 rounded border p-3">
              <p>
                <strong>Debit:</strong> {PPH23_HUTANG_COA_LABEL}
              </p>

              <p className="mt-1">
                <strong>Kredit:</strong> COA Kas / Bank DETAIL
              </p>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Jurnal yang sudah posted tidak diedit langsung agar data
              pembayaran dan jurnal tetap konsisten.
            </p>
          </div>

          <div className="mt-6">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * FORM
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Edit Pembayaran PPh23">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
              TANGGAL
              ================================================== */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* ==================================================
              PPH23
              ================================================== */}

          <div>
            <label className="text-sm">PPh23</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph23}
              disabled={loadingPph23 || saving}
              onChange={(event) =>
                handleChange("id_pph23", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingPph23 ? "Memuat PPh23..." : "Pilih PPh23"}
              </option>

              {pph23List.map((item: Pph23) => {
                const isCurrent: boolean = item.id === data.id_pph23;

                /*
                 * PPh23 yang sedang diedit
                 * tetap boleh dipilih meskipun
                 * sisa saat ini 0.
                 */
                const canSelect: boolean = isCurrent || item.sisa > 0;

                return (
                  <option key={item.id} value={item.id} disabled={!canSelect}>
                    PPh23 #{item.id}
                    {" | "}
                    {formatTanggal(item.tanggal_transaksi)}
                    {" | "}
                    {item.jenis_jasa}
                    {" | Terutang: "}
                    {formatRupiah(item.pph23_terutang)}
                    {" | Sisa: "}
                    {formatRupiah(item.sisa)}
                    {" | "}
                    {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              PPh23 yang sedang diedit tetap dapat dipilih walaupun sebelumnya
              sudah Lunas karena pembayaran ini sedang dikoreksi.
            </p>
          </div>

          {/* ==================================================
              KAS / BANK
              ================================================== */}

          <div>
            <label className="text-sm">Kas / Bank Pembayaran</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_coa_kas}
              disabled={loadingCoa || saving}
              onChange={(event) =>
                handleChange("id_coa_kas", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingCoa ? "Memuat COA kas/bank..." : "Pilih kas/bank"}
              </option>

              {coaKasList.map((coa: CoaKas) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya COA kas/bank DETAIL yang aktif. COA 3 - 11100 Kas adalah
              HEADER dan tidak boleh digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPh23"
            type="number"
            min={0}
            value={form.nominal}
            disabled={saving}
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
            INFORMASI PPH23
            ==================================================== */}

        {selectedPph23 ? (
          <div className="mt-6 rounded border p-4 text-sm">
            <p className="font-semibold">Informasi PPh23</p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem
                label="Vendor"
                value={
                  selectedPph23.vendor
                    ? selectedPph23.vendor.nama_vendor
                    : `Vendor #${selectedPph23.id_vendor}`
                }
              />

              <InfoItem
                label="Jenis Jasa"
                value={selectedPph23.jenis_jasa || "-"}
              />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(selectedPph23.nilai_transaksi)}
              />

              <InfoItem
                label="Tarif PPh23"
                value={formatPercent(selectedPph23.tarif_pph23)}
              />

              <InfoItem
                label="PPh23 Terutang"
                value={formatRupiah(selectedPph23.pph23_terutang)}
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(selectedPph23.terbayar)}
              />

              <InfoItem
                label="Sisa Saat Ini"
                value={formatRupiah(selectedPph23.sisa)}
              />

              <InfoItem
                label="Maksimal Setelah Koreksi"
                value={formatRupiah(maxPayment)}
              />

              <InfoItem
                label="Status"
                value={getStatusLabel(selectedPph23.status)}
              />
            </div>

            {selectedPph23.vendor ? (
              <div className="mt-4 rounded border p-3">
                <p className="font-medium">Informasi Vendor</p>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <InfoItem
                    label="Kode Vendor"
                    value={selectedPph23.vendor.kode_vendor ?? "-"}
                  />

                  <InfoItem
                    label="Nama Vendor"
                    value={selectedPph23.vendor.nama_vendor}
                  />

                  <InfoItem
                    label="NPWP"
                    value={selectedPph23.vendor.npwp ?? "-"}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Jurnal Pembayaran PPh23</p>

          <p className="mt-2">
            <strong>Debit:</strong> {PPH23_HUTANG_COA_LABEL}
          </p>

          <p className="mt-1">
            <strong>Kredit:</strong>{" "}
            {selectedCoaKas
              ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
              : "COA Kas / Bank DETAIL"}
          </p>

          <div className="mt-3 rounded border p-3 text-xs">
            <p>
              <strong>Nominal:</strong> {formatRupiah(nominal)}
            </p>

            <p className="mt-1">
              <strong>Modul:</strong> PAJAK_PPH23
            </p>

            <p className="mt-1">
              <strong>Sumber:</strong> PAJAK_PPH23
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh23 tidak dapat diubah dari frontend. Backend tetap
            menggunakan mapping PAJAK_PPH23 / HUTANG yaitu COA 55 - 21303 Hutang
            Pajak PPh 23.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            COA 2264 - 62002 Beban Pajak PPh23 bukan COA pembayaran. COA 1213 -
            21308 Hutang PPh23 Proyek juga tidak digunakan untuk PPh23 umum.
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
            disabled={saving || loadingPph23 || loadingCoa}
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PAYMENT
 * ============================================================ */

function normalizePembayaranPph23(value: unknown): PembayaranPph23 {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format pembayaran PPh23 tidak valid.");
  }

  const item = value as Record<string, unknown>;

  const id: number = Number(item.id);

  const idPph23: number = Number(item.id_pph23);

  const nominal: number = Number(item.nominal);

  const idCoaKas: number = Number(item.id_coa_kas);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID pembayaran PPh23 tidak valid.");
  }

  if (!Number.isInteger(idPph23) || idPph23 <= 0) {
    throw new Error("ID PPh23 tidak valid.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh23 tidak valid.");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank tidak valid.");
  }

  return {
    id,
    tanggal: String(item.tanggal ?? ""),
    id_pph23: idPph23,
    nominal,
    keterangan: String(item.keterangan ?? ""),
    id_coa_kas: idCoaKas,
    id_jurnal:
      item.id_jurnal === null || item.id_jurnal === undefined
        ? null
        : Number(item.id_jurnal),
    created_at: String(item.created_at ?? ""),
  };
}

/* ============================================================
 * NORMALIZE PPH23
 * ============================================================ */

function normalizePph23List(value: unknown[]): Pph23[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item: Record<string, unknown>): Pph23 => {
      const pph23Terutang: number = Number(item.pph23_terutang ?? 0);

      const terbayar: number = Number(
        item.terbayar ?? item.total_pembayaran ?? 0,
      );

      const calculatedSisa: number = Math.max(pph23Terutang - terbayar, 0);

      const apiSisa: number = Number(item.sisa ?? calculatedSisa);

      const safePph23Terutang = Number.isFinite(pph23Terutang)
        ? Math.max(pph23Terutang, 0)
        : 0;

      const safeTerbayar = Number.isFinite(terbayar)
        ? Math.max(terbayar, 0)
        : 0;

      const safeApiSisa = Number.isFinite(apiSisa)
        ? Math.max(apiSisa, 0)
        : calculatedSisa;

      const sisa: number = Math.min(safeApiSisa, safePph23Terutang);

      return {
        id: Number(item.id),

        id_vendor: Number(item.id_vendor ?? 0),

        jenis_jasa: String(item.jenis_jasa ?? ""),

        nilai_transaksi: Number(item.nilai_transaksi ?? 0),

        tarif_pph23: Number(item.tarif_pph23 ?? 0),

        pph23_terutang: safePph23Terutang,

        tanggal_transaksi: String(item.tanggal_transaksi ?? item.tanggal ?? ""),

        id_periode:
          item.id_periode === null || item.id_periode === undefined
            ? null
            : Number(item.id_periode),

        vendor: normalizeVendor(item.vendor ?? item.vendors),

        terbayar: safeTerbayar,

        sisa,

        status: normalizeStatus(item.status, sisa),
      };
    })
    .filter(
      (item: Pph23): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_vendor) &&
        item.id_vendor > 0 &&
        item.tanggal_transaksi.length > 0 &&
        item.pph23_terutang > 0,
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

  const id: number = Number(item.id ?? 0);

  const namaVendor: string = String(item.nama_vendor ?? "").trim();

  if (!Number.isInteger(id) || id <= 0 || !namaVendor) {
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

function normalizeStatus(value: unknown, sisa: number): Pph23Status {
  if (value === "PAID" || sisa <= 0) {
    return "PAID";
  }

  if (value === "PARTIAL") {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: Pph23Status): string {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "PARTIAL") {
    return "Sebagian";
  }

  return "Belum Dibayar";
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
 * FORMAT PERCENT
 * ============================================================ */

function formatPercent(value: number): string {
  const amount: number = Number.isFinite(value) ? value : 0;

  return `${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(0, 200)}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR
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
 * SUCCESS
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
