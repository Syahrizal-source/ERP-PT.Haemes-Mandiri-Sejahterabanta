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

interface FormState {
  block_id: string;
  tanggal: string;
  pokok_ditebang: number;
  pokok_ditanam: number;
  biaya_total: number;
  keterangan: string;
}

export default function CreateReplantingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState<FormState>({
    block_id: "",
    tanggal: "",
    pokok_ditebang: 0,
    pokok_ditanam: 0,
    biaya_total: 0,
    keterangan: "",
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
    const res = await fetch("/api/kebun-sawit/replantings", {
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
        text: "Gagal menyimpan replantings",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Replantings Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/replantings");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Replanting">
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
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Pokok Ditebang"
            type="number"
            min={0}
            value={form.pokok_ditebang}
            onChange={(e) =>
              handleChange("pokok_ditebang", Number(e.target.value))
            }
          />

          <Input
            label="Pokok Ditanam"
            type="number"
            min={0}
            value={form.pokok_ditanam}
            onChange={(e) =>
              handleChange("pokok_ditanam", Number(e.target.value))
            }
          />

          <Input
            label="Biaya Total"
            type="number"
            min={0}
            value={form.biaya_total}
            onChange={(e) =>
              handleChange("biaya_total", Number(e.target.value))
            }
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/replantings")}
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