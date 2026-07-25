"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PiutangInternalDetail {
  id_piutang: number;
  tanggal: string;
  pihak: string;
  keterangan: string;
  nominal: number;
  status: string;
}

export default function DetailPiutangInternalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [data, setData] = useState<PiutangInternalDetail | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/piutang-internal/${params.id}`);

    if (!res.ok) {
      showToast("Gagal mengambil detail piutang internal", "error");
      return;
    }

    const result: PiutangInternalDetail = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Detail Piutang Internal">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Tanggal</p>
            <p className="font-medium">{data.tanggal}</p>
          </div>

          <div>
            <p className="text-gray-500">Pihak</p>
            <p className="font-medium">{data.pihak}</p>
          </div>

          <div>
            <p className="text-gray-500">Nominal</p>
            <p className="font-medium">{data.nominal.toLocaleString()}</p>
          </div>

          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium">{data.status}</p>
          </div>

          <div className="col-span-2">
            <p className="text-gray-500">Keterangan</p>
            <p className="font-medium">{data.keterangan}</p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/piutang-internal")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
