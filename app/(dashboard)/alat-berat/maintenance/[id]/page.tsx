"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2, AlertTriangle } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Maintenance {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  jenis: string | null;
  vendor_id: number | null;
  hm_service: number | null;
  biaya: number | null;
  id_jurnal: number | null;
  keterangan: string | null;
  created_at: string;
}

interface Equipment {
  id: string;
  asset_number: string;
}

interface Vendor {
  id: number;
  nama: string;
}

interface Operation {
  id: string;
  equipment_id: string;
  hm_akhir: number;
}

export default function MaintenanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);

  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);

  const [equipmentName, setEquipmentName] = useState<string>("-");
  const [vendorName, setVendorName] = useState<string>("");

  const [hmTerakhir, setHmTerakhir] = useState<number>(0);

  const serviceInterval = 250;

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const maintenanceRes = await fetch(`/api/alat-berat/maintenance/${id}`);

      if (!maintenanceRes.ok) {
        showToast("Gagal mengambil data maintenance", "error");
        setLoading(false);
        return;
      }

      const maintenanceData: Maintenance = await maintenanceRes.json();
      setMaintenance(maintenanceData);

      const [eqRes, vendorRes, opRes] = await Promise.all([
        fetch("/api/alat-berat/master"),
        fetch("/api/vendors"),
        fetch("/api/alat-berat/operation"),
      ]);

      const equipments: Equipment[] = await eqRes.json();
      const vendors: Vendor[] = await vendorRes.json();
      const operations: Operation[] = await opRes.json();

      const equipment = equipments.find(
        (item) => item.id === maintenanceData.equipment_id,
      );

      const vendor = vendors.find(
        (item) => item.id === maintenanceData.vendor_id,
      );

      setEquipmentName(equipment ? equipment.asset_number : "-");
      setVendorName(vendor ? vendor.nama : "-");

      const equipmentOps = operations
        .filter((item) => item.equipment_id === maintenanceData.equipment_id)
        .sort((a, b) => b.hm_akhir - a.hm_akhir);

      if (equipmentOps.length > 0) {
        setHmTerakhir(equipmentOps[0].hm_akhir);
      }

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!maintenance) return null;

  const nextService = (maintenance.hm_service ?? 0) + serviceInterval;

  const reminder = hmTerakhir >= nextService;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        {reminder && (
          <div className="mb-4 p-4 border rounded bg-red-50 flex gap-2 items-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Service Reminder: Equipment sudah melewati interval service
          </div>
        )}

        <Card title="Detail Maintenance">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Equipment</p>
              <p>{equipmentName}</p>
            </div>

            <div>
              <p className="font-semibold">Tanggal</p>
              <p>{maintenance.tanggal}</p>
            </div>

            <div>
              <p className="font-semibold">Jenis</p>
              <p>{maintenance.jenis ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Vendor</p>
              <p>{vendorName}</p>
            </div>

            <div>
              <p className="font-semibold">HM Service</p>
              <p>{maintenance.hm_service ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">HM Terakhir</p>
              <p>{hmTerakhir}</p>
            </div>

            <div>
              <p className="font-semibold">Biaya</p>
              <p>{maintenance.biaya ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Keterangan</p>
              <p>{maintenance.keterangan ?? "-"}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/maintenance")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() =>
                router.push(`/alat-berat/maintenance/${maintenance.id}/edit`)
              }
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
