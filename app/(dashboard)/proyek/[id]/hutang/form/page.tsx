"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type FormState = {
  supplier: string;
  tanggal: string;
  nilai: number;
  jatuh_tempo: string;
  id_coa_beban: number;
};

export default function FormHutangPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    supplier: "",
    tanggal: "",
    nilai: 0,
    jatuh_tempo: "",
    id_coa_beban: 51002,
  });

  async function handleSubmit(): Promise<void> {
    await fetch("/api/proyek/hutang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id_proyek: id, // ⬅️ KRUSIAL
      }),
    });

    router.push(`/proyek/${id}/hutang`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Hutang Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
          <Input
            type="date"
            label="Tanggal"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
          <Input
            type="number"
            label="Nilai"
            value={form.nilai}
            onChange={(e) =>
              setForm({ ...form, nilai: Number(e.target.value) })
            }
          />
          <Input
            type="date"
            label="Jatuh Tempo"
            value={form.jatuh_tempo}
            onChange={(e) => setForm({ ...form, jatuh_tempo: e.target.value })}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button onClick={handleSubmit}>Simpan</Button>
        </div>
      </Card>
    </div>
  );
}
