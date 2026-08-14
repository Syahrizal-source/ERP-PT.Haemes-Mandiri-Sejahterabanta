"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

import { ProyekPenerimaanSchema } from "@/lib/validators/penerimaanproyek";

// =====================================================
// TYPES
// =====================================================

type MetodePenerimaanProyek = "KAS" | "BANK";

type PenerimaanData = {
  id: string;
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: MetodePenerimaanProyek;
  bank?: string | null;
};

type FormState = {
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: MetodePenerimaanProyek;
  bank: string;
};

// =====================================================
// PAGE
// =====================================================

export default function EditPenerimaanPage() {
  const params = useParams<{
    id: string;
    penerimaanId: string;
  }>();

  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id;
  const penerimaanId = params.penerimaanId;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    id_tagihan: "",
    tanggal: "",
    jumlah: 0,
    metode: "BANK",
    bank: "",
  });

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setLoading(true);

        const res = await fetch(`/api/proyek/penerimaan/${penerimaanId}`, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal mengambil data penerimaan.";

          throw new Error(message);
        }

        const data = result as PenerimaanData;

        setForm({
          id_tagihan: data.id_tagihan,
          tanggal: data.tanggal,
          jumlah: Number(data.jumlah),
          metode: data.metode === "KAS" ? "KAS" : "BANK",
          bank: data.bank ?? "",
        });
      } catch (error: unknown) {
        showToast(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data penerimaan.",
          "error",
        );

        router.push(`/proyek/${proyekId}/penerimaan`);
      } finally {
        setLoading(false);
      }
    }

    if (penerimaanId) {
      void loadData();
    }
  }, [penerimaanId, proyekId, router, showToast]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // =====================================================
  // HANDLE METODE
  // =====================================================

  function handleMetodeChange(metode: MetodePenerimaanProyek): void {
    setForm((previous) => ({
      ...previous,
      metode,
      bank: metode === "BANK" ? previous.bank : "",
    }));
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(): Promise<void> {
    try {
      // -----------------------------------------------
      // VALIDASI DASAR
      // -----------------------------------------------

      if (!form.id_tagihan) {
        showToast("Tagihan penerimaan tidak ditemukan.", "error");
        return;
      }

      if (!form.tanggal) {
        showToast("Tanggal penerimaan wajib diisi.", "error");
        return;
      }

      if (!Number.isFinite(form.jumlah) || form.jumlah <= 0) {
        showToast("Jumlah penerimaan harus lebih besar dari 0.", "error");
        return;
      }

      if (form.metode === "BANK" && !form.bank.trim()) {
        showToast("Bank wajib diisi untuk metode BANK.", "error");
        return;
      }

      // -----------------------------------------------
      // PAYLOAD
      // -----------------------------------------------

      const payload = {
        id_tagihan: form.id_tagihan,
        tanggal: form.tanggal,
        jumlah: Number(form.jumlah),
        metode: form.metode,
        bank: form.metode === "BANK" ? form.bank.trim() : undefined,
      };

      // -----------------------------------------------
      // ZOD VALIDATION
      // -----------------------------------------------

      const parsed = ProyekPenerimaanSchema.safeParse(payload);

      if (!parsed.success) {
        const message =
          parsed.error.issues[0]?.message ?? "Data penerimaan tidak valid.";

        showToast(message, "error");
        return;
      }

      // -----------------------------------------------
      // SAVE
      // -----------------------------------------------

      setSaving(true);

      const res = await fetch(`/api/proyek/penerimaan/${penerimaanId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengupdate penerimaan.";

        throw new Error(message);
      }

      showToast("Penerimaan proyek berhasil diupdate.", "success");

      router.push(`/proyek/${proyekId}/penerimaan`);

      router.refresh();
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengupdate penerimaan proyek.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Penerimaan Proyek">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* =========================================
              ID TAGIHAN
          ========================================= */}

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium mb-1">ID Tagihan</label>

            <input
              type="text"
              value={form.id_tagihan}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100"
            />

            <p className="text-xs text-gray-500 mt-1">
              Tagihan tidak dapat dipindahkan saat mengedit penerimaan.
            </p>
          </div>

          {/* =========================================
              TANGGAL
          ========================================= */}

          <Input
            label="Tanggal Penerimaan"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* =========================================
              JUMLAH
          ========================================= */}

          <Input
            label="Jumlah Penerimaan"
            type="number"
            min={0}
            value={form.jumlah}
            disabled={saving}
            onChange={(event) =>
              handleChange("jumlah", Number(event.target.value))
            }
          />

          {/* =========================================
              METODE
          ========================================= */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Metode Pembayaran
            </label>

            <select
              className="w-full border rounded px-3 py-2"
              value={form.metode}
              disabled={saving}
              onChange={(event) =>
                handleMetodeChange(event.target.value as MetodePenerimaanProyek)
              }
            >
              <option value="KAS">KAS</option>

              <option value="BANK">BANK</option>
            </select>
          </div>

          {/* =========================================
              BANK
          ========================================= */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Rekening Bank
            </label>

            <select
              className="w-full border rounded px-3 py-2"
              value={form.bank}
              disabled={saving || form.metode !== "BANK"}
              onChange={(event) => handleChange("bank", event.target.value)}
            >
              <option value="">-- Pilih Bank --</option>

              <option value="BNI - 1918768145">BNI - 1918768145</option>

              <option value="BCA">BCA</option>

              <option value="MANDIRI">MANDIRI</option>

              <option value="Artha Graha">Artha Graha</option>
            </select>

            {form.metode === "KAS" && (
              <p className="text-xs text-gray-500 mt-1">
                Rekening bank tidak diperlukan untuk metode KAS.
              </p>
            )}
          </div>
        </div>

        {/* ===========================================
            ACTION
        =========================================== */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/penerimaan`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
