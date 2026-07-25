"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Region {
  id: string;
  name: string;
}

interface EstateForm {
  region_id: string;
  code: string;
  name: string;
  total_area_ha: number;
  manager_name: string;
  is_active: boolean;
}

export default function CreateEstatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<EstateForm>({
    region_id: "",
    code: "",
    name: "",
    total_area_ha: 0,
    manager_name: "",
    is_active: true,
  });

  useEffect(() => {
    async function fetchRegions(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/master");
      if (!res.ok) {
        showToast("Gagal mengambil data region", "error");
        return;
      }
      const data: Region[] = await res.json();
      setRegions(data);
    }

    fetchRegions();
  }, [showToast]);

  function handleChange<K extends keyof EstateForm>(
    field: K,
    value: EstateForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.region_id) {
      showToast("Region wajib dipilih", "error");
      return;
    }

    if (form.total_area_ha < 0) {
      showToast("Luas tidak boleh negatif", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/kebun-sawit/estate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan estate",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Estate Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/estate");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Estate">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Region</label>
            <select
              className="w-full border rounded p-2"
              value={form.region_id}
              onChange={(e) => handleChange("region_id", e.target.value)}
            >
              <option value="">-- Pilih Region --</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kode Estate"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
          />

          <Input
            label="Nama Estate"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Luas Total (Ha)"
            type="number"
            min={0}
            value={form.total_area_ha}
            onChange={(e) =>
              handleChange("total_area_ha", Number(e.target.value))
            }
          />

          <Input
            label="Manager"
            value={form.manager_name}
            onChange={(e) => handleChange("manager_name", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/estate")}
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
