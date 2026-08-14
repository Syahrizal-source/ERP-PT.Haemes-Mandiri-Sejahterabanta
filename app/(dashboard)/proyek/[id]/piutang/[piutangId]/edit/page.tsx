"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

import { piutangProyekSchema } from "@/lib/validators/piutang-proyek";

// =====================================================
// STATUS
// =====================================================

type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

// =====================================================
// DATA PIUTANG
// =====================================================

type PiutangData = {
  id_piutang_proyek: number;
  id_proyek: string;
  id_tagihan: string | null;

  tanggal: string;
  customer: string;
  tanggal_pembayaran: string | null;

  nilai_piutang: number;
  penerimaan: number;
  saldo: number;

  keterangan: string | null;

  status: StatusPiutangProyek;

  is_posted: boolean;
  id_jurnal: number | null;
};

// =====================================================
// FORM STATE
// =====================================================

type FormState = {
  tanggal: string;
  customer: string;
  tanggal_pembayaran: string;

  nilai_piutang: number;
  penerimaan: number;

  keterangan: string;

  status: StatusPiutangProyek;
};

// =====================================================
// API ERROR
// =====================================================

type ApiErrorResponse = {
  error?: string;
};

// =====================================================
// FORMAT RUPIAH
// =====================================================

function formatRupiah(value: number): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

// =====================================================
// PAGE
// =====================================================

