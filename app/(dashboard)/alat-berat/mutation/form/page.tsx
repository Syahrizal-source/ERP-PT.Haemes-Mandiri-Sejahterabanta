"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Proyek {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  status: string;
}

interface MutationForm {
  equipment_id: string;
  tanggal: string;
  dari_lokasi: string;
  ke_lokasi: string;
  id_proyek: string | null;
}

export default function CreateMutationPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Proyek[]>([]);

  const [form, setForm] = useState<MutationForm>({
    equipment_id: "",
    tanggal: "",
    dari_lokasi: "",
    ke_lokasi: "",
    id_proyek: null,
  });

  useEffect(() => {
    fetchEquipments();// eslint-disable-next-line react-hooks/exhaustive-deps
    fetchProjects();
  }, []);

  async function fetchEquipments(): Promise<void> {
    const res = await fetch("/api/alat-berat/master");

    if (!res.ok) {
      showToast("Gagal mengambil equipment", "error");
      return;
    }

    const data: Equipment[] = await res.json();

    setEquipments(data);
  }

  async function fetchProjects(): Promise<void> {
    const res = await fetch("/api/proyek/master");

    if (!res.ok) {
      showToast("Gagal mengambil proyek", "error");
      return;
    }

    const data: Proyek[] = await res.json();

    const runningProjects = data.filter((p) => p.status === "running");

    setProjects(runningProjects);
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/alat-berat/mutation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

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
      title: "Mutation Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/mutation");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Mutation">
        <div className="grid grid-cols-2 gap-4">
          {/* EQUIPMENT */}
          <div>
            <label className="text-sm font-medium">Equipment</label>

            <select
              className="w-full border rounded p-2"
              value={form.equipment_id}
              onChange={(e) =>
                setForm({ ...form, equipment_id: e.target.value })
              }
            >
              <option value="">-- Pilih Equipment --</option>

              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.asset_number}
                </option>
              ))}
            </select>
          </div>

          {/* TANGGAL */}
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />

          {/* DARI LOKASI */}
          <Input
            label="Dari Lokasi"
            value={form.dari_lokasi}
            onChange={(e) => setForm({ ...form, dari_lokasi: e.target.value })}
          />

          {/* KE LOKASI */}
          <Input
            label="Ke Lokasi"
            value={form.ke_lokasi}
            onChange={(e) => setForm({ ...form, ke_lokasi: e.target.value })}
          />

          {/* PROYEK */}
          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) => setForm({ ...form, id_proyek: e.target.value })}
            >
              <option value="">-- Proyek --</option>

              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode_proyek} - {p.nama_proyek}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BUTTON */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/mutation")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
