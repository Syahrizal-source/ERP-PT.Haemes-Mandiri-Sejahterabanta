"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MaterialForm = {
  material: string;
  qty: number;
  harga: number;
  gudang: string;
};

export default function EditMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const materialId = params.materialId as string;

  const [form, setForm] = useState<MaterialForm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  function handleChange<K extends keyof MaterialForm>(
    key: K,
    value: MaterialForm[K],
  ): void {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function fetchDetail(): Promise<void> {
    const res = await fetch(`/api/proyek/material?id_proyek=${proyekId}`);

    if (!res.ok) {
      showToast("Gagal mengambil data material", "error");
      setLoading(false);
      return;
    }

    const data: {
      id: string;
      material: string;
      qty: number;
      harga: number;
      gudang: string | null;
    }[] = await res.json();

    const found = data.find((item) => item.id === materialId);

    if (!found) {
      showToast("Data tidak ditemukan", "error");
      setLoading(false);
      return;
    }

    setForm({
      material: found.material,
      qty: found.qty,
      harga: found.harga,
      gudang: found.gudang ?? "",
    });

    setLoading(false);
  }

  async function handleSubmit(): Promise<void> {
    if (!form) return;

    if (!form.material) {
      showToast("Nama material wajib diisi", "error");
      return;
    }

    if (form.qty < 0 || form.harga < 0) {
      showToast("Nilai tidak boleh minus", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/material/${materialId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update material", "error");
      return;
    }

    showToast("Material berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/material`);
    router.refresh();
  }

  useEffect(() => {
    fetchDetail();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Material Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama Material"
            value={form.material}
            onChange={(e) => handleChange("material", e.target.value)}
          />

          <Input
            label="Gudang"
            value={form.gudang}
            onChange={(e) => handleChange("gudang", e.target.value)}
          />

          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          <Input
            label="Harga"
            type="number"
            value={form.harga}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/material`)}
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
