"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Receipt {
  id: string;
  tanggal: string;
  vendor_id: number | null;
  purchase_order_id: string | null;
  total: number | null;
  ppn: number | null;
  pph23: number | null;
  pph4: number | null;
  grand_total: number | null;
}

interface ReceiptItem {
  id: string;
  receipt_id: string;
  nama_item: string;
  qty: number;
  harga: number;
  subtotal: number;
}

interface Vendor {
  id: number;
  nama_vendor: string;
}

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [receiptRes, vendorRes] = await Promise.all([
        fetch(`/api/purchasing/receipts/${id}`),
        fetch("/api/vendors"),
      ]);

      if (!receiptRes.ok) {
        showToast("Gagal mengambil data receipt", "error");
        setLoading(false);
        return;
      }

      const receiptData = await receiptRes.json();

      const vendorData: Vendor[] = await vendorRes.json();

      setReceipt(receiptData.receipt);
      setItems(receiptData.items ?? []);
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
      <div className="flex gap-2 items-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Detail Goods Receipt">
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{receipt.tanggal}</p>
          </div>

          <div>
            <p className="font-semibold">Vendor</p>
            <p>{getVendorName(receipt.vendor_id)}</p>
          </div>

          <div>
            <p className="font-semibold">Total</p>
            <p>{Number(receipt.total ?? 0).toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPN</p>
            <p>{Number(receipt.ppn ?? 0).toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh23</p>
            <p>{Number(receipt.pph23 ?? 0).toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh4</p>
            <p>{Number(receipt.pph4 ?? 0).toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Grand Total</p>
            <p>{Number(receipt.grand_total ?? 0).toLocaleString("id-ID")}</p>
          </div>
        </div>

        <h3 className="font-semibold mb-2">Items</h3>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">Nama Item</th>
              <th className="border px-3 py-2 text-right">Qty</th>
              <th className="border px-3 py-2 text-right">Harga</th>
              <th className="border px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.nama_item}</td>

                <td className="border px-3 py-2 text-right">{item.qty}</td>

                <td className="border px-3 py-2 text-right">
                  {Number(item.harga).toLocaleString("id-ID")}
                </td>

                <td className="border px-3 py-2 text-right">
                  {Number(item.subtotal).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/receipts")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/purchasing/receipts/${receipt.id}/edit`)
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
