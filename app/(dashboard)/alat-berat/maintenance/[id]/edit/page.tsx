"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface MaintenanceResponse {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  jenis: string | null;
  vendor_id: number | null;
  hm_service: number | null;
  biaya: number | null;
  keterangan: string | null;
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

export default function EditMaintenancePage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

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
    async function fetchData(): Promise<void> {
      const [maintenanceRes, eqRes, vendorRes] = await Promise.all([
        fetch(`/api/alat-berat/maintenance/${id}`),
        fetch("/api/alat-berat/master"),
        fetch("/api/vendors"),
      ]);

      const maintenance: MaintenanceResponse = await maintenanceRes.json();
      const equipmentData: Equipment[] = await eqRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setEquipments(equipmentData);
      setVendors(vendorData);

      setForm({
        equipment_id: maintenance.equipment_id ?? "",
        tanggal: maintenance.tanggal,
        jenis: maintenance.jenis ?? "",
        vendor_id: maintenance.vendor_id ?? 0,
        hm_service: maintenance.hm_service ?? 0,
        biaya: maintenance.biaya ?? 0,
        keterangan: maintenance.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [id]);

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
    setSaving(true);

    const res = await fetch(`/api/alat-berat/maintenance/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

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
      title: "Update Maintenance Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/maintenance");
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Maintenance">
        <div className="grid grid-cols-2 gap-4">
          <select
            className="border rounded p-2"
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

          <Input
            type="date"
            className="border rounded p-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            className="border rounded p-2"
            value={form.jenis}
            onChange={(e) => handleChange("jenis", e.target.value)}
          />

          <select
            className="border rounded p-2"
            value={form.vendor_id}
            onChange={(e) => handleChange("vendor_id", Number(e.target.value))}
          >
            <option value={0}>-- Pilih Vendor --</option>

            {vendors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kode_vendor} - {item.nama_vendor}
              </option>
            ))}
          </select>

          <Input
            type="number"
            className="border rounded p-2"
            value={form.hm_service}
            onChange={(e) => handleChange("hm_service", Number(e.target.value))}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.biaya}
            onChange={(e) => handleChange("biaya", Number(e.target.value))}
          />

          <Input
            className="border rounded p-2"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/maintenance/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
