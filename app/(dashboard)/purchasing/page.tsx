"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface RingkasanPurchasing {
  total_po: number;
  total_receipt: number;
  total_payment: number;
  total_ppn: number;
  total_pph23: number;
  total_pph4: number;
  total_hutang_vendor: number;
}

export default function PurchasingDashboard() {
  const router = useRouter();

  const [ringkasan, setRingkasan] = useState<RingkasanPurchasing | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/purchasing/ringkasan");

      const data: RingkasanPurchasing = await res.json();

      setRingkasan(data);
    }

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {ringkasan && (
        <Card title="Ringkasan Purchasing">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Purchase Order</p>
              <p className="text-lg font-semibold">
                {ringkasan.total_po.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Total Goods Receipt</p>
              <p className="text-lg font-semibold">
                {ringkasan.total_receipt.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Total Vendor Payment</p>
              <p className="text-lg font-semibold text-green-600">
                {ringkasan.total_payment.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Hutang Vendor</p>
              <p className="text-lg font-semibold text-red-600">
                {ringkasan.total_hutang_vendor.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Total PPN</p>
              <p className="text-lg font-semibold">
                {ringkasan.total_ppn.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Total PPh23</p>
              <p className="text-lg font-semibold">
                {ringkasan.total_pph23.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Total PPh4</p>
              <p className="text-lg font-semibold">
                {ringkasan.total_pph4.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Menu Purchasing">
        <div className="flex gap-4 flex-wrap">
          <Button onClick={() => router.push("/purchasing/orders")}>
            Purchase Orders
          </Button>

          <Button onClick={() => router.push("/purchasing/receipts")}>
            Goods Receipts
          </Button>

          <Button onClick={() => router.push("/purchasing/payments")}>
            Vendor Payments
          </Button>
        </div>
      </Card>
    </div>
  );
}
