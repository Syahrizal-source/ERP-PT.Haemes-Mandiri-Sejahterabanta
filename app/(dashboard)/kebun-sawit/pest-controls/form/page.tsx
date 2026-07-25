"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Block {
  id: string;
  code: string;
}

interface FormState {
  block_id: string;
  control_date: string;
  pest_type: string;
  severity_level: string;
  action_taken: string;
  chemical_used: string;
  cost: number;
  notes: string;
}

export default function CreatePestControlPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState<FormState>({
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
    async function loadBlocks(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/blocks");

      if (!res.ok) return;

      const data: Block[] = await res.json();
      setBlocks(data);
    }

    loadBlocks();
  }, []);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/kebun-sawit/pest-controls", {
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
      router.push("/kebun-sawit/pest-controls");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Pest Control">
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
            min={0}
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
            onClick={() => router.push("/kebun-sawit/pest-controls")}
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
