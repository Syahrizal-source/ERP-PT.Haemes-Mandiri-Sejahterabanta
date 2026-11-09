"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Save, WalletCards } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

import {
  armadaPembayaranTagihanSchema,
  normalizeArmadaPembayaranTagihan,
  validateArmadaPembayaranTagihan,
  type ArmadaPembayaranTagihanInput,
} from "@/lib/validators/tagihan-pembayaran-armada";

/* ============================================================
   TYPES
   ============================================================ */

interface ArmadaOption {
  id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  no_pintu: string;
  supir: string;
  jumlah_tagihan: number;
  status: string;
}

interface CoaKasOption {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

interface PembayaranRow {
  id: string;
  armada_id: number;
  tanggal: string;
  no_bukti: string;
  nominal: number;
  metode_pembayaran: string;
  id_coa_kas: number | null;
  keterangan: string | null;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  id_jurnal: number | null;
  created_at: string;
  updated_at: string;
}

interface ArmadaResponse {
  success?: boolean;
  data?: ArmadaOption[];
  error?: string;
}

interface PembayaranResponse {
  success: boolean;
  data?: PembayaranRow[];
  error?: string;
}

interface CreatePembayaranResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    pembayaran: PembayaranRow;
    total_tagihan: number;
    total_pembayaran: number;
    sisa_tagihan_sebelum_pembayaran: number;
    sisa_tagihan_setelah_pembayaran: number;
  };
}

/* ============================================================
   CONSTANT
   ============================================================ */

const COA_ENDPOINT = "/api/coa";

/* ============================================================
   SAFE JSON
   Sama pola dengan form Rekening Koran.
   ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();

    const preview = text.replace(/\s+/g, " ").trim().slice(0, 300);

    throw new Error(
      preview
        ? `Server mengembalikan response bukan JSON: ${preview}`
        : `Server mengembalikan response bukan JSON (HTTP ${response.status}).`,
    );
  }

  return response.json() as Promise<unknown>;
}

/* ============================================================
   UNKNOWN OBJECT HELPER
   ============================================================ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* ============================================================
   SAFE STRING
   ============================================================ */

function toSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

/* ============================================================
   SAFE NUMBER
   ============================================================ */

function toSafeNumber(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (parsed < 0) {
    return 0;
  }

  return parsed;
}

/* ============================================================
   FORMAT RUPIAH
   ============================================================ */

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/* ============================================================
   NORMALIZE ARMADA RESPONSE
   ============================================================ */

function normalizeArmadaList(value: unknown): ArmadaOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map(
      (item): ArmadaOption => ({
        id: Number(item.id),
        tanggal: toSafeString(item.tanggal),
        kode_transaksi: toSafeString(item.kode_transaksi),
        no_polisi: toSafeString(item.no_polisi),
        no_pintu: toSafeString(item.no_pintu),
        supir: toSafeString(item.supir),
        jumlah_tagihan: Number(item.jumlah_tagihan ?? 0),
        status: toSafeString(item.status),
      }),
    )
    .filter(
      (item: ArmadaOption) =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        item.kode_transaksi.length > 0,
    );
}

/* ============================================================
   NORMALIZE COA KAS/BANK
   ============================================================ */

function normalizeCoaKasList(value: unknown): CoaKasOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map(
      (item): CoaKasOption => ({
        id_coa: Number(item.id_coa),
        kode: toSafeString(item.kode),
        nama: toSafeString(item.nama),
        tipe: toSafeString(item.tipe),
        aktif: item.aktif === true,
        is_cash: item.is_cash === true,
        is_header: item.is_header === true,
      }),
    )
    .filter(
      (coa: CoaKasOption) =>
        Number.isInteger(coa.id_coa) &&
        coa.id_coa > 0 &&
        coa.kode.length > 0 &&
        coa.nama.length > 0 &&
        coa.aktif === true &&
        coa.is_cash === true &&
        coa.is_header === false,
    );
}

/* ============================================================
   NORMALIZE PEMBAYARAN
   ============================================================ */

