"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface InvoiceOption {
  id: number;
  no_invoice: string;
  status: string;
}

interface PembayaranData {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  keterangan: string;
}

export default function EditPembayaranPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [loading, setLoading] = useState<boolean>(false);
  const [invoiceList, setInvoiceList] = useState<InvoiceOption[]>([]);
  const [form, setForm] = useState<PembayaranData>({
    id: 0,
    tanggal: "",
    id_invoice: 0,
    nominal: 0,
    keterangan: "",
  });

  async function fetchInvoice(): Promise<void> {
    const res = await fetch("/api/invoice");
    if (!res.ok) return;

    const data: InvoiceOption[] = await res.json();
    setInvoiceList(data);
  }

  async function fetchDetail(): Promise<void> {
    const res = await fetch(`/api/pembayaran-invoice/${id}`);

    if (!res.ok) {
      showToast("Gagal ambil data pembayaran", "error");
      router.push("/accounting/pembayaran-invoice");
      return;
    }

    const data: PembayaranData = await res.json();
    setForm(data);
  }

  useEffect(() => {
    if (!Number.isInteger(id)) return;
    fetchInvoice(); // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchDetail();
  }, [id]);

  function handleChange(field: keyof PembayaranData, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "nominal" || field === "id_invoice" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/pembayaran-invoice/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggal: form.tanggal,
        id_invoice: form.id_invoice,
        nominal: form.nominal,
        keterangan: form.keterangan,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan pembayaran invoice",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/pembayaran-invoice");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Pembayaran Invoice">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-1">Invoice</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.id_invoice}
              onChange={(e) => handleChange("id_invoice", e.target.value)}
            >
              <option value={0}>Pilih Invoice</option>
              {invoiceList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.no_invoice}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nominal"
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", e.target.value)}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/pembayaran-invoice")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
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
