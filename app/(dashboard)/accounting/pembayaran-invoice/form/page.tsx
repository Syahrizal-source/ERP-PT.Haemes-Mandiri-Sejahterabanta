"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/* ============================================================
 * TYPE
 * ============================================================ */

interface InvoiceOption {
  id: number;
  no_invoice: string;
  customer: string;
  status: string;
  nominal: number;
  nilai_tagihan: number;
  total_dibayar: number;
  sisa_tagihan: number;
}

interface RekeningBankOption {
  id: number;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
  id_coa: number;
}

interface PembayaranInvoiceForm {
  tanggal: string;
  id_invoice: number;
  id_rekening: number;
  nominal: number;
  keterangan: string;
}

interface PembayaranInvoicePayload {
  tanggal: string;
  id_invoice: number;
  id_coa_debit: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * PAGE
 * ============================================================ */

export default function CreatePembayaranInvoicePage(): React.JSX.Element {
  const router = useRouter();

  /* ==========================================================
   * LOADING
   * ========================================================== */

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingInvoice, setLoadingInvoice] = useState<boolean>(true);
  const [loadingRekening, setLoadingRekening] = useState<boolean>(true);

  /* ==========================================================
   * DATA
   * ========================================================== */

  const [invoiceList, setInvoiceList] = useState<InvoiceOption[]>([]);

  const [rekeningList, setRekeningList] = useState<RekeningBankOption[]>([]);

  /* ==========================================================
   * FORM
   * ========================================================== */

  const [form, setForm] = useState<PembayaranInvoiceForm>({
    tanggal: "",
    id_invoice: 0,
    id_rekening: 0,
    nominal: 0,
    keterangan: "",
  });

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOption | null>(
    null,
  );

  const [selectedRekening, setSelectedRekening] =
    useState<RekeningBankOption | null>(null);

  /* ============================================================
   * FETCH INVOICE
   * ============================================================ */

