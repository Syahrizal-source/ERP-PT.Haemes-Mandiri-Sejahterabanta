"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PurchaseOrder {
  id: string;
  nomor: string;
  vendor_id: number;
}

interface Vendor {
  id: number;
  nama_vendor: string;
}

interface ItemForm {
  nama_item: string;
  qty: number;
  harga: number;
}

export default function CreateReceiptPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [tanggal, setTanggal] = useState<string>("");

  const [vendorId, setVendorId] = useState<number>(0);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>("");

  const [items, setItems] = useState<ItemForm[]>([
    { nama_item: "", qty: 1, harga: 0 },
  ]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [orderRes, vendorRes] = await Promise.all([
        fetch("/api/purchasing/orders"),
        fetch("/api/vendors"),
      ]);

      const orderData: PurchaseOrder[] = await orderRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setOrders(orderData);
      setVendors(vendorData);
    }

    fetchData();
  }, []);

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/purchasing/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purchase_order_id: purchaseOrderId || null,
        tanggal,
        vendor_id: vendorId,
        items,
      }),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan receipts",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Receipts Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/purchasing/receipts");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Goods Receipt">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Purchase Order</label>
            <select
              className="w-full border rounded p-2"
              value={purchaseOrderId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
            >
              <option value="">-- Pilih PO --</option>

              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nomor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Vendor</label>
            <select
              className="w-full border rounded p-2"
              value={vendorId}
              onChange={(e) => setVendorId(Number(e.target.value))}
            >
              <option value={0}>-- Pilih Vendor --</option>

              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama_vendor}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Items</h3>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-3 mb-2">
              <Input
                label="Nama Item"
                value={item.nama_item}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].nama_item = e.target.value;
                  setItems(updated);
                }}
              />

              <Input
                label="Qty"
                type="number"
                value={item.qty}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].qty = Number(e.target.value);
                  setItems(updated);
                }}
              />

              <Input
                label="Harga"
                type="number"
                value={item.harga}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].harga = Number(e.target.value);
                  setItems(updated);
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/receipts")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
