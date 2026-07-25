"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Depreciation {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  nilai: number;
  created_at: string;
}

export default function DepreciationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [data, setData] = useState<Depreciation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/depreciation/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data depreciation", "error");
        setLoading(false);
        return;
      }

      const result: Depreciation = await res.json();

      setData(result);
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

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <Card title="Detail Depreciation">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Equipment ID</p>
              <p>{data.equipment_id ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Tanggal</p>
              <p>{data.tanggal}</p>
            </div>

            <div>
              <p className="font-semibold">Nilai Depreciation</p>
              <p>{data.nilai}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/depreciation")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() =>
                router.push(`/alat-berat/depreciation/${data.id}/edit`)
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
