"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Pph25Form {
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_transaksi: string;
  keterangan: string;
}

export default function EditPph25Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Pph25Form | null>(null);

  useEffect(() => {
    fetch(`/api/pph25/${params.id}`)
      .then((res) => res.json())
      .then((data: Pph25Form) => setForm(data));
  }, []);

  if (!form) return null;

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/pph25/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph25");
    });
  }

  return (
    <Card title="Edit PPh25">
      <Input
        label="Nilai Angsuran"
        type="number"
        value={form.nilai_angsuran}
        onChange={(e) =>
          setForm({
            ...form,
            nilai_angsuran: Number(e.target.value),
          })
        }
      />

      <Button className="mt-4" onClick={handleSubmit}>
        Update
      </Button>
    </Card>
  );
}
