"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

const progressSchema = z.object({
  tanggal: z.string().min(1),
  no_bukti: z.string().trim().min(1),
  target_volume: z.number().min(0),
  realisasi_volume: z.number().min(0),
  nilai_progress: z.number().min(0),
  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),
  status: z.enum(["ON_PROGRESS", "SELESAI", "TERLAMBAT", "DIBATALKAN"]),
  periode: z.string().trim(),
  lokasi: z.string().trim(),
  pic: z.string().trim(),
  satuan: z.string().trim(),
  keterangan: z.string().optional(),
});

type ProgressForm = {
  tanggal: string;
  no_bukti: string;
  target_volume: number;
  realisasi_volume: number;
  satuan: string;
  nilai_progress: number;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  status: "ON_PROGRESS" | "SELESAI" | "TERLAMBAT" | "DIBATALKAN";
  periode: string;
  lokasi: string;
  pic: string;
  keterangan: string;
};

export default function CreateProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<ProgressForm>({
    tanggal: new Date().toISOString().slice(0, 10),
    no_bukti: "",
    target_volume: 0,
    realisasi_volume: 0,
    satuan: "m3",
    nilai_progress: 0,
    metode_pembayaran: "BANK",
    status: "ON_PROGRESS",
    periode: "",
    lokasi: "",
    pic: "",
    keterangan: "",
  });

  function handleChange<K extends keyof ProgressForm>(
    field: K,
    value: ProgressForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    const parsed = progressSchema.safeParse(form);

    if (!parsed.success) {
      showToast(parsed.error.issues[0].message, "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_proyek: proyekId,
        tanggal: form.tanggal,
        no_bukti: form.no_bukti,
        target_volume: form.target_volume,
        realisasi_volume: form.realisasi_volume,
        satuan: form.satuan,
        nilai_progress: form.nilai_progress,
        metode_pembayaran: form.metode_pembayaran,
        status: form.status,
        periode: form.periode,
        lokasi: form.lokasi,
        pic: form.pic,
        keterangan: form.keterangan,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menambah progress", "error");
      return;
    }

    showToast("Progress berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/progress`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Progress Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="No Bukti"
            value={form.no_bukti}
            placeholder="PRG-20260806-001"
            onChange={(e) => handleChange("no_bukti", e.target.value)}
          />

          <Input
            label="Nilai Progress"
            type="number"
            value={form.nilai_progress}
            onChange={(e) =>
              handleChange("nilai_progress", Number(e.target.value))
            }
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
          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>
            <select
              className="w-full rounded-md border p-2"
              value={form.metode_pembayaran}
              onChange={(e) =>
                handleChange(
                  "metode_pembayaran",
                  e.target.value as ProgressForm["metode_pembayaran"],
                )
              }
            >
              <option value="KAS">Kas Proyek</option>
              <option value="BANK">BNI - 1918768145</option>
              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Progress</label>
            <select
              className="w-full rounded-md border p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as ProgressForm["status"])
              }
            >
              <option value="ON_PROGRESS">ON PROGRESS</option>
              <option value="SELESAI">SELESAI</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <Input
            label="Periode"
            placeholder="Agustus 2026"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          <Input
            label="PIC"
            value={form.pic}
            onChange={(e) => handleChange("pic", e.target.value)}
          />

          <Input
            label="Lokasi"
            value={form.lokasi}
            onChange={(e) => handleChange("lokasi", e.target.value)}
          />

          <Input
            label="Satuan"
            value={form.satuan}
            onChange={(e) => handleChange("satuan", e.target.value)}
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
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
