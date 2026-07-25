"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Data {
  id: number;
  tanggal: string;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
}

export default function Page() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/pembayaran-hutang/${id}`);
      const result: Data = await res.json();
      setData(result);
    }

    fetchData();
  }, [id]);

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Pembayaran Hutang">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>Tanggal: {data.tanggal}</p>
          <p>Nominal: {data.nominal.toLocaleString("id-ID")}</p>
          <p>PPN: {data.ppn.toLocaleString("id-ID")}</p>
          <p>PPh23: {data.pph23.toLocaleString("id-ID")}</p>
          <p>Total: {data.total.toLocaleString("id-ID")}</p>
          <p>Keterangan: {data.keterangan}</p>
        </div>

        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
