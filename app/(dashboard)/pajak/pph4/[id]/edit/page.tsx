"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Pph4Form {
  id_vendor: number;
  jenis_objek: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  tanggal_transaksi: string;
}

export default function EditPph4Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Pph4Form | null>(null);

  useEffect(() => {
    fetch(`/api/pph4/${params.id}`)
      .then((res) => res.json())
      .then((data: Pph4Form) => setForm(data));
  }, []);

  if (!form) return null;

  const dasar = Math.max(0, form.nilai_transaksi);

  const pajak = Math.max(0, dasar * (form.tarif_pph4 / 100));

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/pph4/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pph4_terutang: pajak,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/accounting/pph4");
    });
  }

  return (
    <Card title="Edit PPh4">
      <Input
        label="Jenis Objek"
        value={form.jenis_objek}
        onChange={(e) => setForm({ ...form, jenis_objek: e.target.value })}
      />

      <Button className="mt-4" onClick={handleSubmit}>
        Update
      </Button>
    </Card>
  );
}
