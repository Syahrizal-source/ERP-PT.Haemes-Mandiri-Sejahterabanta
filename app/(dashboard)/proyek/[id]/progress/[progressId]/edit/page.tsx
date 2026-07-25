"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/**
 * ZOD SCHEMA (ANTI MINUS & KONSISTEN)
 */
const progressSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  target_volume: z.number().min(0, "Target tidak boleh minus"),
  realisasi_volume: z.number().min(0, "Realisasi tidak boleh minus"),
  keterangan: z.string().optional(),
});

type ProgressForm = z.infer<typeof progressSchema>;

export default function EditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const progressId = params.progressId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<ProgressForm>({
    tanggal: "",
    target_volume: 0,
    realisasi_volume: 0,
    keterangan: "",
  });

  /**
   * FETCH DETAIL PROGRESS
   */
  useEffect(() => {
    async function fetchDetail(): Promise<void> {
      const res = await fetch(`/api/proyek/progress?id=${progressId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data progress", "error");
        setLoading(false);
        return;
      }

      const data: {
        tanggal: string;
        target_volume: number;
        realisasi_volume: number;
        keterangan: string | null;
      } = await res.json();

      setForm({
        tanggal: data.tanggal,
        target_volume: data.target_volume,
        realisasi_volume: data.realisasi_volume,
        keterangan: data.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchDetail();
  }, [progressId, showToast]);

  function handleChange<K extends keyof ProgressForm>(
    field: K,
    value: ProgressForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /**
   * SUBMIT UPDATE
   */
  async function handleSubmit(): Promise<void> {
    const parsed = progressSchema.safeParse(form);

    if (!parsed.success) {
      showToast(parsed.error.issues[0].message, "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/progress/${progressId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update progress", "error");
      return;
    }

    showToast("Progress berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/progress`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Progress Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Target Volume"
            type="number"
            value={form.target_volume}
            onChange={(e) =>
              handleChange("target_volume", Number(e.target.value))
            }
          />

          <Input
            label="Realisasi Volume"
            type="number"
            value={form.realisasi_volume}
            onChange={(e) =>
              handleChange("realisasi_volume", Number(e.target.value))
            }
          />

          <Input
            label="Keterangan"
            value={form.keterangan ?? ""}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/progress`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
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
