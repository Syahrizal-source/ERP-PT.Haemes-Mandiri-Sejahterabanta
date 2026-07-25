"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import { ProyekPenerimaanSchema } from "@/lib/validators/penerimaanproyek";

type TagihanItem = {
  id: string;
  nomor_invoice: string;
  nilai: number;
};

type FormState = {
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: string;
  bank: string;
};

export default function CreatePenerimaanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [tagihan, setTagihan] = useState<TagihanItem[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    id_tagihan: "",
    tanggal: "",
    jumlah: 0,
    metode: "",
    bank: "",
  });

  useEffect(() => {
    fetch(`/api/proyek/tagihan?id_proyek=${id}`)
      .then((r) => r.json())
      .then((d: TagihanItem[]) => setTagihan(d));
  }, [id]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const parsed = ProyekPenerimaanSchema.safeParse(form);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Input tidak valid";

      showToast(message, "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/penerimaan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menyimpan penerimaan", "error");
      return;
    }

    showToast("Penerimaan & jurnal berhasil dibuat", "success");
    router.push(`/proyek/${id}/penerimaan`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Penerimaan Proyek">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium">Tagihan</label>
            <select
              className="w-full border rounded p-2"
              value={form.id_tagihan}
              onChange={(e) => handleChange("id_tagihan", e.target.value)}
            >
              <option value="">-- Pilih Tagihan --</option>
              {tagihan.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nomor_invoice} – {t.nilai.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Jumlah"
            type="number"
            value={form.jumlah}
            onChange={(e) => handleChange("jumlah", Number(e.target.value))}
          />

          <Input
            label="Metode"
            value={form.metode}
            onChange={(e) => handleChange("metode", e.target.value)}
          />

          <Input
            label="Bank"
            value={form.bank}
            onChange={(e) => handleChange("bank", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${id}/penerimaan`)}
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
