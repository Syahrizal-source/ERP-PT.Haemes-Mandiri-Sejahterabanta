"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Save, ArrowLeft } from "lucide-react";

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
    void fetchEquipments();
    void fetchProjects();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEquipments(): Promise<void> {
    try {
      const res = await fetch("/api/alat-berat/master");

      if (!res.ok) {
        showToast("Gagal mengambil equipment", "error");
        return;
      }

      const data: Equipment[] = await res.json();

      const equipmentList: Equipment[] = data
        .filter(
          (equipment: Equipment) =>
            typeof equipment.id === "string" &&
            equipment.id.trim().length > 0 &&
            typeof equipment.asset_number === "string" &&
            equipment.asset_number.trim().length > 0,
        )
        .sort((a: Equipment, b: Equipment) =>
          a.asset_number.localeCompare(b.asset_number, "id", {
            numeric: true,
            sensitivity: "base",
          }),
        );

      setEquipments(equipmentList);
    } catch {
      showToast("Gagal mengambil equipment", "error");
    }
  }

  async function fetchProjects(): Promise<void> {
    try {
      const res = await fetch("/api/proyek/master");

      if (!res.ok) {
        showToast("Gagal mengambil data proyek", "error");
        return;
      }

      const data: Proyek[] = await res.json();

      /*
       * Jangan filter berdasarkan status.
       *
       * Halaman Master Proyek juga menampilkan seluruh data
       * dari /api/proyek/master.
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
      showToast("Gagal mengambil data proyek", "error");
    }
  }

  function handleProjectChange(id: string): void {
    if (!id) {
      setForm((previous: RentalForm) => ({
        ...previous,
        id_proyek: null,
        customer: "",
      }));

      return;
    }

    const proyek: Proyek | undefined = projects.find(
      (project: Proyek) => project.id === id,
    );

    setForm((previous: RentalForm) => ({
      ...previous,
      id_proyek: id,
      customer: proyek?.customer ?? "",
    }));
  }

  const subtotal: number = form.jam * form.harga_jam;
  const total: number = subtotal;

  async function handleSubmit(): Promise<void> {
    if (!form.equipment_id) {
      showToast("Equipment wajib dipilih", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi", "error");
      return;
    }

    if (form.jam <= 0) {
      showToast("Jam operasi harus lebih dari 0", "error");
      return;
    }

    if (form.harga_jam <= 0) {
      showToast("Harga per jam harus lebih dari 0", "error");
      return;
    }

    try {
      const res = await fetch("/api/alat-berat/rental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData: { error?: string } = await res.json();

        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: errorData.error ?? "Gagal menyimpan rental",
        });

        return;
      }

      const result: { message?: string } = await res.json();

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Rental Berhasil Masuk",
        text: result.message ?? "Data rental berhasil disimpan",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/alat-berat/rental");
      router.refresh();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan saat menyimpan rental",
      });
    }
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

          <div>
            <label className="text-sm font-medium">Proyek</label>

            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) => handleProjectChange(e.target.value)}
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

          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) =>
              setForm({
                ...form,
                customer: e.target.value,
              })
            }
          />

          <Input
            label="Jam Operasi"
            type="number"
            value={form.jam}
            onChange={(e) =>
              setForm({
                ...form,
                jam: Number(e.target.value),
              })
            }
          />

          <Input
            label="Harga per Jam"
            type="number"
            value={form.harga_jam}
            onChange={(e) =>
              setForm({
                ...form,
                harga_jam: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="mt-6 space-y-1 text-sm">
          <p>Subtotal: {subtotal.toLocaleString("id-ID")}</p>

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
