"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface FormState {
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
}

export default function EditPiutang() {
  const params = useParams<{
    id: string;
    piutangnonproyekId: string;
  }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    deskripsi: "",
    debit: 0,
    kredit: 0,
  });

  useEffect(() => {
    fetch("/api/proyek/piutang-non-proyek")
      .then((r) => r.json())
      .then((list: Array<FormState & { id: string }>) => {
        const item = list.find((i) => i.id === params.piutangnonproyekId);
        if (item) {
          setForm({
            tanggal: item.tanggal,
            deskripsi: item.deskripsi,
            debit: item.debit,
            kredit: item.kredit,
          });
        }
      });
  }, []);

  async function submit(): Promise<void> {
    const payload = {
      ...form,
      saldo: form.debit - form.kredit,
    };

    const res = await fetch(
      `/api/proyek/piutang-non-proyek/${params.piutangnonproyekId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }

    router.push(`/proyek/${params.id}/piutang-non-proyek`);
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card title="Edit Piutang Non Proyek">
        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
        />

        <Input
          label="Deskripsi"
          value={form.deskripsi}
          onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
        />

        <Input
          label="Debit"
          type="number"
          value={form.debit}
          onChange={(e) => setForm({ ...form, debit: Number(e.target.value) })}
        />

        <Input
          label="Kredit"
          type="number"
          value={form.kredit}
          onChange={(e) => setForm({ ...form, kredit: Number(e.target.value) })}
        />

        <div className="flex justify-end mt-4">
          <Button onClick={submit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}
