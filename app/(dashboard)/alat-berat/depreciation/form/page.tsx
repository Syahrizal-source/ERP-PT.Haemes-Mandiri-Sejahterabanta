"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

interface Equipment {
  id: string;
  asset_number: string;
}

interface DepreciationForm {
  equipment_id: string;
  tanggal: string;
  nilai: number;
}

export default function CreateDepreciationPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [form, setForm] = useState<DepreciationForm>({
    equipment_id: "",
    tanggal: "",
    nilai: 0,
  });

  useEffect(() => {
    async function fetchEquipment(): Promise<void> {
      const res = await fetch("/api/alat-berat/master");

      const data: Equipment[] = await res.json();

      setEquipments(data);
    }

    fetchEquipment();
  }, []);

  function handleChange<K extends keyof DepreciationForm>(
    field: K,
    value: DepreciationForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/depreciation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan depreciation",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Depreciation Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/depreciation");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Depreciation">
        <div className="grid grid-cols-2 gap-4">
          <select
            className="border rounded p-2"
            value={form.equipment_id}
            onChange={(e) => handleChange("equipment_id", e.target.value)}
          >
            <option value="">-- Pilih Equipment --</option>

            {equipments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.asset_number}
              </option>
            ))}
          </select>

          <Input
            type="date"
            className="border rounded p-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.nilai}
            onChange={(e) => handleChange("nilai", Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/depreciation")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
