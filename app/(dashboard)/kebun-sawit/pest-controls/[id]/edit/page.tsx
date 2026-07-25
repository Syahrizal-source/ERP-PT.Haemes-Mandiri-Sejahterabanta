"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface PestControlForm {
  block_id: string;
  control_date: string;
  pest_type: string;
  severity_level: string;
  action_taken: string;
  chemical_used: string;
  cost: number;
  notes: string;
}

interface Block {
  id: string;
  code: string;
}

interface PestControlRow extends PestControlForm {
  id: string;
}

export default function EditPestControlPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState<PestControlForm>({
    block_id: "",
    control_date: "",
    pest_type: "",
    severity_level: "",
    action_taken: "",
    chemical_used: "",
    cost: 0,
    notes: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const resPest = await fetch("/api/kebun-sawit/pest-controls");
      const resBlocks = await fetch("/api/kebun-sawit/blocks");

      if (!resPest.ok || !resBlocks.ok) return;

      const list: PestControlRow[] = await resPest.json();
      const blockList: Block[] = await resBlocks.json();

      const found = list.find((item) => item.id === id);

      if (!found) return;

      setBlocks(blockList);

      setForm({
        block_id: found.block_id,
        control_date: found.control_date,
        pest_type: found.pest_type ?? "",
        severity_level: found.severity_level ?? "",
        action_taken: found.action_taken ?? "",
        chemical_used: found.chemical_used ?? "",
        cost: Number(found.cost),
        notes: found.notes ?? "",
      });
    }

    fetchData();
  }, [id]);

  function handleChange<K extends keyof PestControlForm>(
    field: K,
    value: PestControlForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/pest-controls/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan pest controls",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Pest Controls Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/pest-controls/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Pest Control">
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
            label="Tanggal"
            type="date"
            value={form.control_date}
            onChange={(e) => handleChange("control_date", e.target.value)}
          />

          <Input
            label="Jenis Hama"
            value={form.pest_type}
            onChange={(e) => handleChange("pest_type", e.target.value)}
          />

          <Input
            label="Severity Level"
            value={form.severity_level}
            onChange={(e) => handleChange("severity_level", e.target.value)}
          />

          <Input
            label="Action"
            value={form.action_taken}
            onChange={(e) => handleChange("action_taken", e.target.value)}
          />

          <Input
            label="Chemical"
            value={form.chemical_used}
            onChange={(e) => handleChange("chemical_used", e.target.value)}
          />

          <Input
            label="Biaya"
            type="number"
            value={form.cost}
            onChange={(e) => handleChange("cost", Number(e.target.value))}
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
            onClick={() => router.push(`/kebun-sawit/pest-controls/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
