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

interface BreakdownForm {
  equipment_id: string;
  id_operator: string | null;
  id_proyek: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  penyebab: string;
  tindakan: string;
}

export default function CreateBreakdownPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [projects, setProjects] = useState<Proyek[]>([]);

  const [form, setForm] = useState<BreakdownForm>({
    equipment_id: "",
    id_operator: null,
    id_proyek: null,
    tanggal_mulai: "",
    tanggal_selesai: "",
    penyebab: "",
    tindakan: "",
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
       * Menggunakan seluruh proyek yang dikembalikan
       * oleh API /api/proyek/master.
       *
       * Tidak menggunakan filter:
       * status === "running"
       *
       * Tujuannya agar dropdown Breakdown mengikuti
       * daftar proyek yang sama dengan halaman Master Proyek.
       */

      const projectList: Proyek[] = data
        .filter(
          (project) =>
            typeof project.id === "string" &&
            project.id.length > 0 &&
            typeof project.kode_proyek === "string" &&
            typeof project.nama_proyek === "string",
        )
        .sort((a, b) => {
          const kodeA: string = a.kode_proyek.trim();
          const kodeB: string = b.kode_proyek.trim();

          return kodeA.localeCompare(kodeB, "id", {
            numeric: true,
            sensitivity: "base",
          });
        });

      setProjects(projectList);
    } catch {
      showToast("Gagal mengambil proyek", "error");
    }
  }

  function calculateDurasi(): number {
    if (!form.tanggal_mulai || !form.tanggal_selesai) {
      return 0;
    }

    const start = new Date(form.tanggal_mulai);
    const end = new Date(form.tanggal_selesai);

    const diff: number = end.getTime() - start.getTime();
    const hours: number = diff / (1000 * 60 * 60);

    return hours > 0 ? Number(hours.toFixed(2)) : 0;
  }

  const durasiJam: number = calculateDurasi();

  async function handleSubmit(): Promise<void> {
    if (!form.equipment_id) {
      Swal.fire({
        icon: "warning",
        title: "Equipment belum dipilih",
        text: "Silakan pilih equipment terlebih dahulu.",
      });

      return;
    }

    if (!form.tanggal_mulai) {
      Swal.fire({
        icon: "warning",
        title: "Tanggal mulai belum diisi",
        text: "Silakan isi tanggal mulai breakdown.",
      });

      return;
    }

    if (!form.tanggal_selesai) {
      Swal.fire({
        icon: "warning",
        title: "Tanggal selesai belum diisi",
        text: "Silakan isi tanggal selesai breakdown.",
      });

      return;
    }

    if (durasiJam <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Durasi tidak valid",
        text: "Tanggal selesai harus lebih besar dari tanggal mulai.",
      });

      return;
    }

    try {
      const res = await fetch("/api/alat-berat/breakdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          durasi_jam: durasiJam,
        }),
      });

      if (!res.ok) {
        const result: unknown = await res.json().catch(() => null);

        const message: string =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Gagal menyimpan breakdown";

        await Swal.fire({
          icon: "error",
          title: "Oops...",
          text: message,
        });

        return;
      }

      const result: { message?: string } = await res.json();

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Breakdown Berhasil Masuk",
        text: result.message ?? "Breakdown berhasil disimpan.",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/alat-berat/breakdown");
      router.refresh();
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan saat menyimpan breakdown.",
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Breakdown">
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

              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.asset_number}
                </option>
              ))}
            </select>
          </div>

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

              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nama}
                </option>
              ))}
            </select>
          </div>

          {/* TANGGAL MULAI */}
          <Input
            label="Tanggal Mulai"
            type="datetime-local"
            value={form.tanggal_mulai}
            onChange={(e) =>
              setForm({
                ...form,
                tanggal_mulai: e.target.value,
              })
            }
          />

          {/* TANGGAL SELESAI */}
          <Input
            label="Tanggal Selesai"
            type="datetime-local"
            value={form.tanggal_selesai}
            onChange={(e) =>
              setForm({
                ...form,
                tanggal_selesai: e.target.value,
              })
            }
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
              <option value="">-- Tanpa Proyek --</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.kode_proyek} - {project.nama_proyek}
                  {project.status ? ` (${project.status})` : ""}
                </option>
              ))}
            </select>

            {projects.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Tidak ada data proyek.
              </p>
            )}
          </div>

          {/* DURASI */}
          <div>
            <label className="text-sm font-medium">Durasi Jam</label>

            <input
              className="w-full border rounded p-2 bg-gray-100"
              value={durasiJam}
              readOnly
            />
          </div>
        </div>

        {/* PENYEBAB */}
        <div className="mt-4">
          <label className="text-sm font-medium">Penyebab</label>

          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={form.penyebab}
            onChange={(e) =>
              setForm({
                ...form,
                penyebab: e.target.value,
              })
            }
          />
        </div>

        {/* TINDAKAN */}
        <div className="mt-4">
          <label className="text-sm font-medium">Tindakan</label>

          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={form.tindakan}
            onChange={(e) =>
              setForm({
                ...form,
                tindakan: e.target.value,
              })
            }
          />
        </div>

        {/* BUTTON */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/breakdown")}
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
