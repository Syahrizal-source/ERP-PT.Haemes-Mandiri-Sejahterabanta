"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================================================
   TYPES SESUAI DATABASE
========================================================= */

const progressSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(50, "Nomor bukti maksimal 50 karakter."),

  target_volume: z
    .number()
    .finite("Target volume tidak valid.")
    .min(0, "Target volume tidak boleh negatif."),

  realisasi_volume: z
    .number()
    .finite("Realisasi volume tidak valid.")
    .min(0, "Realisasi volume tidak boleh negatif."),

  satuan: z.enum(["m3", "m2", "km", "ton", "unit", "ha"]),

  nilai_progress: z
    .number()
    .finite("Nilai progress tidak valid.")
    .positive("Nilai progress harus lebih besar dari 0."),

  metode_pembayaran: z.enum([
    "KAS",
    "KAS_BESAR",
    "KAS_KECIL",
    "BANK",
    "HUTANG",
  ]),

  status: z.enum(["ON_PROGRESS", "SELESAI", "TERLAMBAT", "DIBATALKAN"]),

  periode: z.string().trim().max(30, "Periode maksimal 30 karakter."),

  lokasi: z.string().trim().max(500, "Lokasi maksimal 500 karakter."),

  pic: z.string().trim().max(200, "PIC maksimal 200 karakter."),

  keterangan: z.string().trim().nullable(),
});

type ProgressForm = {
  tanggal: string;
  no_bukti: string;

  target_volume: number;
  realisasi_volume: number;

  satuan: "m3" | "m2" | "km" | "ton" | "unit" | "ha";

  nilai_progress: number;

  metode_pembayaran: "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

  status: "ON_PROGRESS" | "SELESAI" | "TERLAMBAT" | "DIBATALKAN";

  periode: string;
  lokasi: string;
  pic: string;
  keterangan: string;
};

/* =========================================================
   PAGE
========================================================= */

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

    /*
     * Default tetap BANK seperti form sebelumnya.
     *
     * COA TIDAK ditentukan di sini.
     * postProgress() yang menentukan:
     * PROYEK / BANK
     */
    metode_pembayaran: "BANK",

    status: "ON_PROGRESS",

    periode: "",

    lokasi: "",

    pic: "",

    keterangan: "",
  });

  /* =======================================================
     CHANGE HANDLER
  ======================================================= */

  function handleChange<K extends keyof ProgressForm>(
    field: K,
    value: ProgressForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(): Promise<void> {
    const parsed = progressSchema.safeParse(form);

    if (!parsed.success) {
      showToast(
        parsed.error.issues[0]?.message ?? "Data progress tidak valid.",
        "error",
      );

      return;
    }

    /*
     * Validasi tambahan sebelum POST.
     *
     * Database mengizinkan target/realisasi >= 0,
     * sedangkan nilai_progress untuk transaksi yang
     * langsung diposting ke jurnal harus > 0.
     */

    if (form.nilai_progress <= 0) {
      showToast("Nilai progress harus lebih besar dari 0.", "error");

      return;
    }

    if (!form.no_bukti.trim()) {
      showToast("Nomor bukti wajib diisi.", "error");

      return;
    }

    /*
     * no_bukti pada database:
     *
     * NOT NULL
     * UNIQUE
     *
     * Jadi jangan membuat no_bukti otomatis di frontend.
     * User harus memasukkan nomor bukti yang unik.
     */

    setSaving(true);

    try {
      const response = await fetch("/api/proyek/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: proyekId,

          tanggal: form.tanggal,

          no_bukti: form.no_bukti.trim(),

          target_volume: form.target_volume,

          realisasi_volume: form.realisasi_volume,

          satuan: form.satuan,

          nilai_progress: form.nilai_progress,

          metode_pembayaran: form.metode_pembayaran,

          status: form.status,

          periode: form.periode.trim() || null,

          lokasi: form.lokasi.trim() || null,

          pic: form.pic.trim() || null,

          keterangan: form.keterangan.trim() || null,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menambah progress.";

        throw new Error(message);
      }

      showToast("Progress berhasil ditambahkan dan diposting.", "success");

      router.push(`/proyek/${proyekId}/progress`);

      router.refresh();
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Gagal menambah progress.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Progress Proyek">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* TANGGAL */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* NO BUKTI */}

          <Input
            label="No Bukti"
            value={form.no_bukti}
            placeholder="PRG-20260806-001"
            onChange={(e) => handleChange("no_bukti", e.target.value)}
          />

          {/* NILAI PROGRESS */}

          <Input
            label="Nilai Progress"
            type="number"
            min="0"
            step="0.01"
            value={form.nilai_progress}
            onChange={(e) =>
              handleChange("nilai_progress", Number(e.target.value))
            }
          />

          {/* TARGET */}

          <Input
            label="Target Volume"
            type="number"
            min="0"
            step="0.01"
            value={form.target_volume}
            onChange={(e) =>
              handleChange("target_volume", Number(e.target.value))
            }
          />

          {/* REALISASI */}

          <Input
            label="Realisasi Volume"
            type="number"
            min="0"
            step="0.01"
            value={form.realisasi_volume}
            onChange={(e) =>
              handleChange("realisasi_volume", Number(e.target.value))
            }
          />

          {/* SATUAN */}

          <div>
            <label className="mb-1 block text-sm font-medium">Satuan</label>

            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.satuan}
              onChange={(e) =>
                handleChange("satuan", e.target.value as ProgressForm["satuan"])
              }
            >
              <option value="m3">m³</option>
              <option value="m2">m²</option>
              <option value="km">KM</option>
              <option value="ton">Ton</option>
              <option value="unit">Unit</option>
              <option value="ha">Ha</option>
            </select>
          </div>

          {/* METODE PEMBAYARAN */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.metode_pembayaran}
              onChange={(e) =>
                handleChange(
                  "metode_pembayaran",
                  e.target.value as ProgressForm["metode_pembayaran"],
                )
              }
            >
              <option value="KAS">Kas Proyek</option>

              <option value="KAS_BESAR">Kas Besar</option>

              <option value="KAS_KECIL">Kas Kecil</option>

              <option value="BANK">Bank</option>

              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          {/* STATUS */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Status Progress
            </label>

            <select
              className="w-full rounded-md border border-gray-300 p-2"
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

          {/* PERIODE */}

          <Input
            label="Periode"
            placeholder="Agustus 2026"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          {/* PIC */}

          <Input
            label="PIC"
            value={form.pic}
            onChange={(e) => handleChange("pic", e.target.value)}
          />

          {/* LOKASI */}

          <Input
            label="Lokasi"
            value={form.lokasi}
            onChange={(e) => handleChange("lokasi", e.target.value)}
          />

          {/* KETERANGAN */}

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* =================================================
            ACTION
        ================================================== */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/progress`)}
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
                Simpan & Posting
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
