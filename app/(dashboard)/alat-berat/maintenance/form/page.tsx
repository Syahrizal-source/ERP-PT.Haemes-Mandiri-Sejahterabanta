"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
}

interface MaintenanceForm {
  equipment_id: string;
  tanggal: string;
  jenis: string;
  vendor_id: number;
  hm_service: number;
  biaya: number;
  keterangan: string;
}

export default function CreateMaintenancePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState<MaintenanceForm>({
    equipment_id: "",
    tanggal: "",
    jenis: "",
    vendor_id: 0,
    hm_service: 0,
    biaya: 0,
    keterangan: "",
  });

  useEffect(() => {
    async function fetchMaster(): Promise<void> {
      const equipmentRes = await fetch("/api/alat-berat/master");
      const vendorRes = await fetch("/api/vendors");

      if (!equipmentRes.ok || !vendorRes.ok) {
        showToast("Gagal mengambil data master", "error");
        return;
      }

      const equipmentData: Equipment[] = await equipmentRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setEquipments(equipmentData);
      setVendors(vendorData);
    }

    fetchMaster();
  }, [showToast]);

  function handleChange<K extends keyof MaintenanceForm>(
    field: K,
    value: MaintenanceForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/maintenance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);


    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan maintenance",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Maintenance Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/maintenance");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Maintenance">
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
            <label className="text-sm font-medium">Tanggal</label>

            <Input
              type="date"
              className="w-full border rounded p-2"
              value={form.tanggal}
              onChange={(e) => handleChange("tanggal", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Jenis Maintenance</label>

            <Input
              className="w-full border rounded p-2"
              value={form.jenis}
              onChange={(e) => handleChange("jenis", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Vendor</label>

            <select
              className="w-full border rounded p-2"
              value={form.vendor_id}
              onChange={(e) =>
                handleChange("vendor_id", Number(e.target.value))
              }
            >
              <option value={0}>-- Pilih Vendor --</option>

              {vendors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode_vendor} - {item.nama_vendor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">HM Service</label>

            <Input
              type="number"
              className="w-full border rounded p-2"
              value={form.hm_service}
              onChange={(e) =>
                handleChange("hm_service", Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Biaya</label>

            <Input
              type="number"
              className="w-full border rounded p-2"
              value={form.biaya}
              onChange={(e) => handleChange("biaya", Number(e.target.value))}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Keterangan</label>

            <Input
              className="w-full border rounded p-2"
              value={form.keterangan}
              onChange={(e) => handleChange("keterangan", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/maintenance")}
          >
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
