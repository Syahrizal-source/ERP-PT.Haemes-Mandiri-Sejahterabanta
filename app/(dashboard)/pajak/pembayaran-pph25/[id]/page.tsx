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

type Pph25Status = "UNPAID" | "PARTIAL" | "PAID";

interface Pph25 {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  keterangan: string | null;
  id_jurnal: number | null;
  created_at: string;

  terbayar: number;
  sisa: number;
  status: Pph25Status;
}

interface PembayaranPph25 {
  id: number;
  tanggal: string;
  id_pph25: number;
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
  id_pph25: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/**
 * ============================================================
 * COA HUTANG PPh25
 * ============================================================
 *
 * Mapping:
 *
 * PAJAK_PPH25 / HUTANG
 *        ↓
 * ID 2508
 * KODE 21305
 * Hutang Pajak PPh25
 *
 * COA ini TIDAK dipilih dari frontend.
 * Backend/helper menentukan berdasarkan coa_mapping.
 */
const PPH25_HUTANG_COA_ID = 2508;

const PPH25_HUTANG_COA_LABEL = "2508 - 21305 Hutang Pajak PPh25";

/**
 * ============================================================
 * COA BEBAN PPh25
 * ============================================================
 *
 * 2507 - 62005 Beban Pajak PPh25
 *
 * BUKAN COA pembayaran.
 */
const PPH25_BEBAN_COA_ID = 2507;

const PPH25_BEBAN_COA_LABEL = "2507 - 62005 Beban Pajak PPh25";

/**
 * ============================================================
 * COA KAS HEADER
 * ============================================================
 *
 * 3 - 11100 Kas
 *
 * Adalah HEADER.
 *
 * Tidak boleh digunakan sebagai
 * jurnal_detail pembayaran.
 */
const COA_KAS_HEADER_ID = 3;

const COA_KAS_HEADER_LABEL = "3 - 11100 Kas";

/* ============================================================
 * ENDPOINT
 * ============================================================ */

const PPH25_ENDPOINT = "/api/pph25";

const PAYMENT_ENDPOINT = "/api/pembayaran-pph25";

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const params = useParams<{ id: string }>();

  const router = useRouter();

  const id: string = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PembayaranPph25 | null>(null);

  const [pph25List, setPph25List] = useState<Pph25[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_pph25: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingPph25, setLoadingPph25] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED PPh25
   * ========================================================== */

  const selectedPph25: Pph25 | undefined = pph25List.find(
    (item: Pph25): boolean => item.id === form.id_pph25,
  );

  /* ==========================================================
   * SELECTED COA KAS
   * ========================================================== */

  const selectedCoaKas: CoaKas | undefined = coaKasList.find(
    (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
  );

  /*
   * ==========================================================
   * BATAS NOMINAL EDIT
   * ==========================================================
   *
   * Jika masih menggunakan PPh25 yang sama:
   *
   * sisa sekarang + nominal lama
   *
   * Karena sisa API masih memasukkan pembayaran
   * yang sedang diedit.
   *
   * Jika user mengganti ke PPh25 lain:
   *
   * hanya sisa PPh25 tujuan yang menjadi batas.
   *
   * Ini mencegah nominal pembayaran lama
   * "terbawa" ke PPh25 lain.
   */

  const maxPayment: number = selectedPph25
    ? Math.max(
        selectedPph25.sisa +
          (selectedPph25.id === data?.id_pph25 ? data.nominal : 0),
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
          "ID pembayaran PPh25 tidak ditemukan.",
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
         * /pajak/pembayaran-pph25/1
         *
         * URL API:
         *
         * /api/pembayaran-pph25/1
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
            getErrorMessage(result, "Gagal mengambil data pembayaran PPh25."),
          );
        }

        const payment = normalizePembayaranPph25(result);

        if (!active) {
          return;
        }

        setData(payment);

