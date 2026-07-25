"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Pph23Form {
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  tanggal_transaksi: string;
}

export default function EditPph23Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Pph23Form | null>(null);

  useEffect(() => {
    fetch(`/api/pph23/${params.id}`)
      .then((res) => res.json())
      .then((data: Pph23Form) => setForm(data));
  }, []);

  if (!form) return null;

  const dasar = Math.max(0, form.nilai_transaksi);

  const pajak = Math.max(0, dasar * (form.tarif_pph23 / 100));

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/pph23/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pph23_terutang: pajak,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph23");
    });
  }

  return (
    <Card title="Edit PPh23">
      <Input
        label="Jenis Jasa"
        value={form.jenis_jasa}
        onChange={(e) => setForm({ ...form, jenis_jasa: e.target.value })}
      />

      <Button className="mt-4" onClick={handleSubmit}>
        Update
      </Button>
    </Card>
  );
}
