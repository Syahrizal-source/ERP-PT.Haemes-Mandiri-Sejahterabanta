"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

type FormState = {
  id_kategori: number;
  supplier: string;
  tanggal: string;
  nilai: number;
  jatuh_tempo: string;
  periode: string;
  keterangan: string;
};

export default function FormHutangPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [kategori, setKategori] = useState<KategoriBiayaProyek[]>([]);
  const [loadingKategori, setLoadingKategori] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    id_kategori: 0,
    supplier: "",
    tanggal: "",
    nilai: 0,
    jatuh_tempo: "",
    periode: "",
    keterangan: "",
  });

  /* ============================================================
     LOAD KATEGORI BIAYA
     ============================================================ */

  useEffect(() => {
    async function fetchKategori(): Promise<void> {
      try {
        setLoadingKategori(true);
        setError(null);

        const response = await fetch("/api/proyek/kategori-biaya", {
          method: "GET",
          cache: "no-store",
        });

        const result: {
          success: boolean;
          data: KategoriBiayaProyek[];
          error?: string;
        } = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ?? "Gagal mengambil kategori biaya proyek.",
          );
        }

        setKategori(result.data);
      } catch (e: unknown) {
        console.error("LOAD KATEGORI HUTANG:", e);

        setError(
          e instanceof Error
            ? e.message
            : "Gagal mengambil kategori biaya proyek.",
        );
      } finally {
        setLoadingKategori(false);
      }
    }

    void fetchKategori();
  }, []);

  /* ============================================================
     SUBMIT
     ============================================================ */

  async function handleSubmit(): Promise<void> {
    if (saving) return;

    setError(null);

    if (form.id_kategori <= 0) {
      setError("Kategori biaya wajib dipilih.");
      return;
    }

    if (!form.supplier.trim()) {
      setError("Supplier wajib diisi.");
      return;
    }

    if (!form.tanggal) {
      setError("Tanggal hutang wajib diisi.");
      return;
    }

    if (form.nilai <= 0) {
      setError("Nilai hutang harus lebih besar dari 0.");
      return;
    }

    if (form.jatuh_tempo && form.jatuh_tempo < form.tanggal) {
      setError("Jatuh tempo tidak boleh lebih kecil dari tanggal hutang.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/proyek/hutang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: id,
          id_kategori: form.id_kategori,
          supplier: form.supplier.trim(),
          tanggal: form.tanggal,
          nilai: form.nilai,
          jatuh_tempo: form.jatuh_tempo || null,
          periode: form.periode.trim() || null,
          keterangan: form.keterangan.trim() || null,
        }),
      });

      const result: {
        message?: string;
        error?: string;
        id?: string;
        no_bukti?: string;
        id_jurnal?: number;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal menyimpan hutang proyek.");
      }

      router.push(`/proyek/${id}/hutang`);
      router.refresh();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Gagal menyimpan hutang proyek.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Hutang Proyek">
        <div className="space-y-6">
          {/* ==================================================
              KATEGORI BIAYA
          ================================================== */}

          <div>
            <label
              htmlFor="id_kategori"
              className="mb-1 block text-sm font-medium"
            >
              Kategori Biaya
            </label>

            <select
              id="id_kategori"
              value={form.id_kategori > 0 ? String(form.id_kategori) : ""}
              disabled={loadingKategori || saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  id_kategori: Number(event.target.value),
                }))
              }
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">
                {loadingKategori
                  ? "Memuat kategori..."
                  : "Pilih kategori biaya"}
              </option>

              {kategori.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode} - {item.nama}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
              SUPPLIER
          ================================================== */}

          <Input
            label="Supplier"
            value={form.supplier}
            disabled={saving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                supplier: event.target.value,
              }))
            }
          />

          {/* ==================================================
              TANGGAL
          ================================================== */}

          <Input
            type="date"
            label="Tanggal Hutang"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                tanggal: event.target.value,
              }))
            }
          />

          {/* ==================================================
              NILAI
          ================================================== */}

          <Input
            type="number"
            label="Nilai Hutang"
            min={0}
            value={form.nilai}
            disabled={saving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                nilai: Number(event.target.value),
              }))
            }
          />

          {/* ==================================================
              JATUH TEMPO
          ================================================== */}

          <Input
            type="date"
            label="Jatuh Tempo"
            value={form.jatuh_tempo}
            disabled={saving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                jatuh_tempo: event.target.value,
              }))
            }
          />

          {/* ==================================================
              PERIODE
          ================================================== */}

          <Input
            label="Periode"
            placeholder="Contoh: Agustus 2026"
            value={form.periode}
            disabled={saving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                periode: event.target.value,
              }))
            }
          />

          {/* ==================================================
              KETERANGAN
          ================================================== */}

          <div>
            <label
              htmlFor="keterangan"
              className="mb-1 block text-sm font-medium"
            >
              Keterangan
            </label>

            <textarea
              id="keterangan"
              rows={4}
              disabled={saving}
              value={form.keterangan}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  keterangan: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2"
              placeholder="Keterangan hutang proyek..."
            />
          </div>

          {/* ==================================================
              INFO POSTING
          ================================================== */}

          <div className="rounded-md border p-4">
            <h3 className="font-semibold">Posting Otomatis</h3>

            <p className="mt-1 text-sm">
              Setelah disimpan, sistem akan membuat nomor bukti dan memposting
              jurnal hutang secara otomatis menggunakan COA mapping proyek yang
              telah ditetapkan.
            </p>

            <p className="mt-2 text-sm">
              COA tidak dipilih secara manual dari form. Sistem menggunakan
              mapping COA yang sudah dikonfigurasi di database.
            </p>

            {form.id_kategori > 0 && (
              <p className="mt-2 text-sm font-medium">
                Kategori:{" "}
                {kategori.find((item) => item.id === form.id_kategori)?.nama}
              </p>
            )}
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ==================================================
              ACTION
          ================================================== */}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => router.back()}
            >
              Kembali
            </Button>

            <Button
              disabled={saving || loadingKategori || form.id_kategori <= 0}
              onClick={handleSubmit}
            >
              {saving ? "Menyimpan & Posting..." : "Simpan & Posting"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
