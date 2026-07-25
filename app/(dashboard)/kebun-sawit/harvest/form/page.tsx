"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Block {
  id: string;
  code: string;
}

interface HarvestForm {
  block_id: string;
  harvest_date: string;
  total_bunches: number;
  total_weight_kg: number;
  total_loose_fruit_kg: number;
  notes: string;
}

export default function HarvestFormPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState<HarvestForm>({
    block_id: "",
    harvest_date: "",
    total_bunches: 0,
    total_weight_kg: 0,
    total_loose_fruit_kg: 0,
    notes: "",
  });

  useEffect(() => {
    async function fetchBlocks(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/blocks");

      if (!res.ok) return;

      const data: Block[] = await res.json();
      setBlocks(data);
    }

    fetchBlocks();
  }, []);

  function handleChange<K extends keyof HarvestForm>(
    field: K,
    value: HarvestForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/kebun-sawit/harvest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan harvest",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Harvest Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/harvest");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Harvest">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Block</label>
            <select
              className="w-full border rounded p-2"
              value={form.block_id}
              onChange={(e) => handleChange("block_id", e.target.value)}
            >
              <option value="">Pilih Block</option>

              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tanggal Harvest"
            type="date"
            value={form.harvest_date}
            onChange={(e) => handleChange("harvest_date", e.target.value)}
          />

          <Input
            label="Jumlah Janjang"
            type="number"
            min={0}
            value={form.total_bunches}
            onChange={(e) =>
              handleChange("total_bunches", Number(e.target.value))
            }
          />

          <Input
            label="Total Berat (Kg)"
            type="number"
            min={0}
            value={form.total_weight_kg}
            onChange={(e) =>
              handleChange("total_weight_kg", Number(e.target.value))
            }
          />

          <Input
            label="Brondolan (Kg)"
            type="number"
            min={0}
            value={form.total_loose_fruit_kg}
            onChange={(e) =>
              handleChange("total_loose_fruit_kg", Number(e.target.value))
            }
          />

          <Input
            label="Catatan"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/harvest")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
