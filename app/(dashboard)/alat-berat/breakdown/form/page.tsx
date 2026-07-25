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
    fetchEquipments();// eslint-disable-next-line react-hooks/exhaustive-deps
    fetchOperators();// eslint-disable-next-line react-hooks/exhaustive-deps
    fetchProjects();// eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function fetchOperators(): Promise<void> {
    const res = await fetch("/api/alat-berat/operator");

    if (!res.ok) {
      showToast("Gagal mengambil operator", "error");
      return;
    }

    const data: Operator[] = await res.json();
    setOperators(data);
  }

  async function fetchProjects(): Promise<void> {
    const res = await fetch("/api/proyek/master");

    if (!res.ok) {
      showToast("Gagal mengambil proyek", "error");
      return;
    }

    const data: Proyek[] = await res.json();

    const running = data.filter((p) => p.status === "running");

    setProjects(running);
  }

  function calculateDurasi(): number {
    if (!form.tanggal_mulai || !form.tanggal_selesai) {
      return 0;
    }

    const start = new Date(form.tanggal_mulai);
    const end = new Date(form.tanggal_selesai);

    const diff = end.getTime() - start.getTime();

    const hours = diff / (1000 * 60 * 60);

    return hours > 0 ? Number(hours.toFixed(2)) : 0;
  }

  const durasiJam = calculateDurasi();

  async function handleSubmit(): Promise<void> {
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
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan breakdown",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Breakdown Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/breakdown");
      router.refresh();
    });
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

          {/* OPERATOR */}
          <div>
            <label className="text-sm font-medium">Operator</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_operator ?? ""}
              onChange={(e) =>
                setForm({ ...form, id_operator: e.target.value })
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
              setForm({ ...form, tanggal_mulai: e.target.value })
            }
          />

          {/* TANGGAL SELESAI */}
          <Input
            label="Tanggal Selesai"
            type="datetime-local"
            value={form.tanggal_selesai}
            onChange={(e) =>
              setForm({ ...form, tanggal_selesai: e.target.value })
            }
          />

          {/* PROYEK */}
          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) => setForm({ ...form, id_proyek: e.target.value })}
            >
              <option value="">-- Tanpa Proyek --</option>

              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode_proyek} - {p.nama_proyek}
                </option>
              ))}
            </select>
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
            onChange={(e) => setForm({ ...form, penyebab: e.target.value })}
          />
        </div>

        {/* TINDAKAN */}
        <div className="mt-4">
          <label className="text-sm font-medium">Tindakan</label>

          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={form.tindakan}
            onChange={(e) => setForm({ ...form, tindakan: e.target.value })}
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
