"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
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
  customer: string;
  status: string;
}

interface RentalForm {
  equipment_id: string;
  tanggal: string;
  id_proyek: string | null;
  customer: string;
  jam: number;
  harga_jam: number;
}

export default function CreateRentalPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Proyek[]>([]);

  const [form, setForm] = useState<RentalForm>({
    equipment_id: "",
    tanggal: "",
    id_proyek: null,
    customer: "",
    jam: 0,
    harga_jam: 0,
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
      showToast("Gagal mengambil data proyek", "error");
      return;
    }

    const data: Proyek[] = await res.json();

    const runningProjects: Proyek[] = data.filter(
      (p) => p.status === "running",
    );

    setProjects(runningProjects);
  }

  function handleProjectChange(id: string): void {
    const proyek: Proyek | undefined = projects.find((p) => p.id === id);

    setForm({
      ...form,
      id_proyek: id,
      customer: proyek ? proyek.customer : "",
    });
  }

  const subtotal: number = form.jam * form.harga_jam;
  const ppn: number = subtotal * 0.11;
  const pph23: number = subtotal * 0.02;
  const total: number = subtotal + ppn - pph23;

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/alat-berat/rental", {
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
        text: "Gagal menyimpan rental",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Rental Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/rental");
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Rental">
        <div className="grid grid-cols-2 gap-4">
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

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />

          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">-- Proyek --</option>

              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode_proyek} - {p.nama_proyek}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
          />

          <Input
            label="Jam Operasi"
            type="number"
            value={form.jam}
            onChange={(e) => setForm({ ...form, jam: Number(e.target.value) })}
          />

          <Input
            label="Harga per Jam"
            type="number"
            value={form.harga_jam}
            onChange={(e) =>
              setForm({ ...form, harga_jam: Number(e.target.value) })
            }
          />
        </div>

        <div className="mt-6 space-y-1 text-sm">
          <p>Subtotal: {subtotal.toLocaleString("id-ID")}</p>
          <p>PPN (11%): {ppn.toLocaleString("id-ID")}</p>
          <p>PPh23 (2%): {pph23.toLocaleString("id-ID")}</p>
          <p className="font-semibold">
            Total: {total.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/rental")}
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
