"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Estate {
  id: string;
  region_id: string;
  code: string;
  name: string;
  total_area_ha: number;
  manager_name: string | null;
  is_active: boolean;
}

interface EstateForm {
  region_id: string;
  code: string;
  name: string;
  total_area_ha: number;
  manager_name: string;
  is_active: boolean;
}

export default function EditEstatePage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<EstateForm>({
    region_id: "",
    code: "",
    name: "",
    total_area_ha: 0,
    manager_name: "",
    is_active: true,
  });

  useEffect(() => {
    async function fetchInitialData(): Promise<void> {
      try {
        const [estateRes, regionRes] = await Promise.all([
          fetch("/api/kebun-sawit/estate"),
          fetch("/api/kebun-sawit/master"),
        ]);

        if (!estateRes.ok || !regionRes.ok) {
          showToast("Gagal mengambil data estate", "error");
          setLoading(false);
          return;
        }

        const estateList: Estate[] = await estateRes.json();
        const regionList: Region[] = await regionRes.json();

        const estate = estateList.find((e) => e.id === id);

        if (!estate) {
          showToast("Estate tidak ditemukan", "error");
          setLoading(false);
          return;
        }

        setRegions(regionList);

        setForm({
          region_id: estate.region_id,
          code: estate.code,
          name: estate.name,
          total_area_ha: estate.total_area_ha,
          manager_name: estate.manager_name ?? "",
          is_active: estate.is_active,
        });

        setLoading(false);
      } catch {
        showToast("Terjadi kesalahan", "error");
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [id, showToast]);

  function handleChange<K extends keyof EstateForm>(
    field: K,
    value: EstateForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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

    setSaving(true);

    const res = await fetch(`/api/kebun-sawit/estate/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

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
      title: "Update Estate Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/estate");
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
      <Card title="Edit Estate">
        <div className="grid grid-cols-2 gap-4">
          {/* REGION DROPDOWN */}
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
