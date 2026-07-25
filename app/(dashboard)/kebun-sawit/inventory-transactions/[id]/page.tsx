"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface InventoryTransaction {
  id: string;
  item_id: string;
  block_id: string | null;
  transaction_date: string;
  transaction_type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  total_amount: number | string;
  ppn: number | string;
  pph23: number | string;
  pph4: number | string;
  reference_module: string | null;
  notes: string | null;
}

export default function InventoryTransactionDetailPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [data, setData] = useState<InventoryTransaction | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/inventory-transactions/${id}`);

      if (!res.ok) {
        return;
      }

      const result: InventoryTransaction = await res.json();
      setData(result);
    }

    load();
  }, [id]);

  if (!data) {
    return <div>Memuat data...</div>;
  }

  const quantity = Number(data.quantity);
  const unitPrice = Number(data.unit_price);
  const subtotal = Number(data.subtotal);
  const total = Number(data.total_amount);
  const ppn = Number(data.ppn);
  const pph23 = Number(data.pph23);
  const pph4 = Number(data.pph4);

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Detail Inventory Transaction">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Tanggal:</strong>
          </div>
          <div>{data.transaction_date}</div>

          <div>
            <strong>Tipe:</strong>
          </div>
          <div>{data.transaction_type}</div>

          <div>
            <strong>Qty:</strong>
          </div>
          <div>{quantity.toLocaleString("id-ID")}</div>

          <div>
            <strong>Harga:</strong>
          </div>
          <div>{unitPrice.toLocaleString("id-ID")}</div>

          <div>
            <strong>Subtotal:</strong>
          </div>
          <div>{subtotal.toLocaleString("id-ID")}</div>

          <div>
            <strong>PPN:</strong>
          </div>
          <div>{ppn.toLocaleString("id-ID")}</div>

          <div>
            <strong>PPH23:</strong>
          </div>
          <div>{pph23.toLocaleString("id-ID")}</div>

          <div>
            <strong>PPH4:</strong>
          </div>
          <div>{pph4.toLocaleString("id-ID")}</div>

          <div>
            <strong>Total:</strong>
          </div>
          <div>{total.toLocaleString("id-ID")}</div>

          <div>
            <strong>Module:</strong>
          </div>
          <div>{data.reference_module ?? "-"}</div>

          <div>
            <strong>Catatan:</strong>
          </div>
          <div>{data.notes ?? "-"}</div>
        </div>

        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/inventory-transactions")}
          >
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
