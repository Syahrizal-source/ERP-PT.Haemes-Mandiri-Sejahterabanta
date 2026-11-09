"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import Swal from "sweetalert2";

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
    void fetchEquipments();
    void fetchProjects();
  }, []);

  async function fetchEquipments(): Promise<void> {
    try {
      const res = await fetch("/api/alat-berat/master");

      if (!res.ok) {
        showToast("Gagal mengambil equipment", "error");
        return;
      }

      const data: Equipment[] = await res.json();

      setEquipments(data);
    } catch {
      showToast("Gagal mengambil equipment", "error");
    }
  }

  async function fetchProjects(): Promise<void> {
    try {
      const res = await fetch("/api/proyek/master");

      if (!res.ok) {
        showToast("Gagal mengambil proyek", "error");
        return;
      }

      const data: Proyek[] = await res.json();

      /*
       * Mengikuti halaman Master Proyek dan form Operation:
       *
       * Semua proyek dari /api/proyek/master ditampilkan.
       *
       * Tidak menggunakan filter:
       * p.status === "running"
       */
      const projectList: Proyek[] = data
        .filter(
          (project: Proyek) =>
            typeof project.id === "string" &&
            project.id.trim().length > 0 &&
            typeof project.kode_proyek === "string" &&
            project.kode_proyek.trim().length > 0 &&
            typeof project.nama_proyek === "string" &&
            project.nama_proyek.trim().length > 0,
        )
        .sort((a: Proyek, b: Proyek) =>
          a.kode_proyek.localeCompare(b.kode_proyek, "id", {
            numeric: true,
            sensitivity: "base",
          }),
        );

      setProjects(projectList);
    } catch {
      showToast("Gagal mengambil proyek", "error");
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!form.equipment_id) {
      await Swal.fire({
        icon: "warning",
        title: "Equipment belum dipilih",
        text: "Silakan pilih equipment terlebih dahulu.",
      });

      return;
    }

    if (!form.tanggal) {
      await Swal.fire({
        icon: "warning",
        title: "Tanggal belum diisi",
        text: "Silakan pilih tanggal mutation.",
      });

      return;
    }

    if (!form.dari_lokasi.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Dari Lokasi belum diisi",
        text: "Silakan isi lokasi asal equipment.",
      });

      return;
    }

    if (!form.ke_lokasi.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Ke Lokasi belum diisi",
        text: "Silakan isi lokasi tujuan equipment.",
      });

      return;
    }

    if (
      form.dari_lokasi.trim().toLowerCase() ===
      form.ke_lokasi.trim().toLowerCase()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Lokasi tidak berubah",
        text: "Dari Lokasi dan Ke Lokasi tidak boleh sama.",
      });

      return;
    }

    try {
      const res = await fetch("/api/alat-berat/mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        let errorMessage = "Gagal menyimpan mutation";

        try {
          const errorData: {
            error?: string;
            message?: string;
          } = await res.json();

          errorMessage = errorData.error ?? errorData.message ?? errorMessage;
        } catch {
          // Gunakan pesan default jika response bukan JSON.
        }

        await Swal.fire({
          icon: "error",
          title: "Oops...",
          text: errorMessage,
        });

        return;
      }

      const result: {
        message?: string;
      } = await res.json();

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Mutation Berhasil Masuk",
        text: result.message ?? "Mutation berhasil disimpan.",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/alat-berat/mutation");
      router.refresh();
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan saat menyimpan mutation.",
      });
    }
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
                setForm({
                  ...form,
                  equipment_id: e.target.value,
                })
              }
            >
              <option value="">-- Pilih Equipment --</option>

              {equipments.map((equipment: Equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.asset_number}
                </option>
              ))}
            </select>
          </div>

          {/* TANGGAL */}
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) =>
              setForm({
                ...form,
                tanggal: e.target.value,
              })
            }
          />

          {/* DARI LOKASI */}
          <Input
            label="Dari Lokasi"
            value={form.dari_lokasi}
            onChange={(e) =>
              setForm({
                ...form,
                dari_lokasi: e.target.value,
              })
            }
            placeholder="Lokasi asal equipment"
          />

          {/* KE LOKASI */}
          <Input
            label="Ke Lokasi"
            value={form.ke_lokasi}
            onChange={(e) =>
              setForm({
                ...form,
                ke_lokasi: e.target.value,
              })
            }
            placeholder="Lokasi tujuan equipment"
          />

          {/* PROYEK */}
          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  id_proyek: e.target.value || null,
                })
              }
            >
              <option value="">-- Pilih Proyek --</option>

              {projects.map((project: Proyek) => (
                <option key={project.id} value={project.id}>
                  {project.kode_proyek} - {project.nama_proyek}
                  {project.status ? ` (${project.status})` : ""}
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
