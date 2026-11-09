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

  terbayar: number;
  sisa: number;
  status: Pph21Status;
}

interface PembayaranPph21 {
  id: number;
  tanggal: string;
  id_pph21: number;
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
  id_pph21: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/*
 * ============================================================
 * COA HUTANG PPh21
 * ============================================================
 *
 * Mapping yang sudah ada di database:
 *
 * PAJAK / HUTANG
 *       ↓
 * ID 54
 * KODE 21302
 * Hutang Pajak PPh 21
 *
 * COA ini TIDAK dipilih dari frontend.
 * Backend/helper yang menentukan berdasarkan
 * coa_mapping.
 */

const PPH21_HUTANG_COA_ID = 54;

const PPH21_HUTANG_COA_LABEL = "54 - 21302 Hutang Pajak PPh 21";

/*
 * ============================================================
 * COA BEBAN PPh21
 * ============================================================
 *
 * 2263 - 62001 Beban Pajak PPh21
 *
 * Tidak digunakan saat pembayaran.
 */

const PPH21_BEBAN_COA_ID = 2263;

const PPH21_BEBAN_COA_LABEL = "2263 - 62001 Beban Pajak PPh21";

/*
 * ============================================================
 * COA HUTANG PPh21 PROYEK
 * ============================================================
 *
 * 1212 - 21307 Hutang PPh21 Proyek
 *
 * Khusus proyek.
 * Tidak digunakan untuk pembayaran PPh21 umum.
 */

const PPH21_PROYEK_HUTANG_COA_ID = 1212;

const PPH21_PROYEK_HUTANG_COA_LABEL = "1212 - 21307 Hutang PPh21 Proyek";

/*
 * ============================================================
 * COA KAS HEADER
 * ============================================================
 *
 * 3 - 11100 Kas
 *
 * HEADER.
 *
 * Tidak boleh menjadi jurnal_detail.
 */

const COA_KAS_HEADER_ID = 3;

const COA_KAS_HEADER_LABEL = "3 - 11100 Kas";

/*
 * ============================================================
 * ENDPOINT
 * ============================================================
 */

const PPH21_ENDPOINT = "/api/pph21";

const PAYMENT_ENDPOINT = "/api/pembayaran-pph21";

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const params = useParams<{ id: string }>();

  const router = useRouter();

  const id: string = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PembayaranPph21 | null>(null);

  const [pph21List, setPph21List] = useState<Pph21[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_pph21: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingPph21, setLoadingPph21] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED PPh21
   * ========================================================== */

  const selectedPph21: Pph21 | undefined = pph21List.find(
    (item: Pph21): boolean => item.id === form.id_pph21,
  );

  /* ==========================================================
   * SELECTED COA KAS
   * ========================================================== */

  const selectedCoaKas: CoaKas | undefined = coaKasList.find(
    (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
  );

  /*
   * ==========================================================
   * MAX PAYMENT
   * ==========================================================
   *
   * API list menghitung sisa termasuk pembayaran
   * yang sedang diedit.
   *
   * Contoh:
   *
   * PPh21 terutang = 1.000.000
   * Pembayaran lama = 400.000
   *
   * API sisa = 600.000
   *
   * Saat edit pembayaran yang sama:
   *
   * max = 600.000 + 400.000
   *     = 1.000.000
   *
   * Jadi nominal dapat dikoreksi sampai batas
   * kewajiban sebenarnya.
   */

  const maxPayment: number = selectedPph21
    ? Math.max(
        selectedPph21.sisa +
          (selectedPph21.id === data?.id_pph21 ? data.nominal : 0),
        0,
      )
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
          "ID pembayaran PPh21 tidak ditemukan.",
          "warning",
        );

        router.back();

