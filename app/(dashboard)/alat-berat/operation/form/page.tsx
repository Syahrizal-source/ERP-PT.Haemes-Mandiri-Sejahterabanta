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
    fetchEquipments();// eslint-disable-next-line react-hooks/exhaustive-deps
    fetchOperators();// eslint-disable-next-line react-hooks/exhaustive-deps
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

  const totalJam: number =
    form.hm_akhir > form.hm_awal ? form.hm_akhir - form.hm_awal : 0;

  async function handleSubmit(): Promise<void> {
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
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan operation",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Operation Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/operation");
      router.refresh();
    });
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

          {/* HM AWAL */}
          <Input
            label="HM Awal"
            type="number"
            value={form.hm_awal}
            onChange={(e) =>
              setForm({ ...form, hm_awal: Number(e.target.value) })
            }
          />

          {/* HM AKHIR */}
          <Input
            label="HM Akhir"
            type="number"
            value={form.hm_akhir}
            onChange={(e) =>
              setForm({ ...form, hm_akhir: Number(e.target.value) })
            }
          />
        </div>

        {/* TOTAL JAM */}
        <div className="mt-4 text-sm">
          <p>Total Jam: {totalJam}</p>
        </div>

        {/* KETERANGAN */}
        <div className="mt-4">
          <label className="text-sm font-medium">Keterangan</label>

          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
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
