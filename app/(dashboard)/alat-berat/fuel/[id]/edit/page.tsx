"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface FuelResponse {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  liter: number;
  harga: number;
  supplier: string | null;
  id_jurnal: number | null;
}

interface FuelForm {
  equipment_id: string;
  tanggal: string;
  liter: number;
  harga: number;
  supplier: string;
  id_jurnal: number;
}

export default function EditFuelPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [form, setForm] = useState<FuelForm>({
    equipment_id: "",
    tanggal: "",
    liter: 0,
    harga: 0,
    supplier: "",
    id_jurnal: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [fuelRes, eqRes] = await Promise.all([
        fetch(`/api/alat-berat/fuel/${id}`),
        fetch("/api/alat-berat/master"),
      ]);

      if (!fuelRes.ok) {
        showToast("Gagal mengambil data fuel", "error");
        setLoading(false);
        return;
      }

      const fuel: FuelResponse = await fuelRes.json();
      const equipmentData: Equipment[] = await eqRes.json();

      setEquipments(equipmentData);

      setForm({
        equipment_id: fuel.equipment_id ?? "",
        tanggal: fuel.tanggal,
        liter: fuel.liter,
        harga: fuel.harga,
        supplier: fuel.supplier ?? "",
        id_jurnal: fuel.id_jurnal ?? 0,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof FuelForm>(
    field: K,
    value: FuelForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/alat-berat/fuel/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan fuel",
      });
      return;
    }

    const result = await res.json();


    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Fuel Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/fuel/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Fuel">
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
            value={form.liter}
            onChange={(e) => handleChange("liter", Number(e.target.value))}
          />

          <input
            type="number"
            className="border rounded p-2"
            value={form.harga}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />

          <Input
            className="border rounded p-2"
            value={form.supplier}
            onChange={(e) => handleChange("supplier", e.target.value)}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.id_jurnal}
            onChange={(e) => handleChange("id_jurnal", Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/fuel/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
