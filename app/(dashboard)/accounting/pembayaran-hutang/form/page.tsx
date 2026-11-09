"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { ArrowLeft, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type HutangStatus = "UNPAID" | "PARTIAL" | "PAID";

interface Hutang {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  nilai: number;
  terbayar: number;
  status: HutangStatus;
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
  id_hutang: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * ENDPOINT
 *
 * Mengikuti pola Rekening Koran yang sudah ada.
 * ============================================================ */

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  /* ==========================================================
   * FORM
   * ========================================================== */

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_hutang: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  /* ==========================================================
   * DATA
   * ========================================================== */

  const [hutangList, setHutangList] = useState<Hutang[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  /* ==========================================================
   * LOADING
   * ========================================================== */

  const [loadingHutang, setLoadingHutang] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * NOMINAL PEMBAYARAN
   *
   * Tidak ada:
   * - PPN
   * - PPh23
   *
   * Total pembayaran = nominal.
   * ========================================================== */

  const nominal: number = Number.isFinite(form.nominal)
    ? Math.max(0, form.nominal)
    : 0;

  const total: number = nominal;

  /* ==========================================================
   * CHANGE FORM
   * ========================================================== */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm(
      (prev: FormState): FormState => ({
        ...prev,
        [field]: value,
      }),
    );
  }