        setForm({
          tanggal: payment.tanggal,
          id_pph25: payment.id_pph25,
          id_coa_kas: payment.id_coa_kas,
          nominal: payment.nominal,
          keterangan: payment.keterangan,
        });
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PAYMENT PPH25 ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(
            error,
            "Gagal mengambil data pembayaran PPh25.",
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
   * LOAD PPh25
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph25(): Promise<void> {
      try {
        setLoadingPph25(true);

        const response = await fetch(PPH25_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar PPh25."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format daftar PPh25 tidak valid.");
        }

        const normalized = normalizePph25List(result);

        if (!active) {
          return;
        }

        setPph25List(normalized);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPH25 ERROR:", error);

        setPph25List([]);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil daftar PPh25."),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPph25(false);
        }
      }
    }

    void loadPph25();

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
      return "Data pembayaran PPh25 tidak ditemukan.";
    }

    /*
     * ========================================================
     * POSTED LOCK
     * ========================================================
     *
     * Jika pembayaran sudah mempunyai jurnal,
     * jangan mengubah data pembayaran.
     *
     * Hal ini menjaga konsistensi:
     *
     * pembayaran_pph25
     *       ↕
     * jurnal
     *       ↕
     * jurnal_detail
     */

    if (data.id_jurnal !== null) {
      return (
        "Pembayaran PPh25 ini sudah memiliki " +
        "jurnal POSTED dan tidak dapat diedit langsung."
      );
    }

    if (!form.tanggal) {
      return "Tanggal pembayaran PPh25 wajib diisi.";
    }

    if (form.id_pph25 <= 0) {
      return "Pilih PPh25 terlebih dahulu.";
    }

    if (!selectedPph25) {
      return "Data PPh25 tidak tersedia.";
    }

    /*
     * PPh25 menggunakan nilai_angsuran,
     * bukan pph25_terutang.
     */

    if (
      !Number.isFinite(selectedPph25.nilai_angsuran) ||
      selectedPph25.nilai_angsuran <= 0
    ) {
      return "Nilai angsuran PPh25 tidak valid.";
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
        `${COA_KAS_HEADER_LABEL} adalah COA HEADER. ` +
        "Gunakan COA kas/bank DETAIL."
      );
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran PPh25 harus " + "lebih besar dari 0.";
    }

    /*
     * Batas nominal edit:
     *
     * PPh25 yang sama:
     * sisa + nominal lama
     *
     * PPh25 berbeda:
     * sisa PPh25 tujuan saja.
     */

    if (Number.isFinite(maxPayment) && form.nominal > maxPayment + 0.01) {
      return (
        "Nominal melebihi sisa PPh25. " +
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
       * PAYLOAD SESUAI DATABASE + VALIDATOR
       * ======================================================
       *
       * public.pembayaran_pph25:
       *
       * - tanggal
       * - id_pph25
       * - nominal
       * - keterangan
       * - id_coa_kas
       *
       * TIDAK mengirim:
       *
       * - id_coa_hutang
       * - id_coa_beban
       * - total
       * - sisa
       *
       * COA hutang ditentukan backend/helper.
       *
       * PAJAK_PPH25 / HUTANG
       *       ↓
       * 2508 - 21305 Hutang Pajak PPh25
       */

      const payload = {
        tanggal: form.tanggal,

        id_pph25: form.id_pph25,

        id_coa_kas: form.id_coa_kas,

        nominal: form.nominal,

        keterangan: form.keterangan.trim(),
      };

      /*
       * PUT:
       *
       * /api/pembayaran-pph25/[id]
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
          getErrorMessage(result, "Gagal mengubah pembayaran PPh25."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(result, "Pembayaran PPh25 berhasil diubah."),
        "success",
      );

      router.push("/pajak/pembayaran-pph25");

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PEMBAYARAN PPH25 ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal mengubah pembayaran PPh25."),
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
        <Card title="Edit Pembayaran PPh25">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />

            <span>Memuat data pembayaran PPh25...</span>
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
        <Card title="Edit Pembayaran PPh25">
          <div className="py-8 text-center">
            <p className="text-sm">Data pembayaran PPh25 tidak ditemukan.</p>

            <div className="mt-6">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/pajak/pembayaran-pph25")}
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
        <Card title="Edit Pembayaran PPh25">
          <div className="rounded border p-4 text-sm">
            <p className="font-semibold">Pembayaran PPh25 sudah diposting.</p>

            <p className="mt-2">
              Pembayaran ini sudah terhubung dengan jurnal:
            </p>

            <p className="mt-1 font-semibold">ID Jurnal: {data.id_jurnal}</p>

            <div className="mt-4 rounded border p-3">
              <p>
                <strong>Debit:</strong> {PPH25_HUTANG_COA_LABEL}
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
      <Card title="Edit Pembayaran PPh25">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
              TANGGAL
              ================================================== */}

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* ==================================================
              PPH25
              ================================================== */}

          <div>
            <label className="text-sm">PPh25</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph25}
              disabled={loadingPph25 || saving}
              onChange={(event) =>
                handleChange("id_pph25", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingPph25 ? "Memuat PPh25..." : "Pilih PPh25"}
              </option>

              {pph25List.map((item: Pph25) => {
                const isCurrent: boolean = item.id === data.id_pph25;

                /*
                 * PPh25 yang sedang diedit
                 * tetap boleh dipilih walaupun
                 * sisa saat ini 0.
                 *
                 * PPh25 lain hanya boleh dipilih
                 * jika masih memiliki sisa.
                 */

                const canSelect: boolean = isCurrent || item.sisa > 0;

                return (
                  <option key={item.id} value={item.id} disabled={!canSelect}>
                    PPh25 #{item.id}
                    {" | "}
                    {formatBulanTahun(item.bulan, item.tahun)}
                    {" | Angsuran: "}
                    {formatRupiah(item.nilai_angsuran)}
                    {" | Sisa: "}
                    {formatRupiah(item.sisa)}
                    {" | "}
                    {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              PPh25 yang sedang diedit tetap dapat dipilih walaupun sebelumnya
              sudah lunas karena pembayaran ini sedang dikoreksi.
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
              Hanya COA kas/bank DETAIL yang aktif. {COA_KAS_HEADER_LABEL}{" "}
              adalah HEADER dan tidak boleh digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPh25"
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
            INFORMASI PPH25
            ==================================================== */}

        {selectedPph25 ? (
          <div className="mt-6 rounded border p-4 text-sm">
            <p className="font-semibold">Informasi PPh25</p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem label="ID PPh25" value={`#${selectedPph25.id}`} />

              <InfoItem
                label="Periode"
                value={formatBulanTahun(
                  selectedPph25.bulan,
                  selectedPph25.tahun,
                )}
              />

              <InfoItem
                label="Tanggal Transaksi"
                value={formatTanggal(selectedPph25.tanggal_transaksi)}
              />

              <InfoItem
                label="Nilai Angsuran"
                value={formatRupiah(selectedPph25.nilai_angsuran)}
              />

              <InfoItem
                label="Tanggal Setor"
                value={
                  selectedPph25.tanggal_setor
                    ? formatTanggal(selectedPph25.tanggal_setor)
                    : "-"
                }
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(selectedPph25.terbayar)}
              />

              <InfoItem
                label="Sisa Saat Ini"
                value={formatRupiah(selectedPph25.sisa)}
              />

              <InfoItem
                label="Maksimal Setelah Koreksi"
                value={formatRupiah(maxPayment)}
              />

              <InfoItem
                label="Status"
                value={getStatusLabel(selectedPph25.status)}
              />
            </div>

            <div className="mt-4 rounded border p-3">
              <p className="text-xs text-gray-500">Keterangan PPh25</p>

              <p className="mt-1 font-medium">
                {selectedPph25.keterangan ?? "-"}
              </p>
            </div>
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI PEMBAYARAN
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Informasi Pembayaran</p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoItem
              label="Nominal Saat Ini"
              value={formatRupiah(data.nominal)}
            />

            <InfoItem label="Nominal Perubahan" value={formatRupiah(nominal)} />

            <InfoItem
              label="Maksimal Pembayaran"
              value={formatRupiah(maxPayment)}
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Jurnal Pembayaran PPh25</p>

          <p className="mt-2">
            <strong>Debit:</strong> {PPH25_HUTANG_COA_LABEL}
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
              <strong>Modul:</strong> PAJAK_PPH25
            </p>

            <p className="mt-1">
              <strong>Sumber:</strong> PAJAK_PPH25
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh25 tidak dapat diubah dari frontend. Backend tetap
            menggunakan mapping PAJAK_PPH25 / HUTANG yaitu COA 2508 - 21305
            Hutang Pajak PPh25.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            COA {PPH25_BEBAN_COA_ID} - 62005 Beban Pajak PPh25 bukan COA
            pembayaran.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            COA {COA_KAS_HEADER_ID} - 11100 Kas adalah HEADER dan tidak boleh
            digunakan sebagai COA kredit jurnal.
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
            disabled={saving || loadingPph25 || loadingCoa}
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

function normalizePembayaranPph25(value: unknown): PembayaranPph25 {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format pembayaran PPh25 tidak valid.");
  }

  const item = value as Record<string, unknown>;

  const id: number = Number(item.id);

  const idPph25: number = Number(item.id_pph25);

  const nominal: number = Number(item.nominal);

  const idCoaKas: number = Number(item.id_coa_kas);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID pembayaran PPh25 tidak valid.");
  }

  if (!Number.isInteger(idPph25) || idPph25 <= 0) {
    throw new Error("ID PPh25 tidak valid.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh25 tidak valid.");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank tidak valid.");
  }

  return {
    id,

    tanggal: String(item.tanggal ?? ""),

    id_pph25: idPph25,

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
 * NORMALIZE PPh25
 *
 * Mengikuti struktur public.pph25:
 *
 * id
 * tahun
 * bulan
 * nilai_angsuran
 * tanggal_setor
 * tanggal_transaksi
 * keterangan
 * id_jurnal
 * created_at
 *
 * Data terbayar/sisa/status dapat berasal
 * dari API /api/pph25.
 * ============================================================ */

function normalizePph25List(value: unknown[]): Pph25[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item: Record<string, unknown>): Pph25 => {
      const nilaiAngsuran: number = Number(item.nilai_angsuran ?? 0);

      const terbayarRaw: number = Number(
        item.terbayar ?? item.total_pembayaran ?? 0,
      );

      const calculatedSisa: number = Math.max(nilaiAngsuran - terbayarRaw, 0);

      const apiSisa: number = Number(item.sisa ?? calculatedSisa);

      const safeNilaiAngsuran: number = Number.isFinite(nilaiAngsuran)
        ? Math.max(nilaiAngsuran, 0)
        : 0;

      const safeTerbayar: number = Number.isFinite(terbayarRaw)
        ? Math.max(terbayarRaw, 0)
        : 0;

      const safeApiSisa: number = Number.isFinite(apiSisa)
        ? Math.max(apiSisa, 0)
        : calculatedSisa;

      const sisa: number = Math.min(safeApiSisa, safeNilaiAngsuran);

      return {
        id: Number(item.id),

        tahun: Number(item.tahun ?? 0),

        bulan: Number(item.bulan ?? 0),

        nilai_angsuran: safeNilaiAngsuran,

        tanggal_setor:
          item.tanggal_setor === null || item.tanggal_setor === undefined
            ? null
            : String(item.tanggal_setor),

        tanggal_transaksi: String(item.tanggal_transaksi ?? ""),

        keterangan:
          item.keterangan === null || item.keterangan === undefined
            ? null
            : String(item.keterangan),

        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),

        created_at: String(item.created_at ?? ""),

        terbayar: safeTerbayar,

        sisa,

        status: normalizeStatus(item.status, sisa),
      };
    })
    .filter(
      (item: Pph25): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.tahun) &&
        item.tahun > 0 &&
        Number.isInteger(item.bulan) &&
        item.bulan >= 1 &&
        item.bulan <= 12 &&
        item.nilai_angsuran > 0 &&
        item.tanggal_transaksi.length > 0,
    );
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

function normalizeStatus(value: unknown, sisa: number): Pph25Status {
  if (value === "PAID" || sisa <= 0) {
    return "PAID";
  }

  if (value === "PARTIAL") {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: Pph25Status): string {
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
 * FORMAT BULAN / TAHUN
 * ============================================================ */

function formatBulanTahun(bulan: number, tahun: number): string {
  if (
    !Number.isInteger(bulan) ||
    bulan < 1 ||
    bulan > 12 ||
    !Number.isInteger(tahun) ||
    tahun <= 0
  ) {
    return "-";
  }

  const namaBulan: string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${namaBulan[bulan - 1]} ${tahun}`;
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
