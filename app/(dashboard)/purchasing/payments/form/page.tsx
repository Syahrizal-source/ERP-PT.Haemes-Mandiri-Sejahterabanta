"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Receipt {
  id: string;
  total: number;
}

interface Vendor {
  id: number;
  nama_vendor: string;
}

export default function CreatePaymentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [tanggal, setTanggal] = useState<string>("");

  const [receiptId, setReceiptId] = useState<string>("");

  const [vendorId, setVendorId] = useState<number>(0);

  const [subtotal, setSubtotal] = useState<number>(0);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [receiptRes, vendorRes] = await Promise.all([
        fetch("/api/purchasing/receipts"),
        fetch("/api/vendors"),
      ]);

      const receiptData: Receipt[] = await receiptRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setReceipts(receiptData);
      setVendors(vendorData);
    }

    fetchData();
  }, []);

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/purchasing/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receipt_id: receiptId || null,
        tanggal,
        vendor_id: vendorId,
        subtotal,
        ppn: 0,
        pph21: 0,
        pph23: 0,
        pph4: 0,
        jumlah: subtotal,
        metode: "TRANSFER",
      }),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan payments",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Payments Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/purchasing/payments");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Vendor Payment">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Receipt</label>

            <select
              className="w-full border rounded p-2"
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
            >
              <option value="">-- Pilih Receipt --</option>

              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id}
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
            label="Subtotal"
            type="number"
            value={subtotal}
            onChange={(e) => setSubtotal(Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/payments")}
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
