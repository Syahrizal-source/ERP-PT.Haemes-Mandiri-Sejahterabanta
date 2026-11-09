"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================================================
   VALIDASI EDIT
   ========================================================= */

const progressEditSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  target_volume: z
    .number()
    .finite("Target volume tidak valid.")
    .min(0, "Target volume tidak boleh negatif."),

  realisasi_volume: z
    .number()
    .finite("Realisasi volume tidak valid.")
    .min(0, "Realisasi volume tidak boleh negatif."),

  keterangan: z.string().trim().nullable(),
});

type ProgressEditForm = z.infer<typeof progressEditSchema>;

type ProgressDetailResponse = {
  id: string;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;

  target_volume: number;
  realisasi_volume: number;

  satuan: "m3" | "m2" | "km" | "ton" | "unit" | "ha";

  nilai_progress: number;

  status: "ON_PROGRESS" | "SELESAI" | "TERLAMBAT" | "DIBATALKAN";

  periode: string | null;
  lokasi: string | null;
  pic: string | null;

  metode_pembayaran: "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

  keterangan: string | null;

  id_jurnal: number | null;

  created_at?: string;
  updated_at?: string;
};

export default function EditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const progressId = params.progressId as string;

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [posted, setPosted] = useState<boolean>(false);

  const [detail, setDetail] = useState<ProgressDetailResponse | null>(null);

  const [form, setForm] = useState<ProgressEditForm>({
    tanggal: "",
    target_volume: 0,
    realisasi_volume: 0,
    keterangan: "",
  });

  /* =======================================================
     FETCH DETAIL
  ======================================================= */

  useEffect(() => {
    async function fetchDetail(): Promise<void> {
      try {
        setLoading(true);

        /*
         * PENTING:
         * gunakan route [progressId]
         */
        const response = await fetch(`/api/proyek/progress/${progressId}`);

        const result: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal mengambil data progress.";

          throw new Error(message);
        }

        const data = result as ProgressDetailResponse;

        /*
         * Pastikan progress memang milik
         * proyek yang sedang dibuka.
         */
        if (data.id_proyek !== proyekId) {
          throw new Error("Progress tidak sesuai dengan proyek.");
        }

        setDetail(data);

        setForm({
          tanggal: data.tanggal,
          target_volume: Number(data.target_volume),
          realisasi_volume: Number(data.realisasi_volume),
          keterangan: data.keterangan ?? "",
        });

        /*
         * Kalau sudah punya jurnal,
         * berarti Posted.
         */
        setPosted(data.id_jurnal !== null);
      } catch (error: unknown) {
        showToast(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data progress.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [progressId, proyekId, showToast]);

  /* =======================================================
     HANDLE CHANGE
  ======================================================= */

  function handleChange<K extends keyof ProgressEditForm>(
    field: K,
    value: ProgressEditForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =======================================================
     SUBMIT UPDATE
  ======================================================= */

  async function handleSubmit(): Promise<void> {
    /*
     * Pengaman frontend.
     *
     * Backend tetap WAJIB melakukan pengecekan
     * id_jurnal.
     */
    if (posted) {
      showToast("Progress sudah Posted dan tidak dapat diubah.", "error");

      return;
    }

    const parsed = progressEditSchema.safeParse({
      ...form,
      keterangan: form.keterangan?.trim() || null,
    });

    if (!parsed.success) {
      showToast(
        parsed.error.issues[0]?.message ?? "Data progress tidak valid.",
        "error",
      );

      return;
    }

    if (!detail) {
      showToast("Data progress belum tersedia.", "error");

      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/proyek/progress/${progressId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal update progress.";

        throw new Error(message);
      }

      showToast("Progress berhasil diupdate.", "success");

      router.push(`/proyek/${proyekId}/progress`);

      router.refresh();
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Gagal update progress.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  /* =======================================================
     DATA TIDAK ADA
  ======================================================= */

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Progress Proyek">
          <div className="py-6 text-center text-gray-500">
            Data progress tidak ditemukan.
          </div>

          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/progress`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Card>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Progress Proyek">
        {/* =================================================
            STATUS POSTED
        ================================================= */}

        {posted && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="font-semibold text-green-700">
              Progress sudah Posted
            </div>

            <div className="mt-1 text-sm text-green-700">
              No Bukti: <span className="font-mono">{detail.no_bukti}</span>
            </div>

            <div className="text-sm text-green-700">
              ID Jurnal: {detail.id_jurnal}
            </div>

            <div className="mt-2 text-sm text-green-700">
              Jurnal Posted tidak boleh diubah. Silakan gunakan mekanisme
              koreksi jurnal jika diperlukan.
            </div>
          </div>
        )}

        {/* =================================================
            INFO TRANSAKSI
        ================================================= */}

        <div className="mb-5 grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-gray-500">No Bukti</div>

            <div className="font-mono font-semibold">{detail.no_bukti}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Satuan</div>

            <div className="font-semibold">{detail.satuan}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Metode Pembayaran</div>

            <div className="font-semibold">{detail.metode_pembayaran}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Nilai Progress</div>

            <div className="font-semibold">
              Rp {Number(detail.nilai_progress).toLocaleString("id-ID")}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Status</div>

            <div className="font-semibold">{detail.status}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Progress</div>

            <div className="font-semibold">
              {detail.id_jurnal !== null ? "POSTED" : "DRAFT"}
            </div>
          </div>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={posted || saving}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Target Volume"
            type="number"
            min="0"
            step="0.01"
            value={form.target_volume}
            disabled={posted || saving}
            onChange={(e) =>
              handleChange("target_volume", Number(e.target.value))
            }
          />

          <Input
            label="Realisasi Volume"
            type="number"
            min="0"
            step="0.01"
            value={form.realisasi_volume}
            disabled={posted || saving}
            onChange={(e) =>
              handleChange("realisasi_volume", Number(e.target.value))
            }
          />

          <Input label="Satuan" value={detail.satuan} readOnly />

          <Input
            label="Nilai Progress"
            value={`Rp ${Number(detail.nilai_progress).toLocaleString(
              "id-ID",
            )}`}
            readOnly
          />

          <Input
            label="Metode Pembayaran"
            value={detail.metode_pembayaran}
            readOnly
          />

          <Input label="Status" value={detail.status} readOnly />

          <Input label="Periode" value={detail.periode ?? ""} readOnly />

          <Input label="PIC" value={detail.pic ?? ""} readOnly />

          <Input label="Lokasi" value={detail.lokasi ?? ""} readOnly />

          <Input
            label="Keterangan"
            value={form.keterangan ?? ""}
            disabled={posted || saving}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* =================================================
            ACTION
        ================================================= */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/progress`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving || posted}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : posted ? (
              "Sudah Posted"
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
