"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Estate {
  id: string;
  name: string;
}

interface DivisionForm {
  estate_id: string;
  code: string;
  name: string;
  area_ha: number;
}

export default function CreateDivisionPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [estates, setEstates] = useState<Estate[]>([]);

  const [form, setForm] = useState<DivisionForm>({
    estate_id: "",
    code: "",
    name: "",
    area_ha: 0,
  });

  useEffect(() => {
    async function fetchEstates(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/estate");
      const data: Estate[] = await res.json();
      setEstates(data);
    }

    fetchEstates();
  }, []);

  function handleChange<K extends keyof DivisionForm>(
    field: K,
    value: DivisionForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.area_ha < 0) {
      showToast("Luas tidak boleh negatif", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/kebun-sawit/divisions", {
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
        text: "Gagal menyimpan divisions",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Divisions Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/divisions");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Divisions">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Estate</label>
            <select
              className="w-full border rounded p-2"
              value={form.estate_id}
              onChange={(e) => handleChange("estate_id", e.target.value)}
            >
              <option value="">-- Pilih Estate --</option>

              {estates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kode Divisions"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
          />

          <Input
            label="Nama Divisions"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Luas Area (Ha)"
            type="number"
            value={form.area_ha}
            onChange={(e) => handleChange("area_ha", Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/divisions")}
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
