"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "BANK" | "HUTANG";
type StatusSubkon = "AKTIF" | "SELESAI" | "DIBATALKAN";
type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};
type SubkonForm = {
  tanggal: string;
  id_kategori: number;
  nama_vendor: string;
  pekerjaan: string;
  nilai_kontrak: number;
  metode_pembayaran: MetodePembayaran;
  periode: string;
  status: StatusSubkon;
  keterangan: string;
};
type SubkonResponse = {
  id: string;
  id_proyek: string;
  id_kategori: number | null;
  no_bukti: string | null;
  tanggal: string | null;
  nama_vendor: string | null;
  pekerjaan: string | null;
  nilai_kontrak: number | string | null;
  metode_pembayaran: MetodePembayaran | null;
  periode: string | null;
  status: StatusSubkon | null;
  id_jurnal: number | null;
  created_by: string | null;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
  kategori?: KategoriBiayaProyek | null;
};
function toSafeNumber(value: unknown, fallback = 0): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}
/* =========================================================
   VALIDATION
   ========================================================= */
const subkonEditSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  id_kategori: z.number().int().positive("Kategori subkon wajib dipilih."),
  nama_vendor: z
    .string()
    .trim()
    .min(1, "Nama vendor wajib diisi.")
    .max(150, "Nama vendor maksimal 150 karakter."),
  pekerjaan: z
    .string()
    .trim()
    .min(1, "Pekerjaan wajib diisi.")
    .max(200, "Pekerjaan maksimal 200 karakter."),
  nilai_kontrak: z.number().positive("Nilai kontrak harus lebih besar dari 0."),
  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),
  periode: z.string().trim().max(50, "Periode maksimal 50 karakter."),
  status: z.enum(["AKTIF", "SELESAI", "DIBATALKAN"]),
  keterangan: z.string().trim().max(500, "Keterangan maksimal 500 karakter."),
});

export default function EditSubkonPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const subkonId = params.subkonId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [kategoriList, setKategoriList] = useState<KategoriBiayaProyek[]>([]);

  const [form, setForm] = useState<SubkonForm>({
    tanggal: "",
    id_kategori: 0,
    nama_vendor: "",
    pekerjaan: "",
    nilai_kontrak: 0,
    metode_pembayaran: "BANK",
    periode: "",
    status: "AKTIF",
    keterangan: "",
  });

  const [idJurnal, setIdJurnal] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDetail(): Promise<void> {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/proyek/subkon?id=${encodeURIComponent(subkonId)}`,
          {
            cache: "no-store",
          },
        );

        const result: unknown = await res.json();

        if (!res.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal mengambil data subkon.";

          throw new Error(message);
        }

        const data = result as SubkonResponse;

        setForm({
          tanggal: data.tanggal ?? "",
          id_kategori: toSafeNumber(data.id_kategori),
          nama_vendor: data.nama_vendor ?? "",
          pekerjaan: data.pekerjaan ?? "",
          nilai_kontrak: toSafeNumber(data.nilai_kontrak),
          metode_pembayaran: data.metode_pembayaran ?? "BANK",
          periode: data.periode ?? "",
          status: data.status ?? "AKTIF",
          keterangan: data.keterangan ?? "",
        });

        setIdJurnal(
          data.id_jurnal === null || data.id_jurnal === undefined
            ? null
            : toSafeNumber(data.id_jurnal),
        );

        /*
         * Jika detail sudah membawa kategori,
         * langsung gunakan sebagai fallback.
         */
        if (data.kategori) {
          setKategoriList([data.kategori]);
        }
      } catch (error: unknown) {
        console.error("FETCH DETAIL SUBKON ERROR:", error);

        showToast(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data subkon.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [subkonId, showToast]);
  /* =======================================================
   * LOAD KATEGORI
   * ======================================================= */

  useEffect(() => {
    async function loadKategori(): Promise<void> {
      try {
        const res = await fetch("/api/master/kategori-biaya-proyek", {
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          console.error("LOAD KATEGORI RESPONSE:", result);

          return;
        }

        if (!Array.isArray(result)) {
          console.error("FORMAT KATEGORI TIDAK VALID:", result);

          return;
        }

        const data = result as KategoriBiayaProyek[];

        const kategoriSubkon = data.filter(
          (item) => item.aktif && item.kode === "SUBKON",
        );

        /*
         * Jangan membuat halaman error kalau
         * kategori SUBKON tidak ditemukan.
         *
         * Kategori dari detail subkon tetap
         * dipertahankan sebagai fallback.
         */
        if (kategoriSubkon.length > 0) {
          setKategoriList((current) => {
            const merged = [...current, ...kategoriSubkon];

            const unique = merged.filter(
              (item, index, array) =>
                array.findIndex((x) => x.id === item.id) === index,
            );

            return unique;
          });
        }
      } catch (error: unknown) {
        /*
         * Tidak perlu showToast error di sini.
         * Detail Subkon sudah cukup untuk menampilkan
         * kategori yang sedang digunakan.
         */
        console.error("LOAD KATEGORI SUBKON ERROR:", error);
      }
    }

    void loadKategori();
  }, []);

  function handleChange<K extends keyof SubkonForm>(
    field: K,
    value: SubkonForm[K],
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
    const parsed = subkonEditSchema.safeParse(form);

    if (!parsed.success) {
      showToast(
        parsed.error.issues[0]?.message ?? "Data subkon tidak valid.",
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id_proyek: proyekId,
        ...parsed.data,
      };

      const res = await fetch(`/api/proyek/subkon/${subkonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal update subkon.";

        showToast(message, "error");
        return;
      }

      showToast("Subkon berhasil diupdate.", "success");

      router.push(`/proyek/${proyekId}/subkon`);

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE SUBKON ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat update subkon.",
        "error",
      );
    } finally {
      setSaving(false);
    }
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
      <Card title="Edit Subkon Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            readOnly={idJurnal !== null}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Nama Vendor"
            value={form.nama_vendor}
            onChange={(e) => handleChange("nama_vendor", e.target.value)}
          />
          <Input
            label="Pekerjaan"
            value={form.pekerjaan}
            onChange={(e) => handleChange("pekerjaan", e.target.value)}
          />

          <Input
            label="Nilai Kontrak"
            type="number"
            value={Number.isFinite(form.nilai_kontrak) ? form.nilai_kontrak : 0}
            readOnly={idJurnal !== null}
            onChange={(e) => {
              const value = e.target.value;
              handleChange(
                "nilai_kontrak",
                value === "" ? 0 : toSafeNumber(value),
              );
            }}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Kategori</label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              disabled={idJurnal !== null}
              onChange={(e) =>
                handleChange("id_kategori", Number(e.target.value))
              }
            >
              <option value={0}>Pilih</option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          </div>

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
                  e.target.value as SubkonForm["metode_pembayaran"],
                )
              }
            >
              <option value="KAS">Kas Proyek</option>
              <option value="BANK">BNI - 1918768145</option>
              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          <Input
            label="Periode"
            value={form.periode ?? ""}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              className="w-full rounded-md border p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as StatusSubkon)
              }
            >
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <Input
            label="Keterangan"
            value={form.keterangan ?? ""}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/subkon`)}
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
