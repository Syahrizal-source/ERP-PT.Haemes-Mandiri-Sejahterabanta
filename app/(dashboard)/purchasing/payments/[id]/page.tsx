"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Payment {
  id: string;
  tanggal: string;
  vendor_id: number | null;
  subtotal: number;
  ppn: number;
  pph21: number;
  pph23: number;
  pph4: number;
  jumlah: number;
  metode: string | null;
}

interface Vendor {
  id: number;
  nama_vendor: string;
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [paymentRes, vendorRes] = await Promise.all([
        fetch(`/api/purchasing/payments/${id}`),
        fetch("/api/vendors"),
      ]);

      if (!paymentRes.ok) {
        showToast("Gagal mengambil data payment", "error");
        setLoading(false);
        return;
      }

      const paymentData: Payment = await paymentRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setPayment(paymentData);
      setVendors(vendorData);

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function getVendorName(vendorId: number | null): string {
    if (!vendorId) return "-";

    const vendor = vendors.find((v) => v.id === vendorId);

    return vendor ? vendor.nama_vendor : "-";
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Vendor Payment">
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{payment.tanggal}</p>
          </div>

          <div>
            <p className="font-semibold">Vendor</p>
            <p>{getVendorName(payment.vendor_id)}</p>
          </div>

          <div>
            <p className="font-semibold">Subtotal</p>
            <p>{payment.subtotal.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPN</p>
            <p>{payment.ppn.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh21</p>
            <p>{payment.pph21.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh23</p>
            <p>{payment.pph23.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh4</p>
            <p>{payment.pph4.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Jumlah Dibayar</p>
            <p className="text-green-600 font-semibold">
              {payment.jumlah.toLocaleString("id-ID")}
            </p>
          </div>

          <div>
            <p className="font-semibold">Metode</p>
            <p>{payment.metode ?? "-"}</p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/payments")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/purchasing/payments/${payment.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
