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

interface Operator {
  id: string;
  nama: string;
}

interface Proyek {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  status: string;
}

interface OperationForm {
  equipment_id: string;
  tanggal: string;
  id_operator: string | null;
  id_proyek: string | null;
  hm_awal: number;
  hm_akhir: number;
  keterangan: string;
}

export default function CreateOperationPage() {
  const router = useRouter();

  const { showToast } = useToast();

  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [operators, setOperators] = useState<Operator[]>([]);

  const [projects, setProjects] = useState<Proyek[]>([]);

  const [form, setForm] = useState<OperationForm>({
    equipment_id: "",
    tanggal: "",
    id_operator: null,
    id_proyek: null,
    hm_awal: 0,
    hm_akhir: 0,
    keterangan: "",
  });

  useEffect(() => {
    void fetchEquipments();
    void fetchOperators();
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

  async function fetchOperators(): Promise<void> {
    try {
      const res = await fetch("/api/alat-berat/operator");

      if (!res.ok) {
        showToast("Gagal mengambil operator", "error");
        return;
      }

      const data: Operator[] = await res.json();

      setOperators(data);
    } catch {
      showToast("Gagal mengambil operator", "error");
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
       * Mengikuti halaman Master Proyek:
       * semua proyek dari /api/proyek/master ditampilkan.
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

  const totalJam: number =
    form.hm_akhir > form.hm_awal ? form.hm_akhir - form.hm_awal : 0;

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
        text: "Silakan pilih tanggal operation.",
      });

      return;
    }

    if (form.hm_akhir <= form.hm_awal) {
      await Swal.fire({
        icon: "warning",
        title: "HM tidak valid",
        text: "HM Akhir harus lebih besar dari HM Awal.",
      });

      return;
    }

    if (totalJam <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Total jam tidak valid",
        text: "Total jam operation harus lebih dari 0.",
      });

      return;
    }

    try {
      const res = await fetch("/api/alat-berat/operation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          total_jam: totalJam,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Gagal menyimpan operation";

        try {
          const errorData: {
            error?: string;
            message?: string;
          } = await res.json();

          errorMessage = errorData.error ?? errorData.message ?? errorMessage;
        } catch {
          // Gunakan pesan default.
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
        title: "Operation Berhasil Masuk",
        text: result.message ?? "Operation berhasil disimpan.",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/alat-berat/operation");
      router.refresh();
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan saat menyimpan operation.",
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Equipment Operation">
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

          {/* OPERATOR */}
          <div>
            <label className="text-sm font-medium">Operator</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_operator ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  id_operator: e.target.value || null,
                })
              }
            >
              <option value="">-- Pilih Operator --</option>

              {operators.map((operator: Operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.nama}
                </option>
              ))}
            </select>
          </div>

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

          {/* HM AWAL */}
          <Input
            label="HM Awal"
            type="number"
            value={form.hm_awal}
            min={0}
            onChange={(e) =>
              setForm({
                ...form,
                hm_awal: Number(e.target.value),
              })
            }
          />

          {/* HM AKHIR */}
          <Input
            label="HM Akhir"
            type="number"
            value={form.hm_akhir}
            min={0}
            onChange={(e) =>
              setForm({
                ...form,
                hm_akhir: Number(e.target.value),
              })
            }
          />
        </div>

        {/* TOTAL JAM */}
        <div className="mt-4 rounded border bg-gray-50 p-3 text-sm">
          <p className="font-medium">Total Jam</p>

          <p className="text-lg font-semibold">{totalJam} Jam</p>
        </div>

        {/* KETERANGAN */}
        <div className="mt-4">
          <label className="text-sm font-medium">Keterangan</label>

          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={form.keterangan}
            onChange={(e) =>
              setForm({
                ...form,
                keterangan: e.target.value,
              })
            }
            placeholder="Keterangan operation..."
          />
        </div>

        {/* BUTTON */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/operation")}
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