function normalizePembayaranList(value: unknown): PembayaranRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map(
      (item): PembayaranRow => ({
        id: toSafeString(item.id),
        armada_id: Number(item.armada_id),
        tanggal: toSafeString(item.tanggal),
        no_bukti: toSafeString(item.no_bukti),
        nominal: Number(item.nominal ?? 0),
        metode_pembayaran: toSafeString(item.metode_pembayaran),
        id_coa_kas:
          item.id_coa_kas === null || item.id_coa_kas === undefined
            ? null
            : Number(item.id_coa_kas),
        keterangan:
          item.keterangan === null || item.keterangan === undefined
            ? null
            : toSafeString(item.keterangan),
        status:
          item.status === "POSTED" ||
          item.status === "CANCELLED" ||
          item.status === "DRAFT"
            ? item.status
            : "DRAFT",
        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),
        created_at: toSafeString(item.created_at),
        updated_at: toSafeString(item.updated_at),
      }),
    )
    .filter(
      (item: PembayaranRow) =>
        item.id.length > 0 &&
        Number.isInteger(item.armada_id) &&
        item.armada_id > 0,
    );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function CreatePembayaranTagihanArmadaPage() {
  const router = useRouter();

  const { showToast } = useToast();

  const [armadaList, setArmadaList] = useState<ArmadaOption[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKasOption[]>([]);

  const [pembayaranList, setPembayaranList] = useState<PembayaranRow[]>([]);

  const [form, setForm] = useState<ArmadaPembayaranTagihanInput>({
    armada_id: 0,
    tanggal: "",
    no_bukti: "",
    nominal: 0,
    metode_pembayaran: "KAS",
    id_coa_kas: null,
    keterangan: null,
    status: "DRAFT",
    id_jurnal: null,
  });

  const [errorMessage, setErrorMessage] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ============================================================
     LOAD ARMADA
     ============================================================ */

  async function fetchArmada(): Promise<void> {
    const response = await fetch("/api/armada", {
      method: "GET",
      cache: "no-store",
    });

    const result: unknown = await readJsonSafely(response);

    if (!response.ok) {
      if (isRecord(result)) {
        const errorValue = result.error;

        if (typeof errorValue === "string" && errorValue.trim()) {
          throw new Error(errorValue);
        }
      }

      throw new Error("Gagal mengambil data Armada.");
    }

    /*
     * /api/armada existing mengembalikan array.
     */
    if (Array.isArray(result)) {
      setArmadaList(normalizeArmadaList(result));

      return;
    }

    /*
     * Tetap toleran jika API mengembalikan wrapper.
     */
    if (isRecord(result)) {
      const success = result.success;

      if (success === false) {
        const errorValue = result.error;

        throw new Error(
          typeof errorValue === "string" && errorValue.trim()
            ? errorValue
            : "Gagal mengambil data Armada.",
        );
      }

      setArmadaList(normalizeArmadaList(result.data));

      return;
    }

    throw new Error("Format response data Armada tidak valid.");
  }

  /* ============================================================
     LOAD COA KAS/BANK

     SOURCE:
       /api/coa

     FILTER:
       aktif = true
       is_cash = true
       is_header = false

     COA HEADER TIDAK BOLEH DIPAKAI POSTING.
     ============================================================ */

  async function fetchCoaKas(): Promise<void> {
    const response = await fetch(COA_ENDPOINT, {
      method: "GET",
      cache: "no-store",
    });

    const result: unknown = await readJsonSafely(response);

    if (!response.ok) {
      if (isRecord(result)) {
        const errorValue = result.error;

        if (typeof errorValue === "string" && errorValue.trim()) {
          throw new Error(errorValue);
        }
      }

      throw new Error("Gagal mengambil COA kas/bank.");
    }

    /*
     * /api/coa mengikuti pola Rekening Koran:
     * response langsung berupa array COA.
     */
    if (!Array.isArray(result)) {
      throw new Error(
        "Format response /api/coa tidak valid. Response harus berupa array.",
      );
    }

    const validCoa = normalizeCoaKasList(result);

    setCoaKasList(validCoa);
  }

  /* ============================================================
     LOAD PEMBAYARAN

     Digunakan untuk menghitung:
       - Sudah Dibayar
       - Sisa Tagihan
     ============================================================ */

  async function fetchPembayaran(): Promise<void> {
    const response = await fetch("/api/pembayaran-tagihan-armada", {
      method: "GET",
      cache: "no-store",
    });

    const result: unknown = await readJsonSafely(response);

    if (!response.ok) {
      if (isRecord(result)) {
        const errorValue = result.error;

        if (typeof errorValue === "string" && errorValue.trim()) {
          throw new Error(errorValue);
        }
      }

      throw new Error("Gagal mengambil data pembayaran Armada.");
    }

    if (!isRecord(result)) {
      throw new Error("Format response pembayaran Armada tidak valid.");
    }

    const success = result.success;

    if (success !== true) {
      const errorValue = result.error;

      throw new Error(
        typeof errorValue === "string" && errorValue.trim()
          ? errorValue
          : "Gagal mengambil data pembayaran Armada.",
      );
    }

    setPembayaranList(normalizePembayaranList(result.data));
  }

  /* ============================================================
     LOAD ALL DATA
     ============================================================ */

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([fetchArmada(), fetchCoaKas(), fetchPembayaran()]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal mengambil data.";

      setErrorMessage(message);

      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  /* ============================================================
     ARMADA TERPILIH
     ============================================================ */

  const selectedArmada = useMemo(() => {
    if (form.armada_id <= 0) {
      return null;
    }

    return (
      armadaList.find((item: ArmadaOption) => item.id === form.armada_id) ??
      null
    );
  }, [armadaList, form.armada_id]);

  /* ============================================================
     PEMBAYARAN POSTED ARMADA TERPILIH
     ============================================================ */

  const selectedPayments = useMemo(() => {
    if (!selectedArmada) {
      return [];
    }

    return pembayaranList.filter(
      (item: PembayaranRow) =>
        item.armada_id === selectedArmada.id && item.status === "POSTED",
    );
  }, [pembayaranList, selectedArmada]);

  /* ============================================================
     TOTAL TAGIHAN

     Sumber langsung:
       public.armada.jumlah_tagihan

     Tidak dihitung ulang di UI.
     ============================================================ */

  const totalTagihan = selectedArmada
    ? Number(selectedArmada.jumlah_tagihan ?? 0)
    : 0;

  /* ============================================================
     TOTAL PEMBAYARAN POSTED
     ============================================================ */

  const totalPembayaran = useMemo(() => {
    return selectedPayments.reduce(
      (total: number, item: PembayaranRow) => total + Number(item.nominal ?? 0),
      0,
    );
  }, [selectedPayments]);

  /* ============================================================
     SISA TAGIHAN
     ============================================================ */

  const sisaTagihan = Math.max(
    0,
    Number((totalTagihan - totalPembayaran).toFixed(2)),
  );

  /* ============================================================
     NOMINAL PEMBAYARAN
     ============================================================ */

  const nominalPembayaran = Number(form.nominal ?? 0);

  /* ============================================================
     SISA SETELAH PEMBAYARAN
     ============================================================ */

  const sisaSetelahPembayaran = Math.max(
    0,
    Number((sisaTagihan - nominalPembayaran).toFixed(2)),
  );

  /* ============================================================
     HANDLE CHANGE
     ============================================================ */

  function handleChange(
    field: keyof ArmadaPembayaranTagihanInput,
    value: string,
  ): void {
    setErrorMessage("");

    if (field === "armada_id") {
      const armadaId = Number(value);

      setForm((previous) => ({
        ...previous,
        armada_id: Number.isInteger(armadaId) && armadaId > 0 ? armadaId : 0,
        id_coa_kas: null,
        nominal: 0,
      }));

      return;
    }

    if (field === "nominal") {
      setForm((previous) => ({
        ...previous,
        nominal: toSafeNumber(value),
      }));

      return;
    }

    if (field === "id_coa_kas") {
      const coaId = Number(value);

      setForm((previous) => ({
        ...previous,
        id_coa_kas: Number.isInteger(coaId) && coaId > 0 ? coaId : null,
      }));

      return;
    }

    if (field === "keterangan") {
      setForm((previous) => ({
        ...previous,
        keterangan: value,
      }));

      return;
    }

    if (
      field === "tanggal" ||
      field === "no_bukti" ||
      field === "metode_pembayaran"
    ) {
      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
    }
  }

  /* ============================================================
     SUBMIT

     HANYA MEMBUAT DRAFT.

     JURNAL BELUM DIBUAT DI SINI.
     JURNAL DIBUAT SAAT POSTING.
     ============================================================ */

  async function handleSubmit(): Promise<void> {
    setErrorMessage("");

    const normalized = normalizeArmadaPembayaranTagihan(form);

    const parsed = armadaPembayaranTagihanSchema.safeParse(normalized);

    if (!parsed.success) {
      const first = parsed.error.issues[0];

      const message = first?.message ?? "Data pembayaran tidak valid.";

      setErrorMessage(message);

      return;
    }

    try {
      validateArmadaPembayaranTagihan(normalized);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Data pembayaran tidak valid.";

      setErrorMessage(message);

      return;
    }

    /* ========================================================
       VALIDASI ARMADA
       ======================================================== */

    if (!selectedArmada) {
      setErrorMessage("Armada wajib dipilih.");

      return;
    }

    /* ========================================================
       VALIDASI TAGIHAN
       ======================================================== */

    if (totalTagihan <= 0) {
      setErrorMessage("Armada belum memiliki tagihan yang valid.");

      return;
    }

    /* ========================================================
       VALIDASI SISA
       ======================================================== */

    if (sisaTagihan <= 0) {
      setErrorMessage("Tagihan Armada sudah lunas.");

      return;
    }

    if (nominalPembayaran > sisaTagihan) {
      setErrorMessage("Nominal pembayaran melebihi sisa tagihan.");

      return;
    }

    /* ========================================================
       VALIDASI COA KAS
       ======================================================== */

    if (normalized.id_coa_kas === null || normalized.id_coa_kas === undefined) {
      setErrorMessage("COA kas/bank wajib dipilih.");

      return;
    }

    const selectedCoa = coaKasList.find(
      (coa: CoaKasOption) => coa.id_coa === normalized.id_coa_kas,
    );

    if (!selectedCoa) {
      setErrorMessage("COA kas/bank yang dipilih tidak valid.");

      return;
    }

    if (!selectedCoa.aktif || !selectedCoa.is_cash || selectedCoa.is_header) {
      setErrorMessage(
        "COA pembayaran harus aktif, merupakan kas/bank, dan bukan COA header.",
      );

      return;
    }

    /* ========================================================
       CREATE DRAFT
       ======================================================== */

    try {
      setSaving(true);

      const response = await fetch("/api/pembayaran-tagihan-armada", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          armada_id: normalized.armada_id,

          tanggal: normalized.tanggal,

          no_bukti: normalized.no_bukti,

          nominal: normalized.nominal,

          metode_pembayaran: normalized.metode_pembayaran,

          id_coa_kas: normalized.id_coa_kas,

          keterangan: normalized.keterangan ?? null,

          status: "DRAFT",

          id_jurnal: null,
        }),
      });

      const result: unknown = await readJsonSafely(response);

      if (!isRecord(result)) {
        throw new Error("Response server pembayaran tidak valid.");
      }

      const success = result.success;

      if (response.ok && success === true) {
        await Swal.fire({
          icon: "success",
          title: "Pembayaran Berhasil Disimpan",
          text: "Pembayaran tagihan Armada berhasil dibuat sebagai DRAFT.",
          confirmButtonText: "OK",
        });

        router.push("/transaksi/pembayaran-tagihan-armada");

        router.refresh();

        return;
      }

      const errorValue = result.error;

      throw new Error(
        typeof errorValue === "string" && errorValue.trim()
          ? errorValue
          : "Gagal menyimpan pembayaran.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan pembayaran.";

      setErrorMessage(message);

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card title="Pembayaran Tagihan Armada">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />

            <span>Memuat data...</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ============================================================
     UI
     ============================================================ */

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Pembayaran Tagihan Armada">
        <div className="space-y-6">
          {/* ==================================================
              INFORMASI
              ================================================== */}

          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <WalletCards className="w-5 h-5 mt-0.5" />

              <div>
                <h3 className="font-semibold">
                  Form Pembayaran Tagihan Armada
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Pembayaran akan dibuat sebagai DRAFT terlebih dahulu. Jurnal
                  pembayaran dibuat saat transaksi di-POSTING.
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              ERROR GLOBAL
              ================================================== */}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {/* ==================================================
              FORM
              ================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ARMADA */}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Armada</label>

              <select
                value={form.armada_id > 0 ? String(form.armada_id) : ""}
                onChange={(event) =>
                  handleChange("armada_id", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 bg-white"
              >
                <option value="">Pilih Armada</option>

                {armadaList.map((armada: ArmadaOption) => (
                  <option key={armada.id} value={armada.id}>
                    {armada.kode_transaksi} - {armada.no_polisi} -{" "}
                    {armada.supir}
                  </option>
                ))}
              </select>
            </div>

            {/* INFO ARMADA */}

            {selectedArmada && (
              <div className="md:col-span-2 rounded-xl border p-4 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Kode Transaksi</p>

                    <p className="font-semibold mt-1">
                      {selectedArmada.kode_transaksi}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">No Polisi</p>

                    <p className="font-semibold mt-1">
                      {selectedArmada.no_polisi}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Supir</p>

                    <p className="font-semibold mt-1">{selectedArmada.supir}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Status Armada</p>

                    <p className="font-semibold mt-1">
                      {selectedArmada.status}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TANGGAL */}

            <Input
              label="Tanggal Pembayaran"
              type="date"
              value={form.tanggal}
              onChange={(event) => handleChange("tanggal", event.target.value)}
            />

            {/* NO BUKTI */}

            <Input
              label="No Bukti"
              value={form.no_bukti}
              onChange={(event) => handleChange("no_bukti", event.target.value)}
            />

            {/* METODE */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Metode Pembayaran
              </label>

              <select
                value={form.metode_pembayaran}
                onChange={(event) =>
                  handleChange("metode_pembayaran", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 bg-white"
              >
                <option value="KAS">KAS</option>

                <option value="BANK">BANK</option>

                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>

            {/* COA KAS/BANK */}

            <div>
              <label className="block text-sm font-medium mb-1">
                COA Kas / Bank
              </label>

              <select
                value={form.id_coa_kas !== null ? String(form.id_coa_kas) : ""}
                onChange={(event) =>
                  handleChange("id_coa_kas", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 bg-white"
              >
                <option value="">Pilih COA Kas / Bank</option>

                {coaKasList.map((coa: CoaKasOption) => (
                  <option key={coa.id_coa} value={coa.id_coa}>
                    {coa.kode} - {coa.nama}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-500 mt-1">
                Hanya COA kas/bank detail yang aktif yang tersedia.
              </p>
            </div>

            {/* NOMINAL */}

            <Input
              label="Nominal Pembayaran"
              type="number"
              min="0"
              value={form.nominal}
              onChange={(event) => handleChange("nominal", event.target.value)}
            />

            {/* KETERANGAN */}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Keterangan
              </label>

              <textarea
                value={form.keterangan ?? ""}
                onChange={(event) =>
                  handleChange("keterangan", event.target.value)
                }
                rows={3}
                placeholder="Keterangan pembayaran..."
                className="w-full rounded-lg border px-3 py-2 bg-white"
              />
            </div>
          </div>

          {/* ==================================================
              RINGKASAN TAGIHAN
              ================================================== */}

          <div>
            <h3 className="font-semibold mb-3">Ringkasan Tagihan</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4 bg-white">
                <p className="text-xs text-gray-500">Total Tagihan</p>

                <p className="text-lg font-bold mt-1">
                  {formatRupiah(totalTagihan)}
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-white">
                <p className="text-xs text-gray-500">Sudah Dibayar</p>

                <p className="text-lg font-bold mt-1">
                  {formatRupiah(totalPembayaran)}
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-white">
                <p className="text-xs text-gray-500">Sisa Tagihan</p>

                <p className="text-lg font-bold mt-1">
                  {formatRupiah(sisaTagihan)}
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              PREVIEW PEMBAYARAN
              ================================================== */}

          {nominalPembayaran > 0 && selectedArmada && (
            <div className="rounded-xl border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />

                <span className="font-semibold">Preview Pembayaran</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span>Sisa sebelum pembayaran</span>

                  <strong>{formatRupiah(sisaTagihan)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Nominal pembayaran</span>

                  <strong>{formatRupiah(nominalPembayaran)}</strong>
                </div>

                <div className="border-t pt-2 flex justify-between gap-4">
                  <span>Sisa setelah pembayaran</span>

                  <strong>{formatRupiah(sisaSetelahPembayaran)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              PREVIEW JURNAL
              ================================================== */}

          {selectedArmada &&
            nominalPembayaran > 0 &&
            form.id_coa_kas !== null && (
              <div className="rounded-xl border p-4 bg-white">
                <h3 className="font-semibold mb-3">
                  Preview Jurnal Saat POSTING
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span>DEBIT — Hutang Armada</span>

                    <strong>{formatRupiah(nominalPembayaran)}</strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>
                      CREDIT —{" "}
                      {coaKasList.find(
                        (coa: CoaKasOption) => coa.id_coa === form.id_coa_kas,
                      )?.nama ?? "COA Kas/Bank"}
                    </span>

                    <strong>{formatRupiah(nominalPembayaran)}</strong>
                  </div>

                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    COA Hutang ditentukan backend melalui mapping ARMADA /
                    HUTANG. Form ini tidak menerima input COA Hutang dari user.
                  </div>
                </div>
              </div>
            )}

          {/* ==================================================
              ACTION
              ================================================== */}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() =>
                router.push("/transaksi/pembayaran-tagihan-armada")
              }
              disabled={saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() => void handleSubmit()}
              disabled={
                saving ||
                !selectedArmada ||
                sisaTagihan <= 0 ||
                coaKasList.length === 0
              }
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan DRAFT
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
