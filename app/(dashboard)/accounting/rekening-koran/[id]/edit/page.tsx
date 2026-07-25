"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Jenis = "MASUK" | "KELUAR" | "BIAYA_BANK" | "PAJAK_BANK";

interface FormState {
  id_rekening: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  jenis: Jenis;
}

export default function EditRekeningKoranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    fetch(`/api/rekening-koran/${params.id}`)
      .then((res) => res.json())
      .then((data: FormState) => setForm(data));
  }, [params.id]);

  if (!form) return null;

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleJenis(jenis: Jenis): void {
    if (!form) return;

    if (jenis === "MASUK") {
      setForm({ ...form, jenis, kredit: 0 });
    } else {
      setForm({ ...form, jenis, debit: 0 });
    }
  }

  const debit = Math.max(0, form.debit);
  const kredit = Math.max(0, form.kredit);

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/rekening-koran/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        debit,
        kredit,
        saldo: 0,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/accounting/rekening-koran");
    });
  }

  return (
    <Card title="Edit Rekening Koran">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) => handleChange("tanggal", e.target.value)}
        />

        <Input
          label="Deskripsi"
          value={form.deskripsi}
          onChange={(e) => handleChange("deskripsi", e.target.value)}
        />

        <div>
          <label>Jenis</label>
          <select
            className="w-full border p-2 rounded"
            value={form.jenis}
            onChange={(e) => handleJenis(e.target.value as Jenis)}
          >
            <option value="MASUK">MASUK</option>
            <option value="KELUAR">KELUAR</option>
            <option value="BIAYA_BANK">BIAYA BANK</option>
            <option value="PAJAK_BANK">PAJAK BANK</option>
          </select>
        </div>

        <Input
          label="Debit"
          type="number"
          value={form.debit}
          onChange={(e) => handleChange("debit", Number(e.target.value))}
        />

        <Input
          label="Kredit"
          type="number"
          value={form.kredit}
          onChange={(e) => handleChange("kredit", Number(e.target.value))}
        />
      </div>

      <div className="mt-4 text-sm">
        <p>Debit: {debit.toLocaleString("id-ID")}</p>
        <p>Kredit: {kredit.toLocaleString("id-ID")}</p>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>
        Update
      </Button>
    </Card>
  );
}
