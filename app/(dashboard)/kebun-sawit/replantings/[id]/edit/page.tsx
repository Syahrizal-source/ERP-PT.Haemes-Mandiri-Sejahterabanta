"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface ReplantingForm {
  block_id: string;
  tanggal: string;
  pokok_ditebang: number;
  pokok_ditanam: number;
  biaya_total: number;
  keterangan: string;
}

export default function EditReplantingPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [form, setForm] = useState<ReplantingForm>({
    block_id: "",
    tanggal: "",
    pokok_ditebang: 0,
    pokok_ditanam: 0,
    biaya_total: 0,
    keterangan: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/replantings");

      if (!res.ok) return;

      const list: ReplantingForm[] = await res.json();

      const found = list.find(
        (item) => (item as unknown as { id: string }).id === id,
      );

      if (!found) return;

      setForm(found);
    }

    fetchData();
  }, [id]);

  function handleChange<K extends keyof ReplantingForm>(
    field: K,
    value: ReplantingForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/replantings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      title: "Update Replantings Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/replantings/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Replanting">
        <div className="grid grid-cols-2 gap-4">
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
            onClick={() => router.push(`/kebun-sawit/replantings/${id}`)}
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
