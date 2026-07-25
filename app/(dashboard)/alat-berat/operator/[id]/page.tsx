"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Operator {
  id: string;
  nama: string;
  no_hp: string | null;
  sim: string | null;
  status: string;
  created_at: string;
}

export default function OperatorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [data, setData] = useState<Operator | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/operator/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data operator", "error");
        setLoading(false);
        return;
      }

      const result: Operator = await res.json();

      setData(result);
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <Card title="Detail Operator">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Nama</p>
              <p>{data.nama}</p>
            </div>

            <div>
              <p className="font-semibold">No HP</p>
              <p>{data.no_hp ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">SIM</p>
              <p>{data.sim ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Status</p>
              <p>{data.status}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/operator")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() => router.push(`/alat-berat/operator/${data.id}/edit`)}
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