export default function EditPiutangPage() {
  const params = useParams<{
    id: string;
    piutangId: string;
  }>();

  const router = useRouter();

  const { showToast } = useToast();

  const proyekId = params.id;
  const piutangId = params.piutangId;

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [piutang, setPiutang] = useState<PiutangData | null>(null);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    customer: "",
    tanggal_pembayaran: "",
    nilai_piutang: 0,
    penerimaan: 0,
    keterangan: "",
    status: "Unpaid (Menunggu Pembayaran)",
  });

  // ===================================================
  // LOAD DATA
  // ===================================================

  useEffect(() => {
    async function loadData(): Promise<void> {
      if (!piutangId) {
        showToast("ID piutang tidak ditemukan.", "error");

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`/api/proyek/piutang/${piutangId}`, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          const errorResult = result as ApiErrorResponse;

          throw new Error(errorResult.error ?? "Gagal mengambil data piutang.");
        }

        const data = result as PiutangData;

        setPiutang(data);

        setForm({
          tanggal: data.tanggal,

          customer: data.customer,

          tanggal_pembayaran: data.tanggal_pembayaran ?? "",

          nilai_piutang: Number(data.nilai_piutang),

          penerimaan: Number(data.penerimaan),

          keterangan: data.keterangan ?? "",

          status: data.status,
        });
      } catch (error: unknown) {
        console.error("LOAD PIUTANG ERROR:", error);

        showToast(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data piutang.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [piutangId, showToast]);

  // ===================================================
  // HANDLE CHANGE
  // ===================================================

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((previous) => {
      const updated: FormState = {
        ...previous,
        [field]: value,
      };

      const nilaiPiutang = Number(updated.nilai_piutang);

      const penerimaan = Number(updated.penerimaan);

      const saldo = nilaiPiutang - penerimaan;

      if (!Number.isFinite(penerimaan) || penerimaan < 0) {
        updated.status = "Unpaid (Menunggu Pembayaran)";

        return updated;
      }

      if (saldo === 0) {
        updated.status = "Paid (Pembayaran Penuh/ Lunas)";
      } else if (penerimaan > 0) {
        updated.status = "Partial (Pembayaran Sebagian)";
      } else {
        updated.status = "Unpaid (Menunggu Pembayaran)";
      }

      return updated;
    });
  }

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleSubmit(): Promise<void> {
    if (!piutang) {
      showToast("Data piutang belum tersedia.", "error");

      return;
    }

    const nilaiPiutang = Number(form.nilai_piutang);

    const penerimaan = Number(form.penerimaan);

    // =================================================
    // ANTI MINUS
    // =================================================

    if (!Number.isFinite(penerimaan) || penerimaan < 0) {
      showToast("Penerimaan tidak boleh minus.", "error");

      return;
    }

    if (penerimaan > nilaiPiutang) {
      showToast("Penerimaan tidak boleh melebihi nilai piutang.", "error");

      return;
    }

    if (form.customer.trim().length < 2) {
      showToast("Customer wajib diisi.", "error");

      return;
    }

    // =================================================
    // STATUS OTOMATIS
    // =================================================

    const saldo = nilaiPiutang - penerimaan;

    let status: StatusPiutangProyek;

    if (saldo === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (penerimaan > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    try {
      setSaving(true);

      // =================================================
      // ID TAGIHAN TIDAK DIUBAH
      //
      // Nilai piutang juga tetap mengikuti tagihan.
      // =================================================

      const payload = {
        id_proyek: piutang.id_proyek,

        id_tagihan: piutang.id_tagihan,

        tanggal: form.tanggal,

        customer: form.customer.trim(),

        tanggal_pembayaran: form.tanggal_pembayaran || null,

        nilai_piutang: nilaiPiutang,

        penerimaan,

        keterangan: form.keterangan.trim() || null,

        status,
      };

      // =================================================
      // VALIDASI CLIENT
      // =================================================

      const parsed = piutangProyekSchema.parse(payload);

      // =================================================
      // UPDATE
      // =================================================

      const res = await fetch(`/api/proyek/piutang/${piutangId}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(parsed),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        throw new Error(errorResult.error ?? "Gagal update piutang proyek.");
      }

      showToast("Piutang proyek berhasil diupdate.", "success");

      router.push(`/proyek/${proyekId}/piutang`);

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PIUTANG ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal update piutang proyek.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  // ===================================================
  // DATA NOT FOUND
  // ===================================================

  if (!piutang) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Piutang Proyek">
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">
              Data piutang proyek tidak ditemukan.
            </p>

            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => router.push(`/proyek/${proyekId}/piutang`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  const saldoPreview = Math.max(
    0,
    Number(form.nilai_piutang) - Number(form.penerimaan),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Edit Piutang Proyek">
        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">ID Tagihan</p>

              <p className="font-mono text-sm font-semibold">
                {piutang.id_tagihan ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">ID Proyek</p>

              <p className="font-mono text-sm font-semibold">
                {piutang.id_proyek}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Status Jurnal</p>

              <p className="text-sm font-semibold">
                {piutang.is_posted ? "POSTED" : "DRAFT"}
              </p>
            </div>
          </div>

          {piutang.id_jurnal !== null && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">ID Jurnal</p>

              <p className="font-semibold">#{piutang.id_jurnal}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          <Input
            label="Customer"
            value={form.customer}
            onChange={(event) => handleChange("customer", event.target.value)}
          />

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal_pembayaran}
            onChange={(event) =>
              handleChange("tanggal_pembayaran", event.target.value)
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Nilai Piutang
            </label>

            <input
              type="text"
              value={formatRupiah(form.nilai_piutang)}
              disabled
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Nilai mengikuti tagihan proyek dan tidak dapat diubah dari form
              ini.
            </p>
          </div>

          <Input
            label="Penerimaan"
            type="number"
            min={0}
            value={form.penerimaan}
            onChange={(event) =>
              handleChange("penerimaan", Number(event.target.value))
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Saldo</label>

            <input
              type="text"
              value={formatRupiah(saldoPreview)}
              disabled
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Saldo dihitung otomatis oleh database.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Status</label>

            <input
              type="text"
              value={form.status}
              disabled
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Status dihitung otomatis berdasarkan nilai penerimaan.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Keterangan</label>

            <textarea
              rows={4}
              value={form.keterangan}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
              placeholder="Keterangan piutang..."
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Nilai Piutang</p>

              <p className="text-lg font-semibold">
                {formatRupiah(form.nilai_piutang)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Penerimaan</p>

              <p className="text-lg font-semibold">
                {formatRupiah(form.penerimaan)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Saldo</p>

              <p className="text-lg font-semibold">
                {formatRupiah(saldoPreview)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/piutang`)}
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
