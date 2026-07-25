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

interface PurchaseOrderForm {
  nomor: string;
  tanggal: string;
  vendor_id: number;
  status: string;
  keterangan: string;
}

export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState<PurchaseOrderForm>({
    nomor: "",
    tanggal: "",
    vendor_id: 0,
    status: "DRAFT",
    keterangan: "",
  });

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

      setVendors(vendorData);

      setForm({
        nomor: orderData.order.nomor,
        tanggal: orderData.order.tanggal,
        vendor_id: orderData.order.vendor_id ?? 0,
        status: orderData.order.status ?? "DRAFT",
        keterangan: orderData.order.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof PurchaseOrderForm>(
    field: K,
    value: PurchaseOrderForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/purchasing/orders/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan orders",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Orders Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/purchasing/orders/${id}`);
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
      <Card title="Edit Purchase Order">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nomor"
            value={form.nomor}
            onChange={(e) => handleChange("nomor", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Vendor</label>
            <select
              className="w-full border rounded p-2"
              value={form.vendor_id}
              onChange={(e) =>
                handleChange("vendor_id", Number(e.target.value))
              }
            >
              <option value={0}>-- Pilih Vendor --</option>

              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama_vendor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="CANCEL">CANCEL</option>
            </select>
          </div>

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/purchasing/orders/${id}`)}
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
