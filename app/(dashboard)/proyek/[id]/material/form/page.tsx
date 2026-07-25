"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  material: string;
  qty: number;
  harga: number;
  gudang: string;
};

export default function TambahMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [form, setForm] = useState<FormState>({
    material: "",
    qty: 0,
    harga: 0,
    gudang: "",
  });

  const [saving, setSaving] = useState<boolean>(false);

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.material) {
      showToast("Nama material wajib diisi", "error");
      return;
    }

    if (form.qty < 0 || form.harga < 0) {
      showToast("Nilai tidak boleh minus", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_proyek: proyekId,
        ...form,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menyimpan material", "error");
      return;
    }

    showToast("Material berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/material`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Material Proyek">
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
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
