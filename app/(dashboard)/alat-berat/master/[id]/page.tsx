"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Equipment {
  id: string;
  asset_number: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  year: number;
  site_id: string;
  status: string;
  created_at: string;
}

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/master/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data equipment", "error");
        setLoading(false);
        return;
      }

      const data: Equipment = await res.json();

      setEquipment(data);
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

  if (!equipment) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">


        <Card title="Detail Equipment">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Asset Number</p>
              <p>{equipment.asset_number}</p>
            </div>

            <div>
              <p className="font-semibold">Type</p>
              <p>{equipment.type}</p>
            </div>

            <div>
              <p className="font-semibold">Brand</p>
              <p>{equipment.brand}</p>
            </div>

            <div>
              <p className="font-semibold">Model</p>
              <p>{equipment.model}</p>
            </div>

            <div>
              <p className="font-semibold">Serial Number</p>
              <p>{equipment.serial_number}</p>
            </div>

            <div>
              <p className="font-semibold">Year</p>
              <p>{equipment.year}</p>
            </div>

            <div>
              <p className="font-semibold">Site ID</p>
              <p>{equipment.site_id}</p>
            </div>

            <div>
              <p className="font-semibold">Status</p>
              <p>{equipment.status}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/master")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() =>
                router.push(`/alat-berat/master/${equipment.id}/edit`)
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