        return;
      }

      try {
        setLoading(true);

        /*
         * URL PAGE:
         *
         * /pajak/pembayaran-pph21/1
         *
         * API:
         *
         * /api/pembayaran-pph21/1
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
            getErrorMessage(result, "Gagal mengambil data pembayaran PPh21."),
          );
        }

        const payment = normalizePembayaranPph21(result);

        if (!active) {
          return;
        }

        setData(payment);

        setForm({
          tanggal: payment.tanggal,

          id_pph21: payment.id_pph21,

          id_coa_kas: payment.id_coa_kas,

          nominal: payment.nominal,

          keterangan: payment.keterangan,
        });
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PAYMENT PPH21 ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(
            error,
            "Gagal mengambil data pembayaran PPh21.",
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
   * LOAD PPh21
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph21(): Promise<void> {
      try {
        setLoadingPph21(true);

        /*
         * public.pph21
         */

        const response = await fetch(PPH21_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar PPh21."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format daftar PPh21 tidak valid.");
        }

        const normalized = normalizePph21List(result);

        /*
         * Ambil riwayat pembayaran
         * agar status/sisa dapat dihitung
         * berdasarkan pembayaran aktual.
         */

        const paymentResponse = await fetch(PAYMENT_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const paymentResult: unknown = await readJsonSafely(paymentResponse);

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPh21.",
            ),
          );
        }

        const paymentRows: PembayaranPph21[] =
          normalizePaymentSummaryList(paymentResult);

        /*
         * Total pembayaran per PPh21.
         */

        const pembayaranMap = new Map<number, number>();

        for (const payment of paymentRows) {
          const current = pembayaranMap.get(payment.id_pph21) ?? 0;

          pembayaranMap.set(payment.id_pph21, current + payment.nominal);
        }

        const options: Pph21[] = normalized.map((item: Pph21): Pph21 => {
          const terbayar = pembayaranMap.get(item.id) ?? 0;

          const sisa = Math.max(item.nilai_pph21 - terbayar, 0);

          return {
            ...item,

            terbayar,

            sisa,

            status: getPph21Status(sisa, terbayar),
          };
        });

        if (!active) {
          return;
        }

        setPph21List(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPH21 ERROR:", error);

        setPph21List([]);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil daftar PPh21."),
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
   *
   * - aktif
   * - is_cash = true
   * - bukan header
   * - bukan id_coa 3
   *
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
      return "Data pembayaran PPh21 tidak ditemukan.";
    }

    /*
     * ========================================================
     * POSTED LOCK
     * ========================================================
     *
     * Jika id_jurnal sudah ada:
     *
     * pembayaran tidak boleh diedit.
     */

    if (data.id_jurnal !== null) {
      return (
        "Pembayaran PPh21 ini sudah memiliki " +
        "jurnal POSTED dan tidak dapat diedit langsung."
      );
    }

    if (!form.tanggal) {
      return "Tanggal pembayaran PPh21 wajib diisi.";
    }

    if (form.id_pph21 <= 0) {
      return "Pilih PPh21 terlebih dahulu.";
    }

    if (!selectedPph21) {
      return "Data PPh21 tidak tersedia.";
    }

    if (
      !Number.isFinite(selectedPph21.nilai_pph21) ||
      selectedPph21.nilai_pph21 <= 0
    ) {
      return "Nilai PPh21 terutang tidak valid.";
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
     * Guard COA 3:
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
      return "Nominal pembayaran PPh21 harus " + "lebih besar dari 0.";
    }

    /*
     * Batas nominal ketika edit:
     *
     * Untuk PPh21 yang sama:
     *
     * sisa saat ini
     * +
     * nominal pembayaran lama
     *
     * Untuk PPh21 lain:
     *
     * hanya sisa PPh21 tersebut.
     */

    if (Number.isFinite(maxPayment) && form.nominal > maxPayment + 0.01) {
      return (
        "Nominal melebihi sisa PPh21. " +
        "Maksimal pembayaran setelah koreksi: " +
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

    const validationError: string | null = validateForm();

    if (validationError) {
      await Swal.fire("Data Tidak Dapat Disimpan", validationError, "warning");

      return;
    }

    try {
      setSaving(true);

      /*
       * ======================================================
       * PAYLOAD SESUAI DATABASE
       * ======================================================
       *
       * public.pembayaran_pph21:
       *
       * - tanggal
       * - id_pph21
       * - nominal
       * - keterangan
       * - id_coa_kas
       * - id_jurnal
       *
       * Frontend TIDAK mengirim:
       *
       * - id_coa_hutang
       * - id_coa_beban
       * - id_coa_proyek
       *
       * COA hutang ditentukan backend/helper.
       *
       * PAJAK / HUTANG
       *       ↓
       * 54 - 21302 Hutang Pajak PPh 21
       */

      const payload = {
        tanggal: form.tanggal,

        id_pph21: form.id_pph21,

        id_coa_kas: form.id_coa_kas,

        nominal: form.nominal,

        keterangan: form.keterangan.trim(),
      };

      /*
       * PUT:
       *
       * /api/pembayaran-pph21/[id]
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
          getErrorMessage(result, "Gagal mengubah pembayaran PPh21."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(result, "Pembayaran PPh21 berhasil diubah."),
        "success",
      );

      router.push("/pajak/pembayaran-pph21");

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PEMBAYARAN PPH21 ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal mengubah pembayaran PPh21."),
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
        <Card title="Edit Pembayaran PPh21">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />

            <span>Memuat data pembayaran PPh21...</span>
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
        <Card title="Edit Pembayaran PPh21">
          <div className="py-8 text-center">
            <p className="text-sm">Data pembayaran PPh21 tidak ditemukan.</p>

            <div className="mt-6">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/pajak/pembayaran-pph21")}
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
        <Card title="Edit Pembayaran PPh21">
          <div className="rounded border p-4 text-sm">
            <p className="font-semibold">Pembayaran PPh21 sudah diposting.</p>

            <p className="mt-2">
              Pembayaran ini sudah terhubung dengan jurnal:
            </p>

            <p className="mt-1 font-semibold">ID Jurnal: {data.id_jurnal}</p>

            {/* ==================================================
                ACCOUNTING
                ================================================== */}

            <div className="mt-4 rounded border p-3">
              <p>
                <strong>Debit:</strong> {PPH21_HUTANG_COA_LABEL}
              </p>

              <p className="mt-1">
                <strong>Kredit:</strong> COA Kas / Bank DETAIL
              </p>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Jurnal yang sudah posted tidak diedit langsung agar data
              pembayaran dan jurnal tetap konsisten.
            </p>

            {/* ==================================================
                COA GUARD INFORMATION
                ================================================== */}

            <div className="mt-4 rounded border bg-gray-50 p-3">
              <p className="text-xs font-medium">Informasi COA</p>

              <p className="mt-2 text-xs text-gray-500">
                COA {PPH21_BEBAN_COA_ID} - {PPH21_BEBAN_COA_LABEL} tidak
                digunakan sebagai COA pembayaran.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                COA {PPH21_PROYEK_HUTANG_COA_ID} -{" "}
                {PPH21_PROYEK_HUTANG_COA_LABEL} tidak digunakan untuk PPh21
                umum.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                COA {COA_KAS_HEADER_LABEL} adalah HEADER dan tidak dapat
                digunakan sebagai jurnal detail.
              </p>
            </div>
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
      <Card title="Edit Pembayaran PPh21">
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
              PPh21
              ================================================== */}

          <div>
            <label className="text-sm">PPh21</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph21}
              disabled={loadingPph21 || saving}
              onChange={(event) =>
                handleChange("id_pph21", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingPph21 ? "Memuat PPh21..." : "Pilih PPh21"}
              </option>

              {pph21List.map((item: Pph21) => {
                /*
                 * PPh21 yang sedang
                 * diedit tetap boleh
                 * dipilih.
                 *
                 * Walaupun sisa saat
                 * ini 0.
                 */

                const isCurrent: boolean = item.id === data.id_pph21;

                const canSelect: boolean = isCurrent || item.sisa > 0;

                return (
                  <option key={item.id} value={item.id} disabled={!canSelect}>
                    PPh21 #{item.id}
                    {" | "}
                    {item.nama}
                    {" | Payroll #"}
                    {item.id_payroll}
                    {" | "}
                    {formatTanggal(item.tanggal)}
                    {" | Terutang: "}
                    {formatRupiah(item.nilai_pph21)}
                    {" | Sisa: "}
                    {formatRupiah(item.sisa)}
                    {" | "}
                    {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              PPh21 yang sedang diedit tetap dapat dipilih walaupun pembayaran
              sebelumnya membuat statusnya Lunas, karena transaksi ini sedang
              dikoreksi.
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
              Hanya COA kas/bank DETAIL yang aktif. COA {COA_KAS_HEADER_LABEL}{" "}
              adalah HEADER dan tidak boleh digunakan.
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
            INFORMASI PPH21
            ==================================================== */}

        {selectedPph21 ? (
          <div className="mt-6 rounded border p-4 text-sm">
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
                value={formatPercent(selectedPph21.tarif_pph21)}
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
                label="Sisa Saat Ini"
                value={formatRupiah(selectedPph21.sisa)}
              />

              <InfoItem
                label="Maksimal Setelah Koreksi"
                value={formatRupiah(maxPayment)}
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

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Informasi Pembayaran</p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoItem label="ID Pembayaran" value={`#${data.id}`} />

            <InfoItem label="Nominal Lama" value={formatRupiah(data.nominal)} />

            <InfoItem label="Nominal Sekarang" value={formatRupiah(nominal)} />

            <InfoItem
              label="Maksimal Koreksi"
              value={formatRupiah(maxPayment)}
            />

            <InfoItem
              label="COA Kas Lama"
              value={`ID COA ${data.id_coa_kas}`}
            />

            <InfoItem
              label="Jurnal"
              value={
                data.id_jurnal === null
                  ? "Belum diposting"
                  : `#${data.id_jurnal}`
              }
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Jurnal Pembayaran PPh21</p>

          <p className="mt-2">
            <strong>Debit:</strong> {PPH21_HUTANG_COA_LABEL}
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
              <strong>Modul:</strong> PAJAK_PPH21
            </p>

            <p className="mt-1">
              <strong>Sumber:</strong> PAJAK_PPH21
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh21 tidak dapat diubah dari frontend. Backend tetap
            menggunakan mapping yang sudah tersedia untuk menghasilkan COA 54 -
            21302 Hutang Pajak PPh 21.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            COA {PPH21_BEBAN_COA_ID} - {PPH21_BEBAN_COA_LABEL} bukan COA
            pembayaran. COA {PPH21_PROYEK_HUTANG_COA_ID} -{" "}
            {PPH21_PROYEK_HUTANG_COA_LABEL} juga tidak digunakan untuk PPh21
            umum.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            COA {COA_KAS_HEADER_LABEL} tidak boleh digunakan sebagai jurnal
            detail.
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
            disabled={saving || loadingPph21 || loadingCoa}
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
 * NORMALIZE PAYMENT DETAIL
 * ============================================================ */

function normalizePembayaranPph21(value: unknown): PembayaranPph21 {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format pembayaran PPh21 tidak valid.");
  }

  const item = value as Record<string, unknown>;

  const id: number = Number(item.id);

  const idPph21: number = Number(item.id_pph21);

  const nominal: number = Number(item.nominal);

  const idCoaKas: number = Number(item.id_coa_kas);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID pembayaran PPh21 tidak valid.");
  }

  if (!Number.isInteger(idPph21) || idPph21 <= 0) {
    throw new Error("ID PPh21 tidak valid.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh21 tidak valid.");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank tidak valid.");
  }

  return {
    id,

    tanggal: String(item.tanggal ?? ""),

    id_pph21: idPph21,

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
 * NORMALIZE PPH21
 *
 * public.pph21:
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

        terbayar: Number(item.terbayar ?? item.total_pembayaran ?? 0),

        sisa: Number(item.sisa ?? 0),

        status: normalizeStatus(item.status, Number(item.sisa ?? 0)),
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
 * NORMALIZE PAYMENT SUMMARY
 *
 * Hanya menggunakan:
 *
 * id
 * id_pph21
 * nominal
 * ============================================================ */

function normalizePaymentSummaryList(value: unknown): PembayaranPph21[] {
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

        tanggal: String(item.tanggal ?? ""),

        id_pph21: Number(item.id_pph21),

        nominal: Number(item.nominal ?? 0),

        keterangan: String(item.keterangan ?? ""),

        id_coa_kas: Number(item.id_coa_kas ?? 0),

        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),

        created_at: String(item.created_at ?? ""),
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

function normalizeStatus(value: unknown, sisa: number): Pph21Status {
  if (value === "PAID" || sisa <= 0) {
    return "PAID";
  }

  if (value === "PARTIAL") {
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
    const text: string = await response.text();

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
