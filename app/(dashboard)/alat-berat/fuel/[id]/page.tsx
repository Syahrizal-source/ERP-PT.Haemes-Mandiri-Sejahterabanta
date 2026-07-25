"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Fuel {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  liter: number;
  harga: number;
  total: number;
  supplier: string | null;
  id_jurnal: number | null;
  created_at: string;
}

interface Equipment {
  id: string;
  asset_number: string;
}

interface Operation {
  id: string;
  equipment_id: string;
  total_jam: number;
}

export default function FuelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [fuel, setFuel] = useState<Fuel | null>(null);
  const [equipmentName, setEquipmentName] = useState<string>("");

  const [fuelPerHour, setFuelPerHour] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const fuelRes = await fetch(`/api/alat-berat/fuel/${id}`);

      if (!fuelRes.ok) {
        showToast("Gagal mengambil data fuel", "error");
        setLoading(false);
        return;
      }

      const fuelData: Fuel = await fuelRes.json();
      setFuel(fuelData);

      const [eqRes, opRes] = await Promise.all([
        fetch("/api/alat-berat/master"),
        fetch("/api/alat-berat/operation"),
      ]);

      const equipments: Equipment[] = await eqRes.json();
      const operations: Operation[] = await opRes.json();

      const equipment = equipments.find(
        (item) => item.id === fuelData.equipment_id,
      );

      setEquipmentName(equipment ? equipment.asset_number : "-");

      const equipmentOps = operations.filter(
        (item) => item.equipment_id === fuelData.equipment_id,
      );

      const totalJam = equipmentOps.reduce(
        (acc, item) => acc + item.total_jam,
        0,
      );

      if (totalJam > 0) {
        setFuelPerHour(Number((fuelData.liter / totalJam).toFixed(2)));
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

  if (!fuel) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <Card title="Detail Fuel">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Equipment</p>
              <p>{equipmentName}</p>
            </div>

            <div>
              <p className="font-semibold">Tanggal</p>
              <p>{fuel.tanggal}</p>
            </div>

            <div>
              <p className="font-semibold">Liter</p>
              <p>{fuel.liter}</p>
            </div>

            <div>
              <p className="font-semibold">Harga</p>
              <p>{fuel.harga}</p>
            </div>

            <div>
              <p className="font-semibold">Total</p>
              <p>{fuel.total}</p>
            </div>

            <div>
              <p className="font-semibold">Supplier</p>
              <p>{fuel.supplier ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Fuel Consumption / Hour</p>
              <p>{fuelPerHour} Liter / Jam</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/fuel")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() => router.push(`/alat-berat/fuel/${fuel.id}/edit`)}
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
