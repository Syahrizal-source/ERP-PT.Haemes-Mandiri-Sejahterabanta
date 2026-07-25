"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  status:
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";
};

export default function CreateTagihanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    nomor_invoice: "",
    tanggal: "",
    nilai: 0,
    status: "Unpaid (Menunggu Pembayaran)",
  });

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.nilai < 0) {
      showToast("Nilai tidak boleh minus", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/tagihan", {
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
      showToast(err.error ?? "Gagal menyimpan tagihan", "error");
      return;
    }

    showToast("Tagihan & jurnal berhasil dibuat", "success");
    router.push(`/proyek/${proyekId}/tagihan`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Tagihan Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nomor Invoice"
            value={form.nomor_invoice}
            onChange={(e) => handleChange("nomor_invoice", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Nilai"
            type="number"
            value={form.nilai}
            onChange={(e) => handleChange("nilai", Number(e.target.value))}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as FormState["status"])
              }
            >
              <option value="Unpaid (Menunggu Pembayaran)">Unpaid</option>
              <option value="Partial (Pembayaran Sebagian)">Partial</option>
              <option value="Paid (Pembayaran Penuh/ Lunas)">Paid</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/tagihan`)}
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
