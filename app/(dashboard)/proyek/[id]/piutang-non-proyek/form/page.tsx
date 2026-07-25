"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function FormTambahPiutang() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [tanggal, setTanggal] = useState<string>("");
  const [deskripsi, setDeskripsi] = useState<string>("");
  const [debit, setDebit] = useState<number>(0);
  const [kredit, setKredit] = useState<number>(0);

  async function submit(): Promise<void> {
    const payload = {
      id_proyek: params.id,
      tanggal,
      deskripsi,
      debit,
      kredit,
      saldo: debit - kredit,
    };

    const res = await fetch("/api/proyek/piutang-non-proyek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

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
      <Card title="Tambah Piutang Non Proyek">
        <Input
          label="Tanggal"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
        />

        <Input
          label="Deskripsi"
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
        />

        <Input
          label="Debit"
          type="number"
          value={debit}
          onChange={(e) => setDebit(Number(e.target.value))}
        />

        <Input
          label="Kredit"
          type="number"
          value={kredit}
          onChange={(e) => setKredit(Number(e.target.value))}
        />

        <div className="flex justify-end mt-4">
          <Button onClick={submit}>Simpan</Button>
        </div>
      </Card>
    </div>
  );
}
