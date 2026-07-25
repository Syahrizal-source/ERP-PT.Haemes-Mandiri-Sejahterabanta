"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  nama_vendor: string;
}

interface ItemForm {
  id: string;
  nama_item: string;
  qty: number;
  harga: number;
}

interface ReceiptResponse {
  receipt: {
    id: string;
    tanggal: string;
    vendor_id: number | null;
    purchase_order_id: string | null;
  };
  items: ItemForm[];
}

export default function EditReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tanggal, setTanggal] = useState<string>("");

  const [vendorId, setVendorId] = useState<number>(0);

  const [items, setItems] = useState<ItemForm[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [receiptRes, vendorRes] = await Promise.all([
        fetch(`/api/purchasing/receipts/${id}`),
        fetch("/api/vendors"),
      ]);

      const receiptData: ReceiptResponse = await receiptRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setTanggal(receiptData.receipt.tanggal);
      setVendorId(receiptData.receipt.vendor_id ?? 0);

      setItems(receiptData.items);

      setVendors(vendorData);

      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/purchasing/receipts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tanggal,
        vendor_id: vendorId,
        items,
      }),
    });

    setSaving(false);

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
      title: "Update Receipts Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/purchasing/receipts/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2 items-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Goods Receipt">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />

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
        </div>

        <div className="mt-6">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-3 gap-3 mb-2">
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
            onClick={() => router.push(`/purchasing/receipts/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
