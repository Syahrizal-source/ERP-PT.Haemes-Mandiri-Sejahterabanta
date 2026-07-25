"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  nama: string;
  jabatan: string;
  tipe: "harian" | "borongan" | "staff";
  upah: number;
  periode: string;
};

export default function CreateTenagaKerjaPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    nama: "",
    jabatan: "",
    tipe: "harian",
    upah: 0,
    periode: "",
  });

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.upah < 0) {
      showToast("Upah tidak boleh negatif", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/tenaga-kerja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_proyek: proyekId,
        nama: form.nama,
        jabatan: form.jabatan || null,
        tipe: form.tipe,
        upah: form.upah,
        periode: form.periode || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menyimpan tenaga kerja", "error");
      return;
    }

    showToast("Tenaga kerja berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/tenaga-kerja`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Tenaga Kerja">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            label="Jabatan"
            value={form.jabatan}
            onChange={(e) => handleChange("jabatan", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Tipe</label>
            <select
              className="w-full border rounded p-2"
              value={form.tipe}
              onChange={(e) =>
                handleChange("tipe", e.target.value as FormState["tipe"])
              }
            >
              <option value="harian">Harian</option>
              <option value="borongan">Borongan</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <Input
            label="Upah"
            type="number"
            value={form.upah}
            onChange={(e) => handleChange("upah", Number(e.target.value))}
          />

          <Input
            label="Periode"
            placeholder="Contoh: Jan 2026"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/tenaga-kerja`)}
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
