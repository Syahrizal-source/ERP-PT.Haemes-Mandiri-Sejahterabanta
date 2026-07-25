"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* ========================= */

interface Detail {
  tanggal: string;
  deskripsi: string;
  pihak: string;
  total_pinjaman: number;
  saldo: number;
}

/* ========================= */

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<Detail | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/pinjaman-non-bank/${id}`);

    const result: Detail = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <Card title="Detail Pinjaman">
          <div className="flex justify-between">
            <span className="text-yellow-500">Tanggal</span>
            <span className="font-medium text-right">
              {data.tanggal}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-500">Pihak</span>
            <span className="font-medium text-right">
              {data.pihak}
            </span>
          </div>
          <div className="flex justify-between sm:col-span-2">
            <span className="text-yellow-500">Deskripsi</span>
            <span className="font-medium text-right">
              {data.deskripsi}
            </span>
          </div>


          <div className="flex justify-between">
            <span className="text-yellow-500">Total</span>
            <span className="font-semibold text-blue-600 text-right">
              {data.total_pinjaman.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-yellow-500">Sisa Saldo</span>
            <span className="font-semibold text-green-600 text-right">
              {data.saldo.toLocaleString("id-ID")}
            </span>
          </div>
        </Card>
        <Button
          variant="secondary"
          onClick={() => router.push("/accounting/pinjaman-non-bank")}
        >
          Kembali
        </Button>
      </div>
    </div>
  );
}
