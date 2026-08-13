"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type MaterialForm = {
  tanggal: string;
  id_kategori: number;
  qty: number;
  satuan: string;
  harga: number;
  gudang: string;
  supplier: string;
  metode_pembayaran: MetodePembayaran;
  keterangan: string;
};

type MaterialResponse = {
  id: string;
  id_proyek: string;
  tanggal: string;
  id_kategori: number;
  qty: number;
  satuan: string | null;
  harga: number;
  total: number;
  supplier: string | null;
  gudang: string | null;
  metode_pembayaran: MetodePembayaran;
  keterangan: string | null;
  id_jurnal: number | null;
  no_bukti: string | null;

  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "MATERIAL" | "BIAYA";
  };
};

type KategoriMaterial = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

type ApiError = {
  error?: string;
  message?: string;
};

function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) {
    return "Rp 0";
  }

  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function EditMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const materialId =
    typeof params.materialId === "string"
      ? params.materialId
      : Array.isArray(params.materialId)
        ? params.materialId[0]
        : "";

  const [form, setForm] = useState<MaterialForm | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [kategoriLoading, setKategoriLoading] = useState<boolean>(true);

  const [kategoriList, setKategoriList] = useState<KategoriMaterial[]>([]);

  function handleChange<K extends keyof MaterialForm>(
    key: K,
    value: MaterialForm[K],
  ): void {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  async function fetchDetail(): Promise<void> {
    if (!proyekId || !materialId) {
      showToast("ID proyek atau material tidak valid.", "error");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/proyek/material?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;

        showToast(errorData.error ?? "Gagal mengambil data material.", "error");

        return;
      }

      const data = (await response.json()) as MaterialResponse[];

      const found = data.find((item) => item.id === materialId);

      if (!found) {
        showToast("Data material tidak ditemukan.", "error");
        return;
      }

      setForm({
        tanggal: found.tanggal,
        id_kategori: found.id_kategori,
        qty: Number(found.qty),
        satuan: found.satuan ?? "",
        harga: Number(found.harga),
        gudang: found.gudang ?? "",
        supplier: found.supplier ?? "",
        metode_pembayaran: found.metode_pembayaran,
        keterangan: found.keterangan ?? "",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil data material.";

      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadKategori(): Promise<void> {
    setKategoriLoading(true);

    try {
      const response = await fetch("/api/master/kategori-biaya-proyek", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as KategoriMaterial[];

      setKategoriList(
        data.filter((item) => item.jenis === "MATERIAL" && item.aktif === true),
      );
    } catch {
      showToast("Gagal mengambil kategori material.", "error");
    } finally {
      setKategoriLoading(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!form) {
      return;
    }

    if (!proyekId || !materialId) {
      showToast("ID proyek atau material tidak valid.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (form.id_kategori <= 0) {
      showToast("Kategori material wajib dipilih.", "error");
      return;
    }

    if (!Number.isFinite(form.qty) || form.qty <= 0) {
      showToast("Qty harus lebih besar dari 0.", "error");
      return;
    }

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.harga) || form.harga <= 0) {
      showToast("Harga harus lebih besar dari 0.", "error");
      return;
    }

    if (!form.gudang.trim()) {
      showToast("Gudang wajib diisi.", "error");
      return;
    }

    if (!form.supplier.trim()) {
      showToast("Supplier wajib diisi.", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/proyek/material/${encodeURIComponent(materialId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tanggal: form.tanggal,
            id_kategori: form.id_kategori,
            qty: form.qty,
            satuan: form.satuan.trim(),
            harga: form.harga,
            gudang: form.gudang.trim(),
            supplier: form.supplier.trim(),
            metode_pembayaran: form.metode_pembayaran,
            keterangan: form.keterangan.trim() || null,
          }),
        },
      );

      const result = (await response.json()) as ApiError & {
        success?: boolean;
        data?: unknown;
      };

      if (!response.ok) {
        showToast(
          result.error ?? result.message ?? "Gagal memperbarui material.",
          "error",
        );
        return;
      }

      showToast("Material berhasil diperbarui.", "success");

      router.push(`/proyek/${proyekId}/material`);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal memperbarui material.";

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadKategori();
  }, []);

  useEffect(() => {
    void fetchDetail();
  }, [proyekId, materialId]);

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  const total = form.qty * form.harga;

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Material Proyek">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Material</label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              disabled={saving || kategoriLoading}
              onChange={(event) =>
                handleChange("id_kategori", Number(event.target.value))
              }
            >
              <option value={0}>
                {kategoriLoading ? "Memuat material..." : "Pilih Material"}
              </option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode} - {item.nama}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Qty"
            type="number"
            value={form.qty}
            disabled={saving}
            onChange={(event) =>
              handleChange("qty", Number(event.target.value))
            }
          />

          <Input
            label="Satuan"
            value={form.satuan}
            disabled={saving}
            onChange={(event) => handleChange("satuan", event.target.value)}
          />

          <Input
            label="Supplier"
            value={form.supplier}
            disabled={saving}
            onChange={(event) => handleChange("supplier", event.target.value)}
          />

          <Input
            label="Gudang"
            value={form.gudang}
            disabled={saving}
            onChange={(event) => handleChange("gudang", event.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.metode_pembayaran}
              disabled={saving}
              onChange={(event) =>
                handleChange(
                  "metode_pembayaran",
                  event.target.value as MetodePembayaran,
                )
              }
            >
              <option value="KAS_BESAR">Kas Besar - 1101.03.01</option>

              <option value="KAS_KECIL">Kas Kecil - 1101.03.02</option>

              <option value="KAS">Kas Proyek - 11030</option>

              <option value="BANK">BNI - 1014</option>

              <option value="HUTANG">Hutang Proyek - 21010</option>
            </select>
          </div>

          <Input
            label="Harga Satuan"
            type="number"
            value={form.harga}
            disabled={saving}
            onChange={(event) =>
              handleChange("harga", Number(event.target.value))
            }
          />

          <Input label="Total" value={formatRupiah(total)} readOnly />

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Keterangan</label>

            <textarea
              className="w-full rounded-md border p-2"
              value={form.keterangan}
              disabled={saving}
              rows={4}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-semibold">Akun Pembayaran</p>

          <p className="mt-1 text-sm text-gray-600">
            {form.metode_pembayaran === "KAS_BESAR" && "Kas Besar — 1101.03.01"}

            {form.metode_pembayaran === "KAS_KECIL" && "Kas Kecil — 1101.03.02"}

            {form.metode_pembayaran === "KAS" && "Kas Proyek — 11030"}

            {form.metode_pembayaran === "BANK" && "BNI - 1918768145 — 1014"}

            {form.metode_pembayaran === "HUTANG" && "Hutang Proyek — 21010"}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/material`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={() => void handleSubmit()} disabled={saving}>
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
