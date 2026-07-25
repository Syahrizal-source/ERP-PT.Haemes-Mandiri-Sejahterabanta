"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Proyek {
  id: string;
  nama: string;
}

interface MutationResponse {
  id: string;
  equipment_id: string | null;
  tanggal: string | null;
  dari_lokasi: string | null;
  ke_lokasi: string | null;
  id_proyek: string | null;
}

interface MutationForm {
  equipment_id: string;
  tanggal: string;
  dari_lokasi: string;
  ke_lokasi: string;
  id_proyek: string;
}

export default function EditMutationPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [proyeks, setProyeks] = useState<Proyek[]>([]);

  const [form, setForm] = useState<MutationForm>({
    equipment_id: "",
    tanggal: "",
    dari_lokasi: "",
    ke_lokasi: "",
    id_proyek: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [mutationRes, eqRes, prRes] = await Promise.all([
        fetch(`/api/alat-berat/mutation/${id}`),
        fetch("/api/alat-berat/master"),
        fetch("/api/proyek/master"),
      ]);

      if (!mutationRes.ok) {
        showToast("Gagal mengambil data mutation", "error");
        setLoading(false);
        return;
      }

      const mutation: MutationResponse = await mutationRes.json();
      const equipmentData: Equipment[] = await eqRes.json();
      const proyekData: Proyek[] = await prRes.json();

      setEquipments(equipmentData);
      setProyeks(proyekData);

      setForm({
        equipment_id: mutation.equipment_id ?? "",
        tanggal: mutation.tanggal ?? "",
        dari_lokasi: mutation.dari_lokasi ?? "",
        ke_lokasi: mutation.ke_lokasi ?? "",
        id_proyek: mutation.id_proyek ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof MutationForm>(
    field: K,
    value: MutationForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/alat-berat/mutation/${id}`, {
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
        text: "Gagal menyimpan mutation",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Mutation Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/mutation/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Mutation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Equipment</label>

            <select
              className="w-full border rounded p-2"
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
          </div>

          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek}
              onChange={(e) => handleChange("id_proyek", e.target.value)}
            >
              <option value="">-- Pilih Proyek --</option>

              {proyeks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            className="border rounded p-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <input
            className="border rounded p-2"
            placeholder="Dari Lokasi"
            value={form.dari_lokasi}
            onChange={(e) => handleChange("dari_lokasi", e.target.value)}
          />

          <input
            className="border rounded p-2"
            placeholder="Ke Lokasi"
            value={form.ke_lokasi}
            onChange={(e) => handleChange("ke_lokasi", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/mutation/${id}`)}
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