  /* ==========================================================
   * LOAD HUTANG
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadHutang(): Promise<void> {
      try {
        setLoadingHutang(true);

        const response = await fetch("/api/hutang", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar hutang."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format data hutang tidak valid.");
        }

        const normalizedHutang: Hutang[] = normalizeHutangList(result);

        if (!active) {
          return;
        }

        setHutangList(normalizedHutang);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD HUTANG ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil daftar hutang."),
          "error",
        );
      } finally {
        if (active) {
          setLoadingHutang(false);
        }
      }
    }

    void loadHutang();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
   *
   * Mengikuti pola Rekening Koran:
   *
   * GET /api/coa
   *
   * Kemudian filter:
   * - aktif
   * - is_cash
   * - bukan header
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

        if (!active) {
          return;
        }

        const normalizedCoa: CoaKas[] = normalizeCoaKasList(result);

        setCoaKasList(normalizedCoa);

        /*
         * Jangan memilih COA secara otomatis.
         *
         * User harus memilih kas/bank yang akan
         * menjadi sumber pembayaran.
         */
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
      return "Tanggal pembayaran wajib diisi.";
    }

    if (form.id_hutang <= 0) {
      return "Pilih hutang terlebih dahulu.";
    }

    if (form.id_coa_kas <= 0) {
      return "Pilih kas/bank pembayaran terlebih dahulu.";
    }

    const selectedCoaKas: CoaKas | undefined = coaKasList.find(
      (coa: CoaKas): boolean => coa.id_coa === form.id_coa_kas,
    );

    if (!selectedCoaKas) {
      return "COA kas/bank yang dipilih tidak tersedia.";
    }

    /*
     * Guard frontend.
     *
     * Validasi final tetap dilakukan di API/helper.
     */

    if (!selectedCoaKas.aktif) {
      return "COA kas/bank tidak aktif.";
    }

    if (!selectedCoaKas.is_cash) {
      return "COA yang dipilih bukan akun kas/bank.";
    }

    if (selectedCoaKas.is_header) {
      return "COA kas/bank harus berupa COA detail, bukan header.";
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran harus lebih besar dari 0.";
    }

    if (!Number.isFinite(total) || total <= 0) {
      return "Total pembayaran tidak valid.";
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
      await Swal.fire("Data Belum Lengkap", validationError, "warning");

      return;
    }

    try {
      setSaving(true);

      /*
       * Jangan kirim COA hutang dari frontend.
       *
       * COA hutang akan ditentukan backend:
       *
       * HUTANG/HUTANG
       *       ↓
       * 2747 Hutang Vendor
       *
       * COA kas berasal dari pilihan user:
       *
       * id_coa_kas
       *       ↓
       * divalidasi backend
       *       ↓
       * aktif + is_cash + detail
       *
       * Tidak mengirim:
       * - ppn
       * - pph23
       */

      const payload = {
        tanggal: form.tanggal,
        id_hutang: form.id_hutang,
        id_coa_kas: form.id_coa_kas,
        nominal: form.nominal,
        keterangan: form.keterangan.trim(),
      };

      const response = await fetch("/api/pembayaran-hutang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menyimpan pembayaran hutang."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(
          result,
          "Pembayaran hutang dan jurnal berhasil dibuat.",
        ),
        "success",
      );

      router.push("/accounting/pembayaran-hutang");

      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PEMBAYARAN HUTANG ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal menyimpan pembayaran hutang."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Pembayaran Hutang">
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
              HUTANG
              ================================================== */}

          <div>
            <label className="text-sm">Hutang</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_hutang}
              disabled={loadingHutang || saving}
              onChange={(event) =>
                handleChange("id_hutang", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingHutang ? "Memuat hutang..." : "Pilih hutang"}
              </option>

              {hutangList.map((hutang: Hutang) => {
                const nilai: number = Number(hutang.nilai ?? 0);

                const terbayar: number = Number(hutang.terbayar ?? 0);

                const sisa: number = Math.max(nilai - terbayar, 0);

                const disabled: boolean = sisa <= 0 || hutang.status === "PAID";

                return (
                  <option
                    key={hutang.id_hutang}
                    value={hutang.id_hutang}
                    disabled={disabled}
                  >
                    {hutang.supplier} | {hutang.no_invoice} | Sisa:{" "}
                    {sisa.toLocaleString("id-ID")} | {hutang.status}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ==================================================
              COA KAS / BANK
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
              Hanya COA kas/bank detail yang aktif yang dapat digunakan untuk
              pembayaran.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal"
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
            INFORMASI PEMBAYARAN
            ==================================================== */}

        <div className="mt-4 rounded border p-3 text-sm">
          <p>
            <strong>Nominal:</strong> {nominal.toLocaleString("id-ID")}
          </p>

          <p className="mt-2 font-bold">
            Total Bayar: {total.toLocaleString("id-ID")}
          </p>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-4 rounded border p-3 text-sm">
          <p className="font-semibold">Jurnal Pembayaran</p>

          <p className="mt-2">Dr Hutang Vendor</p>

          <p>Cr Kas / Bank yang dipilih</p>
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
            disabled={saving || loadingHutang || loadingCoa}
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * NORMALIZE HUTANG
 * ============================================================ */

function normalizeHutangList(value: unknown[]): Hutang[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): Hutang => ({
        id_hutang: Number(item.id_hutang),

        supplier: String(item.supplier ?? ""),

        no_invoice: String(item.no_invoice ?? ""),

        nilai: Number(item.nilai ?? 0),

        terbayar: Number(item.terbayar ?? 0),

        status: normalizeStatus(item.status),
      }),
    )
    .filter(
      (item: Hutang): boolean =>
        Number.isInteger(item.id_hutang) &&
        item.id_hutang > 0 &&
        item.supplier.length > 0 &&
        item.no_invoice.length > 0,
    );
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
        item.is_header === false,
    );
}

/* ============================================================
 * NORMALIZE STATUS
 * ============================================================ */

function normalizeStatus(value: unknown): HutangStatus {
  if (value === "PAID") {
    return "PAID";
  }

  if (value === "PARTIAL") {
    return "PARTIAL";
  }

  return "UNPAID";
}

/* ============================================================
 * SAFE JSON
 *
 * Mengikuti pola Rekening Koran agar response 404 HTML
 * tidak menghasilkan:
 *
 * Unexpected token '<'
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

/* ============================================================
 * UNKNOWN ERROR
 * ============================================================ */

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
