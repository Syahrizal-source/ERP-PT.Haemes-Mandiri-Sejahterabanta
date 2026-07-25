"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import { ProyekMaster } from "@/types/proyek";

type ProyekForm = Omit<ProyekMaster, "id">;

export default function CreateProyekPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<ProyekForm>({
    kode_proyek: "",
    nama_proyek: "",
    lokasi: "",
    customer: "",
    jenis_proyek: "lainnya",
    nilai_kontrak: 0,
    tanggal_mulai: "",
    tanggal_selesai: "",
    project_manager: "",
    status: "draft",
    margin_target: 0,
    metode_kontrak: "lumpsum",
  });

  function handleChange<K extends keyof ProyekForm>(
    field: K,
    value: ProyekForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.nilai_kontrak < 0) {
      showToast("Nilai kontrak tidak boleh negatif", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/proyek/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan proyek",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Proyek Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/proyek");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kode Proyek"
            value={form.kode_proyek}
            onChange={(e) => handleChange("kode_proyek", e.target.value)}
          />

          <Input
            label="Nama Proyek"
            value={form.nama_proyek}
            onChange={(e) => handleChange("nama_proyek", e.target.value)}
          />

          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) => handleChange("customer", e.target.value)}
          />

          <Input
            label="Lokasi"
            value={form.lokasi ?? ""}
            onChange={(e) => handleChange("lokasi", e.target.value)}
          />

          <Input
            label="Margin Target (%)"
            type="number"
            min={0}
            value={form.margin_target ?? 0}
            onChange={(e) =>
              handleChange("margin_target", Number(e.target.value))
            }
          />

          {/* JENIS PROYEK */}
          <div>
            <label className="text-sm font-medium">Jenis Proyek</label>
            <select
              className="w-full border rounded p-2"
              value={form.jenis_proyek}
              onChange={(e) =>
                handleChange(
                  "jenis_proyek",
                  e.target.value as ProyekForm["jenis_proyek"],
                )
              }
            >
              <option value="earthwork">Earthwork</option>
              <option value="hauling">Hauling</option>
              <option value="mining">Mining</option>
              <option value="konstruksi">Konstruksi</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          {/* METODE KONTRAK */}
          <div>
            <label className="text-sm font-medium">Metode Kontrak</label>
            <select
              className="w-full border rounded p-2"
              value={form.metode_kontrak}
              onChange={(e) =>
                handleChange(
                  "metode_kontrak",
                  e.target.value as ProyekForm["metode_kontrak"],
                )
              }
            >
              <option value="lumpsum">Lumpsum</option>
              <option value="unit_price">Unit Price</option>
            </select>
          </div>

          {/* STATUS */}
          <div>
            <label className="text-sm font-medium">Status Proyek</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as ProyekForm["status"])
              }
            >
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <Input
            label="Nilai Kontrak"
            type="number"
            min={0}
            value={form.nilai_kontrak}
            onChange={(e) =>
              handleChange("nilai_kontrak", Number(e.target.value))
            }
          />

          <Input
            label="Tanggal Mulai"
            type="date"
            value={form.tanggal_mulai}
            onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
          />

          <Input
            label="Tanggal Selesai"
            type="date"
            value={form.tanggal_selesai ?? ""}
            onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
          />

          <Input
            label="Project Manager"
            value={form.project_manager}
            onChange={(e) => handleChange("project_manager", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push("/proyek")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
