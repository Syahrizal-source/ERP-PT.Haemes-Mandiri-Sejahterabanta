"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type HutangItem = {
  id: string;
  supplier: string | null;
  tanggal: string | null;
  nilai: number;
  status: string | null;
  jatuh_tempo: string | null;
};

type HutangForm = {
  supplier: string;
  tanggal: string;
  nilai: number;
};

export default function EditHutangPage() {
  const { id, hutangId } = useParams<{
    id: string;
    hutangId: string;
  }>();

  const router = useRouter();

  const [form, setForm] = useState<HutangForm>({
    supplier: "",
    tanggal: "",
    nilai: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/proyek/hutang?id_proyek=${id}`);
      if (!res.ok) return;

      const rows: HutangItem[] = await res.json();

      const row = rows.find((r: HutangItem) => r.id === hutangId);

      if (!row) return;

      setForm({
        supplier: row.supplier ?? "",
        tanggal: row.tanggal ?? "",
        nilai: row.nilai,
      });
    }

    fetchData();
  }, [id, hutangId]);

  async function handleSubmit(): Promise<void> {
    await fetch(`/api/proyek/hutang/${hutangId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    router.push(`/proyek/${id}/hutang`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Hutang Proyek">
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
              setForm({
                ...form,
                nilai: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}