  async function fetchInvoice(): Promise<void> {
    try {
      setLoadingInvoice(true);

      const response = await fetch("/api/invoice", {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal mengambil data invoice."),
        );
      }

      /**
       * ======================================================
       * NORMALISASI RESPONSE
       * ======================================================
       *
       * Mendukung beberapa bentuk response:
       *
       * 1. [...]
       * 2. { data: [...] }
       * 3. { invoices: [...] }
       *
       * Tidak menggunakan any.
       */

      let rawInvoices: unknown[] = [];

      if (Array.isArray(result)) {
        rawInvoices = result;
      } else if (typeof result === "object" && result !== null) {
        if ("data" in result) {
          const dataValue = (
            result as {
              data?: unknown;
            }
          ).data;

          if (Array.isArray(dataValue)) {
            rawInvoices = dataValue;
          }
        }

        if (rawInvoices.length === 0 && "invoices" in result) {
          const invoicesValue = (
            result as {
              invoices?: unknown;
            }
          ).invoices;

          if (Array.isArray(invoicesValue)) {
            rawInvoices = invoicesValue;
          }
        }
      }

      /**
       * ======================================================
       * NORMALISASI DATA INVOICE
       * ======================================================
       */

      const invoices: InvoiceOption[] = rawInvoices
        .filter(
          (item: unknown): boolean => typeof item === "object" && item !== null,
        )
        .map((item: unknown): InvoiceOption => {
          const value = item as {
            id?: unknown;
            no_invoice?: unknown;
            customer?: unknown;
            status?: unknown;
            nominal?: unknown;
            nilai_tagihan?: unknown;
            total_neto?: unknown;
            total_dibayar?: unknown;
            sisa_tagihan?: unknown;
          };

          const nominal = Number(value.nominal ?? 0);

          const totalNeto = Number(value.total_neto ?? 0);

          const nilaiTagihan = Number(
            value.nilai_tagihan ?? totalNeto ?? nominal,
          );

          const totalDibayar = Number(value.total_dibayar ?? 0);

          const sisaTagihan = Math.max(nilaiTagihan - totalDibayar, 0);

          return {
            id: Number(value.id ?? 0),

            no_invoice:
              typeof value.no_invoice === "string"
                ? value.no_invoice
                : `Invoice #${String(value.id ?? "")}`,

            customer: typeof value.customer === "string" ? value.customer : "-",

            status:
              typeof value.status === "string"
                ? value.status
                : "Unpaid (Menunggu Pembayaran)",

            nominal,

            nilai_tagihan: Number.isFinite(nilaiTagihan) ? nilaiTagihan : 0,

            total_dibayar: Number.isFinite(totalDibayar) ? totalDibayar : 0,

            sisa_tagihan: Number.isFinite(sisaTagihan) ? sisaTagihan : 0,
          };
        })
        .filter(
          (invoice: InvoiceOption): boolean =>
            Number.isInteger(invoice.id) && invoice.id > 0,
        );

      /**
       * ======================================================
       * HANYA INVOICE YANG MASIH PUNYA SALDO
       * ======================================================
       *
       * Jangan hanya bergantung pada status.
       *
       * Jika:
       *
       * nilai_tagihan = 111.000
       * total_dibayar = 0
       * sisa          = 111.000
       *
       * maka invoice harus muncul.
       */

      const availableInvoices = invoices.filter(
        (invoice: InvoiceOption): boolean => invoice.sisa_tagihan > 0,
      );

      setInvoiceList(availableInvoices);

      /**
       * Jika invoice tidak ditemukan,
       * jangan diam saja.
       */
      if (availableInvoices.length === 0) {
        console.warn("Tidak ada invoice dengan sisa tagihan > 0.", {
          totalInvoice: invoices.length,
        });
      }
    } catch (error: unknown) {
      console.error("FETCH INVOICE ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Gagal Mengambil Invoice",
        text:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data invoice.",
      });

      setInvoiceList([]);
    } finally {
      setLoadingInvoice(false);
    }
  }

  /* ============================================================
   * FETCH REKENING BANK
   *
   * SAMA DENGAN REKENING KORAN
   *
   * Tidak lagi menggunakan:
   *
   * /api/accounting/coa-kas
   *
   * karena endpoint tersebut tidak ada.
   * ============================================================ */

  async function fetchRekeningBank(): Promise<void> {
    try {
      setLoadingRekening(true);

      const response = await fetch("/api/rekening-bank", {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal mengambil rekening bank."),
        );
      }

      if (!Array.isArray(result)) {
        throw new Error("Format data rekening bank tidak valid.");
      }

      const rekeningData: RekeningBankOption[] = result
        .filter(
          (item: unknown): boolean => typeof item === "object" && item !== null,
        )
        .map((item: unknown): RekeningBankOption => {
          const value = item as {
            id?: unknown;
            nama_bank?: unknown;
            no_rekening?: unknown;
            nama_pemilik?: unknown;
            id_coa?: unknown;
          };

          return {
            id: Number(value.id ?? 0),
            nama_bank:
              typeof value.nama_bank === "string" ? value.nama_bank : "",
            no_rekening:
              typeof value.no_rekening === "string" ? value.no_rekening : "",
            nama_pemilik:
              typeof value.nama_pemilik === "string" ? value.nama_pemilik : "",
            id_coa: Number(value.id_coa ?? 0),
          };
        })
        .filter(
          (rekening: RekeningBankOption): boolean =>
            Number.isInteger(rekening.id) &&
            rekening.id > 0 &&
            Number.isInteger(rekening.id_coa) &&
            rekening.id_coa > 0,
        );

      setRekeningList(rekeningData);

      /*
       * Hanya rekening yang mempunyai:
       *
       * id
       * nama_bank
       * no_rekening
       *
       * COA TIDAK dipilih manual di frontend.
       *
       * Backend akan mengambil:
       *
       * rekening_bank.id_coa
       *
       * kemudian memvalidasi COA tersebut.
       */

      setRekeningList(rekeningData);

      if (rekeningData.length === 1) {
        const rekening = rekeningData[0];

        setForm(
          (previous: PembayaranInvoiceForm): PembayaranInvoiceForm => ({
            ...previous,
            id_rekening: rekening.id,
          }),
        );

        setSelectedRekening(rekening);
      }
    } catch (error: unknown) {
      console.error("FETCH REKENING BANK ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Gagal mengambil rekening bank.",
      });
    } finally {
      setLoadingRekening(false);
    }
  }

  /* ============================================================
   * LOAD DATA
   * ============================================================ */

  useEffect(() => {
    void fetchInvoice();
    void fetchRekeningBank();
  }, []);

  /* ============================================================
   * HANDLE CHANGE
   * ============================================================ */

  function handleChange(
    field: keyof PembayaranInvoiceForm,
    value: string,
  ): void {
    if (
      field === "id_invoice" ||
      field === "id_rekening" ||
      field === "nominal"
    ) {
      const numericValue = Number(value);

      setForm(
        (previous: PembayaranInvoiceForm): PembayaranInvoiceForm => ({
          ...previous,
          [field]: Number.isFinite(numericValue) ? numericValue : 0,
        }),
      );

      /* ======================================================
       * INVOICE
       * ====================================================== */

      if (field === "id_invoice") {
        const invoiceId = numericValue;

        const invoice =
          invoiceList.find(
            (item: InvoiceOption): boolean => item.id === invoiceId,
          ) ?? null;

        setSelectedInvoice(invoice);

        /*
         * Saat invoice berubah,
         * nominal dikembalikan 0.
         */

        setForm(
          (previous: PembayaranInvoiceForm): PembayaranInvoiceForm => ({
            ...previous,
            id_invoice: invoiceId,
            nominal: 0,
          }),
        );
      }

      /* ======================================================
       * REKENING BANK
       * ====================================================== */

      if (field === "id_rekening") {
        const rekeningId = numericValue;

        const rekening =
          rekeningList.find(
            (item: RekeningBankOption): boolean => item.id === rekeningId,
          ) ?? null;

        setSelectedRekening(rekening);
      }

      return;
    }

    setForm(
      (previous: PembayaranInvoiceForm): PembayaranInvoiceForm => ({
        ...previous,
        [field]: value,
      }),
    );
  }

  /* ============================================================
   * VALIDASI
   * ============================================================ */

  function validateForm(): string | null {
    if (!form.tanggal) {
      return "Tanggal pembayaran wajib diisi.";
    }

    if (!Number.isInteger(form.id_invoice) || form.id_invoice <= 0) {
      return "Invoice wajib dipilih.";
    }

    if (!Number.isInteger(form.id_rekening) || form.id_rekening <= 0) {
      return "Rekening bank wajib dipilih.";
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran harus " + "lebih besar dari 0.";
    }

    if (!form.keterangan.trim()) {
      return "Keterangan wajib diisi.";
    }

    return null;
  }

  /* ============================================================
   * SUBMIT
   * ============================================================ */

  async function handleSubmit(): Promise<void> {
    if (loading) {
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

    if (!selectedRekening) {
      await Swal.fire({
        icon: "warning",
        title: "Rekening Belum Dipilih",
        text: "Silakan pilih rekening penerimaan pembayaran.",
      });

      return;
    }

    if (
      !Number.isInteger(selectedRekening.id_coa) ||
      selectedRekening.id_coa <= 0
    ) {
      await Swal.fire({
        icon: "error",
        title: "COA Rekening Tidak Valid",
        text: "COA rekening bank belum tersedia atau tidak valid. Silakan periksa master rekening bank.",
      });

      return;
    }

    setLoading(true);

    try {
      const payload: PembayaranInvoicePayload = {
        tanggal: form.tanggal,
        id_invoice: form.id_invoice,
        id_coa_debit: selectedRekening.id_coa,
        nominal: form.nominal,
        keterangan: form.keterangan.trim(),
      };

      const response = await fetch("/api/pembayaran-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Pembayaran invoice gagal disimpan."),
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Pembayaran Invoice Berhasil",
        text: getSuccessMessage(
          result,
          "Pembayaran invoice dan jurnal berhasil dibuat.",
        ),
        confirmButtonText: "OK",
      });

      router.push("/accounting/pembayaran-invoice");
      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PEMBAYARAN INVOICE ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Pembayaran Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Pembayaran invoice gagal disimpan. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Pembayaran Invoice">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
           * TANGGAL
           * ================================================== */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={loading}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* ==================================================
           * INVOICE
           * ================================================== */}

          <div>
            <label className="block text-sm font-medium mb-1">Invoice</label>

            <select
              className="w-full border rounded px-3 py-2"
              value={form.id_invoice}
              disabled={loadingInvoice || loading}
              onChange={(event) =>
                handleChange("id_invoice", event.target.value)
              }
            >
              <option value={0}>
                {loadingInvoice ? "Memuat invoice..." : "Pilih Invoice"}
              </option>

              {invoiceList.map((invoice: InvoiceOption) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.no_invoice}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
           * REKENING BANK
           *
           * MENGIKUTI REKENING KORAN
           * ================================================== */}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Rekening Pembayaran
            </label>

            <select
              className="w-full border rounded px-3 py-2"
              value={form.id_rekening}
              disabled={loadingRekening || loading}
              onChange={(event) =>
                handleChange("id_rekening", event.target.value)
              }
            >
              <option value={0}>
                {loadingRekening ? "Memuat rekening..." : "Pilih Rekening Bank"}
              </option>

              {rekeningList.map((rekening: RekeningBankOption) => (
                <option key={rekening.id} value={rekening.id}>
                  {rekening.nama_bank} - {rekening.no_rekening}
                  {rekening.nama_pemilik ? ` - ${rekening.nama_pemilik}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
           * NOMINAL
           * ================================================== */}

          <Input
            label="Nominal Pembayaran"
            type="number"
            value={form.nominal === 0 ? "" : form.nominal}
            min={0}
            disabled={loading}
            onChange={(event) => handleChange("nominal", event.target.value)}
          />

          {/* ==================================================
           * KETERANGAN
           * ================================================== */}

          <div className="md:col-span-2">
            <Input
              label="Keterangan"
              value={form.keterangan}
              disabled={loading}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
            />
          </div>
        </div>

        {/* ====================================================
         * INFORMASI INVOICE
         * ==================================================== */}

        {selectedInvoice && (
          <div className="mt-6 rounded-lg border p-4">
            <div className="font-semibold text-sm mb-3">Informasi Invoice</div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>No. Invoice</span>
                <span className="font-medium">
                  {selectedInvoice.no_invoice}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Nilai Invoice</span>
                <span className="font-medium">
                  Rp {Number(selectedInvoice.nominal).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-medium">{selectedInvoice.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
         * PREVIEW JURNAL
         * ==================================================== */}

        <div className="mt-6 rounded-lg border p-4 bg-gray-50">
          <div className="font-semibold text-sm mb-3">
            Preview Jurnal Pembayaran
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Debit —{" "}
                {selectedRekening
                  ? `${selectedRekening.nama_bank} - ${selectedRekening.no_rekening}`
                  : "Rekening belum dipilih"}
              </span>

              <span className="font-medium">
                Rp {form.nominal.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Kredit — 12001 Piutang Usaha</span>

              <span className="font-medium">
                Rp {form.nominal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-600">
            Pembayaran invoice dicatat sebagai penerimaan pada rekening yang
            dipilih dan mengurangi Piutang Usaha.
          </div>

          <div className="mt-1 text-xs text-gray-600">
            Pembayaran invoice tidak menggunakan PPN maupun PPh23.
          </div>
        </div>

        {/* ====================================================
         * ACTION
         * ==================================================== */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => router.push("/accounting/pembayaran-invoice")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading || loadingInvoice || loadingRekening}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
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
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;

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
    const message = value.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}
