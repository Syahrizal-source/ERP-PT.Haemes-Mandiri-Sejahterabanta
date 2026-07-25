"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AlatMaster = {
  id_alat: string;
  merek: string;
  model: string;
  status: "aktif" | "nonaktif";
};

export default function FormTambah() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [alatList, setAlatList] = useState<AlatMaster[]>([]);
  const [form, setForm] = useState({
    id_alat: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    tarif_sewa_internal: 0,
    jam_operasi: 0,
  });

  useEffect(() => {
    async function fetchMaster(): Promise<void> {
      const res = await fetch("/api/alat-berat-master");
      if (!res.ok) return;

      const data: AlatMaster[] = await res.json();
      setAlatList(data.filter((a) => a.status === "aktif"));
    }

    fetchMaster();
  }, []);

  async function handleSubmit(): Promise<void> {
    await fetch("/api/proyek/alat-berat-konstruksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_proyek: id,
        ...form,
        tanggal_selesai: form.tanggal_selesai || null,
      }),
    });

    router.push(`/proyek/${id}/alat-berat`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Alat Berat">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Alat</label>
            <select
              className="w-full border rounded p-2"
              value={form.id_alat}
              onChange={(e) => setForm({ ...form, id_alat: e.target.value })}
            >
              <option value="">- Pilih -</option>
              {alatList.map((a) => (
                <option key={a.id_alat} value={a.id_alat}>
                  {a.id_alat} - {a.merek} {a.model}
                </option>
              ))}
            </select>
          </div>

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
              setForm({ ...form, tanggal_selesai: e.target.value })
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
          <Button onClick={handleSubmit}>Simpan</Button>
        </div>
      </Card>
    </div>
  );
}
