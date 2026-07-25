"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Pph21Form {
  id_payroll: number;
  nama: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  tanggal: string;
}

export default function EditPph21Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Pph21Form | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/pph21/${params.id}`);
      if (!res.ok) return;

      const data: Pph21Form = await res.json();
      setForm(data);
    }

    fetchData();
  }, []);

  if (!form) return null;

  /* =========================
     HITUNG ULANG
  ========================= */

  const netto = form.gaji_bruto - form.biaya_jabatan - form.iuran;

  const dasar = Math.max(0, netto);

  const pajak = Math.max(0, dasar * (form.tarif_pph21 / 100));

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/pph21/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        nilai_pph21: pajak,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph21");
      router.refresh();
    });
  }

  return (
    <Card title="Edit PPh21">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nama"
          value={form.nama}
          onChange={(e) => setForm({ ...form, nama: e.target.value })}
        />

        <Input
          label="Gaji Bruto"
          type="number"
          value={form.gaji_bruto}
          onChange={(e) =>
            setForm({
              ...form,
              gaji_bruto: Number(e.target.value),
            })
          }
        />

        <Input
          label="Biaya Jabatan"
          type="number"
          value={form.biaya_jabatan}
          onChange={(e) =>
            setForm({
              ...form,
              biaya_jabatan: Number(e.target.value),
            })
          }
        />

        <Input
          label="Iuran"
          type="number"
          value={form.iuran}
          onChange={(e) =>
            setForm({
              ...form,
              iuran: Number(e.target.value),
            })
          }
        />

        <Input
          label="Tarif (%)"
          type="number"
          value={form.tarif_pph21}
          onChange={(e) =>
            setForm({
              ...form,
              tarif_pph21: Number(e.target.value),
            })
          }
        />

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) =>
            setForm({
              ...form,
              tanggal: e.target.value,
            })
          }
        />
      </div>

      <div className="mt-4 text-sm">
        <p>Netto: {netto.toLocaleString("id-ID")}</p>
        <p className="font-semibold">PPh21: {pajak.toLocaleString("id-ID")}</p>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>
        Update
      </Button>
    </Card>
  );
}
