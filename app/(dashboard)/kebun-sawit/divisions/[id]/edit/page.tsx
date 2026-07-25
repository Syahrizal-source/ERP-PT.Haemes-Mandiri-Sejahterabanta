"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Division {
  id: string;
  estate_id: string;
  code: string;
  name: string;
  area_ha: number;
  is_active: boolean;
}

interface DivisionForm {
  estate_id: string;
  code: string;
  name: string;
  area_ha: number;
  is_active: boolean;
}

export default function EditDivisionPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [estates, setEstates] = useState<Estate[]>([]);

  const [form, setForm] = useState<DivisionForm>({
    estate_id: "",
    code: "",
    name: "",
    area_ha: 0,
    is_active: true,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [divisionRes, estateRes] = await Promise.all([
        fetch("/api/kebun-sawit/divisions"),
        fetch("/api/kebun-sawit/estate"),
      ]);

      if (!divisionRes.ok || !estateRes.ok) {
        showToast("Gagal mengambil data division", "error");
        setLoading(false);
        return;
      }

      const divisions: Division[] = await divisionRes.json();
      const estateList: Estate[] = await estateRes.json();

      const found = divisions.find((d) => d.id === id);

      if (!found) {
        showToast("Division tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      setEstates(estateList);

      setForm({
        estate_id: found.estate_id,
        code: found.code,
        name: found.name,
        area_ha: found.area_ha,
        is_active: found.is_active,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof DivisionForm>(
    field: K,
    value: DivisionForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.area_ha < 0) {
      showToast("Luas tidak boleh negatif", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/kebun-sawit/divisions/${id}`, {
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
        text: "Gagal menyimpan divisions",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Divisions Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/divisions/${id}`);
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
      <Card title="Edit Division">
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
            label="Kode Division"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
          />

          <Input
            label="Nama Division"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Luas Area (Ha)"
            type="number"
            value={form.area_ha}
            onChange={(e) => handleChange("area_ha", Number(e.target.value))}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.is_active ? "true" : "false"}
              onChange={(e) =>
                handleChange("is_active", e.target.value === "true")
              }
            >
              <option value="true">Aktif</option>
              <option value="false">Tidak Aktif</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/kebun-sawit/divisions/${id}`)}
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
