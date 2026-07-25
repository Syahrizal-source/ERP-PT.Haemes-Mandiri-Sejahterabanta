"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface InvoiceItem {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status:
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [data, setData] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/invoice/${id}`);
      if (!res.ok) {
        showToast("Gagal mengambil detail invoice", "error");
        setLoading(false);
        return;
      }

      const result: InvoiceItem = await res.json();
      setData(result);
      setLoading(false);
    }

    if (Number.isInteger(id)) {
      fetchData();
    }
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Invoice">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Tanggal</p>
            <p>{data.tanggal}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">No Invoice</p>
            <p>{data.no_invoice}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p>{data.customer}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Nominal</p>
            <p>{data.nominal.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p>{data.status}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/invoice")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/accounting/invoice/${data.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
