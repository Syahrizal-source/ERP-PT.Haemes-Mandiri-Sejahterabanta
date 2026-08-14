"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type FormState = {
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

type KategoriMaterial = {
  id: number;
  kode: string;
  nama: string;
  jenis: "MATERIAL" | "BIAYA";
  aktif: boolean;
};

type KategoriResponse =
  | KategoriMaterial[]
  | {
      success: boolean;
      data: KategoriMaterial[];
      error?: string;
    };

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) {
    return "Rp 0";
  }

  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function TambahMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_kategori: 0,
    qty: 0,
    satuan: "",
    harga: 0,
    gudang: "",
    supplier: "",
    metode_pembayaran: "KAS_BESAR",
    keterangan: "",
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [loadingKategori, setLoadingKategori] = useState<boolean>(true);

  const [kategoriList, setKategoriList] = useState<KategoriMaterial[]>([]);

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadKategori(): Promise<void> {
    setLoadingKategori(true);

    try {
      const response = await fetch("/api/master/kategori-biaya-proyek", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as KategoriResponse;

      if (!response.ok) {
        const message =
          !Array.isArray(result) && result.error
            ? result.error
            : "Gagal mengambil kategori material.";

        showToast(message, "error");
        return;
      }

      const categories = Array.isArray(result) ? result : result.data;

      setKategoriList(
        categories.filter(
          (item) => item.jenis === "MATERIAL" && item.aktif === true,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil kategori material.";

      showToast(message, "error");
    } finally {
      setLoadingKategori(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
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

    if (!Number.isFinite(form.harga) || form.harga < 0) {
      showToast("Harga tidak boleh negatif.", "error");
      return;
    }

    if (form.harga <= 0) {
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

    const total = form.qty * form.harga;

    if (!Number.isFinite(total) || total <= 0) {
      showToast("Total material tidak valid.", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/proyek/material", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: proyekId,
          id_kategori: form.id_kategori,
          tanggal: form.tanggal,
          qty: form.qty,
          satuan: form.satuan.trim(),
          harga: form.harga,
          gudang: form.gudang.trim(),
          supplier: form.supplier.trim(),
          metode_pembayaran: form.metode_pembayaran,
          keterangan: form.keterangan.trim() || null,
        }),
      });

      const result = (await response.json()) as
        | {
            success?: boolean;
            message?: string;
            data?: unknown;
            error?: string;
          }
        | ApiErrorResponse;

      if (!response.ok) {
        const message =
          "error" in result && result.error
            ? result.error
            : "Gagal menyimpan material.";

        showToast(message, "error");
        return;
      }

      showToast("Material proyek berhasil ditambahkan.", "success");

      router.push(`/proyek/${proyekId}/material`);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan material.";

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadKategori();
  }, []);

  const total = form.qty * form.harga;

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Material Proyek">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* TANGGAL */}
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* KATEGORI */}
          <div>
            <label className="mb-1 block text-sm font-medium">Material</label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              disabled={loadingKategori || saving}
              onChange={(event) =>
                handleChange("id_kategori", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingKategori ? "Memuat material..." : "Pilih Material"}
              </option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode} - {item.nama}
                </option>
              ))}
            </select>
          </div>

          {/* GUDANG */}
          <Input
            label="Gudang"
            value={form.gudang}
            onChange={(event) => handleChange("gudang", event.target.value)}
          />

          {/* QTY */}
          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(event) =>
              handleChange("qty", Number(event.target.value))
            }
          />

          {/* SATUAN */}
          <Input
            label="Satuan"
            value={form.satuan}
            onChange={(event) => handleChange("satuan", event.target.value)}
          />

          {/* SUPPLIER */}
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(event) => handleChange("supplier", event.target.value)}
          />

          {/* PEMBAYARAN */}
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

          {/* HARGA */}
          <Input
            label="Harga Satuan"
            type="number"
            value={form.harga}
            onChange={(event) =>
              handleChange("harga", Number(event.target.value))
            }
          />

          {/* TOTAL */}
          <Input label="Total Material" value={formatRupiah(total)} readOnly />

          {/* KETERANGAN */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Keterangan</label>

            <textarea
              className="min-h-[100px] w-full rounded-md border p-2"
              value={form.keterangan}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
              placeholder="Keterangan material..."
              disabled={saving}
            />
          </div>
        </div>

        {/* INFO COA */}
        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <div className="mb-2 text-sm font-semibold">Informasi Pembayaran</div>

          <div className="text-sm text-gray-600">
            {form.metode_pembayaran === "KAS_BESAR" && (
              <>
                Transaksi akan dikreditkan ke{" "}
                <strong>Kas Besar (1101.03.01)</strong>.
              </>
            )}

            {form.metode_pembayaran === "KAS_KECIL" && (
              <>
                Transaksi akan dikreditkan ke{" "}
                <strong>Kas Kecil (1101.03.02)</strong>.
              </>
            )}

            {form.metode_pembayaran === "KAS" && (
              <>
                Transaksi menggunakan <strong>Kas Proyek (11030)</strong>
                sebagai akun lama/induk.
              </>
            )}

            {form.metode_pembayaran === "BANK" && (
              <>
                Transaksi akan dikreditkan ke{" "}
                <strong>BNI - 1918768145 (1014)</strong>.
              </>
            )}

            {form.metode_pembayaran === "HUTANG" && (
              <>
                Transaksi akan dikreditkan ke{" "}
                <strong>Hutang Proyek (21010)</strong>.
              </>
            )}
          </div>
        </div>

        {/* BUTTON */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/material`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || loadingKategori}
          >
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
