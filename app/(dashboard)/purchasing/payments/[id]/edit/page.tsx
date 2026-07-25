"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  nama_vendor: string;
}

interface Payment {
  id: string;
  tanggal: string;
  vendor_id: number | null;
  subtotal: number;
  metode: string | null;
}

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tanggal, setTanggal] = useState<string>("");
  const [vendorId, setVendorId] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [metode, setMetode] = useState<string>("TRANSFER");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [paymentRes, vendorRes] = await Promise.all([
        fetch(`/api/purchasing/payments/${id}`),
        fetch("/api/vendors"),
      ]);

      const paymentData: Payment = await paymentRes.json();
      const vendorData: Vendor[] = await vendorRes.json();

      setTanggal(paymentData.tanggal);
      setVendorId(paymentData.vendor_id ?? 0);
      setSubtotal(paymentData.subtotal);
      setMetode(paymentData.metode ?? "TRANSFER");

      setVendors(vendorData);

      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/purchasing/payments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tanggal,
        vendor_id: vendorId,
        subtotal,
        metode,
        ppn: 0,
        pph21: 0,
        pph23: 0,
        pph4: 0,
        jumlah: subtotal,
      }),
    });

    setSaving(false);

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
      title: "Update Payments Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/purchasing/payments/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Vendor Payment">
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

          <Input
            label="Subtotal"
            type="number"
            value={subtotal}
            onChange={(e) => setSubtotal(Number(e.target.value))}
          />

          <Input
            label="Metode Pembayaran"
            value={metode}
            onChange={(e) => setMetode(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/purchasing/payments/${id}`)}
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
