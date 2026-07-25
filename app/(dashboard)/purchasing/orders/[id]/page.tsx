"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PurchaseOrder {
  id: string;
  nomor: string;
  tanggal: string;
  vendor_id: number | null;
  status: string | null;
  keterangan: string | null;
}

interface Vendor {
  id: number;
  nama_vendor: string;
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  function getVendorName(vendorId: number | null): string {
    if (!vendorId) return "-";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.nama_vendor : "-";
  }

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [orderRes, vendorRes] = await Promise.all([
        fetch(`/api/purchasing/orders/${id}`),
        fetch("/api/vendors"),
      ]);

      if (!orderRes.ok || !vendorRes.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const orderData = await orderRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setOrder(orderData.order);
      setVendors(vendorData);
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex gap-2 items-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Purchase Order">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Nomor</p>
            <p>{order.nomor}</p>
          </div>

          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{order.tanggal}</p>
          </div>

          <div>
            <p className="font-semibold">Vendor</p>
            <p>{getVendorName(order.vendor_id)}</p>
          </div>

          <div>
            <p className="font-semibold">Status</p>
            <p>{order.status ?? "-"}</p>
          </div>

          <div className="col-span-2">
            <p className="font-semibold">Keterangan</p>
            <p>{order.keterangan ?? "-"}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/purchasing/orders/${order.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
