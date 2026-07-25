"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import { invoiceSchema } from "@/lib/validators/invoice";

interface InvoiceForm {
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<InvoiceForm>({
    tanggal: "",
    no_invoice: "",
    customer: "",
    nominal: 0,
    status: "Unpaid (Menunggu Pembayaran)",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/invoice/${id}`);
      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const data: InvoiceForm = await res.json();
      setForm(data);
      setLoading(false);
    }

    if (Number.isInteger(id)) {
      fetchData();
    }
  }, [id, showToast]);

  function handleChange<K extends keyof InvoiceForm>(
    field: K,
    value: InvoiceForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/invoice/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan invoice",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Invoice Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/accounting/invoice");
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
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Invoice">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="No Invoice"
            value={form.no_invoice}
            onChange={(e) => handleChange("no_invoice", e.target.value)}
          />

          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) => handleChange("customer", e.target.value)}
          />

          <Input
            label="Nominal"
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as InvoiceForm["status"])
              }
            >
              <option value="Unpaid (Menunggu Pembayaran)">Unpaid</option>
              <option value="Partial (Pembayaran Sebagian)">Partial</option>
              <option value="Paid (Pembayaran Penuh/ Lunas)">Paid</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/invoice")}
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
