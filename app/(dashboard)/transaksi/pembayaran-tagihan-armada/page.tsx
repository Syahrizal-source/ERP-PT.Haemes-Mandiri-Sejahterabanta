"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface ArmadaOption {
  id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
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
  armada?: ArmadaOption | null;
  coa_kas?: CoaKasOption | null;
}

interface PembayaranResponse {
  success: boolean;
  data?: PembayaranRow[];
  error?: string;
}

interface ArmadaResponse {
  success?: boolean;
  data?: ArmadaOption[];
  error?: string;
}

interface CoaResponse {
  success?: boolean;
  data?: CoaKasOption[];
  error?: string;
}

interface CreatePaymentResponse {
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

interface PostPaymentResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    pembayaran_id: string;
    armada_id: number;
    id_jurnal: number;
    nominal: number;
    total_tagihan: number;
    total_pembayaran: number;
    sisa_tagihan: number;
    coa: {
      hutang: {
        id_coa: number;
      };
      kas: {
        id_coa: number;
      };
    };
  };
}

type FormState = {
  armada_id: string;
  tanggal: string;
  no_bukti: string;
  nominal: string;
  metode_pembayaran: string;
  id_coa_kas: string;
  keterangan: string;
};

const initialForm: FormState = {
  armada_id: "",
  tanggal: new Date().toISOString().slice(0, 10),
  no_bukti: "",
  nominal: "",
  metode_pembayaran: "KAS",
  id_coa_kas: "",
  keterangan: "",
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string): string {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function PembayaranTagihanArmadaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [armadaList, setArmadaList] = useState<ArmadaOption[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKasOption[]>([]);

  const [pembayaranList, setPembayaranList] = useState<PembayaranRow[]>([]);

  const [form, setForm] = useState<FormState>(initialForm);

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [postingId, setPostingId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [showForm, setShowForm] = useState<boolean>(false);

  const COA_ENDPOINT = "/api/coa";

  function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();

    const preview = text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    throw new Error(
      preview
        ? `Server mengembalikan response bukan JSON: ${preview}`
        : `Server mengembalikan response bukan JSON (HTTP ${response.status}).`,
    );
  }

  return response.json() as Promise<unknown>;
}

function normalizeCoaKasList(value: unknown): CoaKasOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item): CoaKasOption => ({
      id_coa: Number(item.id_coa),
      kode:
        typeof item.kode === "string"
          ? item.kode.trim()
          : String(item.kode ?? ""),
      nama:
        typeof item.nama === "string"
          ? item.nama.trim()
          : String(item.nama ?? ""),
      tipe:
        typeof item.tipe === "string"
          ? item.tipe.trim()
          : String(item.tipe ?? ""),
      aktif: item.aktif === true,
      is_cash: item.is_cash === true,
      is_header: item.is_header === true,
    }))
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
     LOAD ARMADA
     ============================================================ */

  async function fetchArmada(): Promise<void> {
    const response = await fetch("/api/armada", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil data Armada.");
    }

    const result: unknown = await response.json();

    const rows = Array.isArray(result) ? (result as ArmadaOption[]) : [];

    setArmadaList(rows);
  }

  /* ============================================================
     LOAD COA KAS/BANK
     
     Kita gunakan endpoint coa.
     
     Jika endpoint COA Anda memiliki path berbeda,
     cukup ubah URL di sini tanpa mengubah logika pembayaran.
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

      if (
        typeof errorValue === "string" &&
        errorValue.trim()
      ) {
        throw new Error(errorValue);
      }
    }

    throw new Error("Gagal mengambil COA kas/bank.");
  }

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
     ============================================================ */

  async function fetchPembayaran(): Promise<void> {
    const response = await fetch("/api/pembayaran-tagihan-armada", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil pembayaran Armada.");
    }

    const result = (await response.json()) as PembayaranResponse;

    if (!result.success) {
      throw new Error(result.error ?? "Gagal mengambil pembayaran Armada.");
    }

    setPembayaranList(result.data ?? []);
  }

  /* ============================================================
     LOAD SEMUA DATA
     ============================================================ */

  async function loadData(): Promise<void> {
    try {
      setLoading(true);

      await Promise.all([fetchArmada(), fetchCoaKas(), fetchPembayaran()]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal mengambil data.";

      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    // Halaman hanya load pertama kali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     REFRESH
     ============================================================ */

  async function handleRefresh(): Promise<void> {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  /* ============================================================
     ARMADA TERPILIH
     ============================================================ */

  const selectedArmada = useMemo(() => {
    if (!form.armada_id) {
      return null;
    }

    const id = Number(form.armada_id);

    return armadaList.find((item: ArmadaOption) => item.id === id) ?? null;
  }, [armadaList, form.armada_id]);

  /* ============================================================
     PEMBAYARAN POSTED PER ARMADA
     ============================================================ */

  const selectedArmadaPayments = useMemo(() => {
    if (!selectedArmada) {
      return [];
    }

    return pembayaranList.filter(
      (item: PembayaranRow) =>
        item.armada_id === selectedArmada.id && item.status === "POSTED",
    );
  }, [pembayaranList, selectedArmada]);

  const totalPembayaranSelected = useMemo(() => {
    return selectedArmadaPayments.reduce(
      (total: number, item: PembayaranRow) => total + Number(item.nominal ?? 0),
      0,
    );
  }, [selectedArmadaPayments]);

  const totalTagihanSelected = selectedArmada
    ? Number(selectedArmada.jumlah_tagihan ?? 0)
    : 0;

  const sisaTagihanSelected = Math.max(
    0,
    Number((totalTagihanSelected - totalPembayaranSelected).toFixed(2)),
  );

  const nominalInput = Number(form.nominal || 0);

  const sisaSetelahPembayaran = Math.max(
    0,
    Number((sisaTagihanSelected - nominalInput).toFixed(2)),
  );

  /* ============================================================
     CHANGE FORM
     ============================================================ */

  function updateForm(field: keyof FormState, value: string): void {
    setForm((previous: FormState) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* ============================================================
     RESET FORM
     ============================================================ */

  function resetForm(): void {
    setForm({
      ...initialForm,
      tanggal: new Date().toISOString().slice(0, 10),
    });
  }

  /* ============================================================
     SIMPAN DRAFT
     ============================================================ */

  async function handleSave(): Promise<void> {
    if (!form.armada_id) {
      showToast("Armada wajib dipilih.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal pembayaran wajib diisi.", "error");
      return;
    }

    if (!form.no_bukti.trim()) {
      showToast("No bukti wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(nominalInput) || nominalInput <= 0) {
      showToast("Nominal pembayaran harus lebih dari 0.", "error");
      return;
    }

    if (!form.id_coa_kas) {
      showToast("COA kas/bank wajib dipilih.", "error");
      return;
    }

    if (nominalInput > sisaTagihanSelected) {
      showToast("Nominal pembayaran melebihi sisa tagihan.", "error");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/pembayaran-tagihan-armada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          armada_id: Number(form.armada_id),

          tanggal: form.tanggal,

          no_bukti: form.no_bukti.trim(),

          nominal: nominalInput,

          metode_pembayaran: form.metode_pembayaran,

          id_coa_kas: Number(form.id_coa_kas),

          keterangan: form.keterangan.trim() || null,

          status: "DRAFT",

          id_jurnal: null,
        }),
      });

      const result = (await response.json()) as CreatePaymentResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Gagal menyimpan pembayaran.");
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Pembayaran tagihan Armada berhasil dibuat sebagai DRAFT.",
        icon: "success",
        confirmButtonText: "OK",
      });

      resetForm();
      setShowForm(false);

      await fetchPembayaran();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan pembayaran.";

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     POSTING PEMBAYARAN
     ============================================================ */

  async function handlePost(payment: PembayaranRow): Promise<void> {
    if (payment.status !== "DRAFT") {
      showToast("Hanya pembayaran DRAFT yang dapat diposting.", "error");
      return;
    }

    const confirm = await Swal.fire({
      title: "Posting Pembayaran?",
      html: `
          <div style="text-align:left">
            <p><strong>No Bukti:</strong> ${payment.no_bukti}</p>
            <p><strong>Nominal:</strong> ${formatRupiah(
              Number(payment.nominal),
            )}</p>
            <p>
              <strong>Jurnal:</strong><br/>
              DR Hutang Armada<br/>
              CR COA Kas/Bank yang dipilih
            </p>
          </div>
        `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, POSTING",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      setPostingId(payment.id);

      const response = await fetch(
        `/api/pembayaran-tagihan-armada/${payment.id}/post`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as PostPaymentResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Gagal posting pembayaran.");
      }

      await Swal.fire({
        title: "Berhasil",
        html: `
          <p>Pembayaran berhasil POSTED.</p>
          <p><strong>ID Jurnal:</strong> ${result.data?.id_jurnal ?? "-"}</p>
          <p><strong>COA Hutang:</strong> ${
            result.data?.coa.hutang.id_coa ?? "-"
          }</p>
          <p><strong>COA Kas:</strong> ${result.data?.coa.kas.id_coa ?? "-"}</p>
        `,
        icon: "success",
        confirmButtonText: "OK",
      });

      await fetchPembayaran();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal posting pembayaran.";

      Swal.fire("Gagal", message, "error");
    } finally {
      setPostingId(null);
    }
  }

  /* ============================================================
     BUKA FORM BARU
     ============================================================ */

  function handleNewPayment(): void {
    resetForm();
    setShowForm(true);
  }

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <Card title="Pembayaran Tagihan Armada">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Memuat data pembayaran Armada...</span>
        </div>
      </Card>
    );
  }

  /* ============================================================
     UI
     ============================================================ */

  return (
    <div className="space-y-6">
      <Card title="Pembayaran Tagihan Armada">
        <div className="space-y-6">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500 mt-1">
                Kelola pembayaran hutang Armada berdasarkan tagihan yang sudah
                ada.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>

              <Button
                variant="secondary"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>

              <Button onClick={handleNewPayment}>
                <Plus className="w-4 h-4 mr-2" />
                Pembayaran Baru
              </Button>
            </div>
          </div>

          {/* ==================================================
              FORM PEMBAYARAN
              ================================================== */}

          {showForm && (
            <div className="border rounded-xl p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-5">
                <CircleDollarSign className="w-5 h-5" />

                <h3 className="font-semibold">Form Pembayaran Tagihan</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ARMADA */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Armada
                  </label>

                  <select
                    value={form.armada_id}
                    onChange={(event) =>
                      updateForm("armada_id", event.target.value)
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

                {/* TANGGAL */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tanggal Pembayaran
                  </label>

                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(event) =>
                      updateForm("tanggal", event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                </div>

                {/* NO BUKTI */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    No Bukti
                  </label>

                  <input
                    type="text"
                    value={form.no_bukti}
                    onChange={(event) =>
                      updateForm("no_bukti", event.target.value)
                    }
                    placeholder="PAY-ARMADA-0001"
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                </div>

                {/* METODE */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Metode Pembayaran
                  </label>

                  <select
                    value={form.metode_pembayaran}
                    onChange={(event) =>
                      updateForm("metode_pembayaran", event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    <option value="KAS">KAS</option>
                    <option value="BANK">BANK</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>

                {/* COA KAS */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    COA Kas / Bank
                  </label>

                  <select
                    value={form.id_coa_kas}
                    onChange={(event) =>
                      updateForm("id_coa_kas", event.target.value)
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
                    Hanya COA kas/bank detail yang dapat digunakan.
                  </p>
                </div>

                {/* NOMINAL */}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nominal Pembayaran
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.nominal}
                    onChange={(event) =>
                      updateForm("nominal", event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                </div>

                {/* KETERANGAN */}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Keterangan
                  </label>

                  <textarea
                    value={form.keterangan}
                    onChange={(event) =>
                      updateForm("keterangan", event.target.value)
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">Total Tagihan</div>

                  <div className="text-lg font-bold mt-1">
                    {formatRupiah(totalTagihanSelected)}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">Sudah Dibayar</div>

                  <div className="text-lg font-bold mt-1">
                    {formatRupiah(totalPembayaranSelected)}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">Sisa Tagihan</div>

                  <div className="text-lg font-bold mt-1">
                    {formatRupiah(sisaTagihanSelected)}
                  </div>
                </div>
              </div>

              {nominalInput > 0 && (
                <div className="mt-4 rounded-xl border p-4 bg-white">
                  <div className="flex justify-between gap-4 text-sm">
                    <span>Setelah pembayaran</span>

                    <strong>{formatRupiah(sisaSetelahPembayaran)}</strong>
                  </div>
                </div>
              )}

              {/* ==================================================
                  ACTION
                  ================================================== */}

              <div className="flex justify-end gap-2 mt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Simpan DRAFT
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================
              TABEL PEMBAYARAN
              ================================================== */}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Tanggal</th>

                  <th className="p-2 border text-left">No Bukti</th>

                  <th className="p-2 border text-left">Armada</th>

                  <th className="p-2 border text-left">Metode</th>

                  <th className="p-2 border text-right">Nominal</th>

                  <th className="p-2 border text-left">COA Kas/Bank</th>

                  <th className="p-2 border text-center">Status</th>

                  <th className="p-2 border text-center">Jurnal</th>

                  <th className="p-2 border text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {pembayaranList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-gray-500 border"
                    >
                      Belum ada pembayaran tagihan Armada.
                    </td>
                  </tr>
                ) : (
                  pembayaranList.map((payment: PembayaranRow) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="p-2 border">
                        {formatTanggal(payment.tanggal)}
                      </td>

                      <td className="p-2 border font-medium">
                        {payment.no_bukti}
                      </td>

                      <td className="p-2 border">
                        {payment.armada
                          ? `${payment.armada.kode_transaksi} - ${payment.armada.no_polisi}`
                          : payment.armada_id}
                      </td>

                      <td className="p-2 border">
                        {payment.metode_pembayaran}
                      </td>

                      <td className="p-2 border text-right font-medium">
                        {formatRupiah(Number(payment.nominal))}
                      </td>

                      <td className="p-2 border">
                        {payment.coa_kas
                          ? `${payment.coa_kas.kode} - ${payment.coa_kas.nama}`
                          : "-"}
                      </td>

                      <td className="p-2 border text-center">
                        {payment.status === "POSTED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            POSTED
                          </span>
                        ) : payment.status === "CANCELLED" ? (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700">
                            DRAFT
                          </span>
                        )}
                      </td>

                      <td className="p-2 border text-center">
                        {payment.id_jurnal ?? "-"}
                      </td>

                      <td className="p-2 border text-center">
                        {payment.status === "DRAFT" && (
                          <Button
                            onClick={() => void handlePost(payment)}
                            disabled={postingId === payment.id}
                          >
                            {postingId === payment.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <WalletCards className="w-4 h-4 mr-2" />
                            )}
                            POSTING
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
