"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function EditAlatBerat() {
  const { id, alatId } = useParams<{
    id: string;
    alatId: string;
  }>();

  const router = useRouter();

  const [form, setForm] = useState({
    tanggal_mulai: "",
    tanggal_selesai: "",
    tarif_sewa_internal: 0,
    jam_operasi: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(
        `/api/proyek/alat-berat-konstruksi?id_proyek=${id}`,
      );
      if (!res.ok) return;

      const rows = await res.json();
      const row = rows.find((r: { id: string }) => r.id === alatId);

      if (!row) return;

      setForm({
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai ?? "",
        tarif_sewa_internal: row.tarif_sewa_internal,
        jam_operasi: row.jam_operasi,
      });
    }

    fetchData();
  }, [id, alatId]);

  async function handleSubmit(): Promise<void> {
    await fetch(`/api/proyek/alat-berat-konstruksi/${alatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tanggal_selesai: form.tanggal_selesai || null,
      }),
    });

    router.push(`/proyek/${id}/alat-berat`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Alat Berat">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Tanggal Mulai"
            value={form.tanggal_mulai}
            onChange={(e) =>
              setForm({ ...form, tanggal_mulai: e.target.value })
            }
          />

          <Input
            type="date"
            label="Tanggal Selesai"
            value={form.tanggal_selesai}
            onChange={(e) =>
              setForm({
                ...form,
                tanggal_selesai: e.target.value,
              })
            }
          />

          <Input
            type="number"
            label="Tarif"
            value={form.tarif_sewa_internal}
            onChange={(e) =>
              setForm({
                ...form,
                tarif_sewa_internal: Number(e.target.value),
              })
            }
          />

          <Input
            type="number"
            label="Jam Operasi"
            value={form.jam_operasi}
            onChange={(e) =>
              setForm({
                ...form,
                jam_operasi: Number(e.target.value),
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
