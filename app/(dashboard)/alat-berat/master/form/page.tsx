"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface EquipmentForm {
  asset_number: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  year: number;
  site_id: string;
  status: string;
}

export default function CreateEquipmentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<EquipmentForm>({
    asset_number: "",
    type: "",
    brand: "",
    model: "",
    serial_number: "",
    year: new Date().getFullYear(),
    site_id: "",
    status: "ACTIVE",
  });

  function handleChange<K extends keyof EquipmentForm>(
    field: K,
    value: EquipmentForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/master", {
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
        text: "Gagal menyimpan master",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Master Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/master");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Equipment">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Asset Number"
            value={form.asset_number}
            onChange={(e) => handleChange("asset_number", e.target.value)}
          />

          <Input
            label="Type"
            value={form.type}
            onChange={(e) => handleChange("type", e.target.value)}
          />

          <Input
            label="Brand"
            value={form.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
          />

          <Input
            label="Model"
            value={form.model}
            onChange={(e) => handleChange("model", e.target.value)}
          />

          <Input
            label="Serial Number"
            value={form.serial_number}
            onChange={(e) => handleChange("serial_number", e.target.value)}
          />

          <Input
            label="Year"
            type="number"
            value={form.year}
            onChange={(e) => handleChange("year", Number(e.target.value))}
          />

          <Input
            label="Site ID"
            value={form.site_id}
            onChange={(e) => handleChange("site_id", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="STANDBY">STANDBY</option>
              <option value="BREAKDOWN">BREAKDOWN</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/master")}
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
