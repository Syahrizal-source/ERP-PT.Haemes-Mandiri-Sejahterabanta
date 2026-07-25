"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface HarvestForm {
  id: string;
  block_id: string;
  harvest_date: string;
  total_bunches: number;
  total_weight_kg: number;
  total_loose_fruit_kg: number;
  notes: string | null;
}

export default function EditHarvestPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id: string = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);

  const [form, setForm] = useState<HarvestForm>({
    id: "",
    block_id: "",
    harvest_date: "",
    total_bunches: 0,
    total_weight_kg: 0,
    total_loose_fruit_kg: 0,
    notes: "",
  });

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/kebun-sawit/harvest");

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const list: HarvestForm[] = await res.json();

    const found: HarvestForm | undefined = list.find((h) => h.id === id);

    if (!found) {
      setLoading(false);
      return;
    }

    setForm(found);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleChange<K extends keyof HarvestForm>(
    field: K,
    value: HarvestForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/harvest/${form.id}`, {
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
        text: "Gagal menyimpan harvest",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Harvest Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/harvest");
      router.refresh();
    });
  }

  if (loading) {
    return <div>Memuat data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Harvest">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Block ID"
            value={form.block_id}
            onChange={(e) => handleChange("block_id", e.target.value)}
          />

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
            value={form.notes ?? ""}
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
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
