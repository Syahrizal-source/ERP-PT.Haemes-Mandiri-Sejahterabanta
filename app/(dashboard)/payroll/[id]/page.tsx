"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Payroll {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  pph21: number;
  bpjs: number;
  net_gaji: number;
  created_at: string;
}

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/payroll/${params.id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data payroll", "error");
      setLoading(false);
      return;
    }

    const result: Payroll = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);// eslint-disable-next-line react-hooks/exhaustive-deps


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
        <Card title="Detail Payroll">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Periode</p>
              <p>{data.bulan}/{data.tahun}</p>
            </div>

            <div>
              <p className="font-semibold">Tanggal</p>
              <p>{data.created_at}</p>
            </div>

            <div>
              <p className="font-semibold">Total Gaji</p>
              <p>{data.total_gaji.toLocaleString("id-ID")}</p>
            </div>

            <div>
              <p className="font-semibold">Tunjangan</p>
              <p>{data.total_tunjangan.toLocaleString("id-ID")}</p>
            </div>

            <div>
              <p className="font-semibold">Potongan</p>
              <p>{data.total_potongan.toLocaleString("id-ID")}</p>
            </div>

            <div>
              <p className="font-semibold">PPh21</p>
              <p>{data.pph21.toLocaleString("id-ID")}</p>
            </div>

            <div>
              <p className="font-semibold">BPJS</p>
              <p>{data.bpjs.toLocaleString("id-ID")}</p>
            </div>

            <div>
              <p className="font-semibold">Net Gaji</p>
              <p className="font-bold text-green-600">
                {data.net_gaji.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/payroll")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}