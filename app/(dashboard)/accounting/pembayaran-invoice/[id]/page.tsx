"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PembayaranDetail {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  keterangan: string;
}

export default function DetailPembayaranPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [data, setData] = useState<PembayaranDetail | null>(null);

  async function fetchDetail(): Promise<void> {
    const res = await fetch(`/api/pembayaran-invoice/${id}`);

    if (!res.ok) {
      showToast("Gagal mengambil detail pembayaran", "error");
      router.push("/accounting/pembayaran-invoice");
      return;
    }

    const result: PembayaranDetail = await res.json();
    setData(result);
  }

  useEffect(() => {
    if (!Number.isInteger(id)) {
      router.push("/accounting/pembayaran-invoice");
      return;
    }

    fetchDetail(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card title="Detail Pembayaran Invoice">
          <p className="text-gray-500">Memuat data...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card
        title="Detail Pembayaran Invoice"
        action={
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/accounting/pembayaran-invoice/${data.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-500">Tanggal</p>
            <p>{data.tanggal}</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Invoice ID</p>
            <p>{data.id_invoice}</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Nominal</p>
            <p>{data.nominal.toLocaleString()}</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Keterangan</p>
            <p>{data.keterangan}</p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/pembayaran-invoice")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
