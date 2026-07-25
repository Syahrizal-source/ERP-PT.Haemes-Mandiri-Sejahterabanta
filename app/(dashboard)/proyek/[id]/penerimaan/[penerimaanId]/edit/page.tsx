"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import { ProyekPenerimaanSchema } from "@/lib/validators/penerimaanproyek";

type FormState = {
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: string;
  bank: string;
};

export default function EditPenerimaanPage() {
  const { id, penerimaanId } = useParams<{
    id: string;
    penerimaanId: string;
  }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    id_tagihan: "",
    tanggal: "",
    jumlah: 0,
    metode: "",
    bank: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/proyek/penerimaan?id_proyek=${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      type PenerimaanRow = FormState & {
        id: string;
      };

      const data: PenerimaanRow[] = await res.json();
      const current = data.find((d) => d.id === penerimaanId);

      if (!current) {
        showToast("Data tidak ditemukan", "error");
        router.push(`/proyek/${id}/penerimaan`);
        return;
      }

      setForm({
        id_tagihan: current.id_tagihan ?? "",
        tanggal: current.tanggal,
        jumlah: Number(current.jumlah),
        metode: current.metode ?? "",
        bank: current.bank ?? "",
      });
      setLoading(false);
    }

    fetchData();
  }, [id, penerimaanId, router, showToast]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const parsed = ProyekPenerimaanSchema.safeParse(form);

    if (!parsed.success) {
      showToast(parsed.error.issues[0].message, "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/penerimaan/${penerimaanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update penerimaan", "error");
      return;
    }

    showToast("Penerimaan berhasil diupdate", "success");
    router.push(`/proyek/${id}/penerimaan`);
    router.refresh();
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
      <Card title="Edit Penerimaan Proyek">
        <div className="grid grid-cols-2 gap-4">
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
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
