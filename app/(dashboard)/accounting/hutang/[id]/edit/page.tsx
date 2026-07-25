"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface HutangInput {
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
}

export default function EditHutangPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<HutangInput>({
    supplier: "",
    no_invoice: "",
    tanggal: "",
    jatuh_tempo: "",
    nilai: 0,
    status: "Unpaid (Menunggu Pembayaran)",
  });

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/hutang/${id}`);

    if (!res.ok) {
      showToast("Gagal ambil data hutang", "error");
      return;
    }

    const result: HutangInput = await res.json();
    setForm(result);
  }

  useEffect(() => {
    if (Number.isInteger(id)) {
      fetchData();
    }
  }, [id]);

  function handleChange(field: keyof HutangInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "nilai" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/hutang/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan hutang",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Hutang Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/hutang");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Hutang">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(e) => handleChange("supplier", e.target.value)}
          />

          <Input
            label="No Invoice"
            value={form.no_invoice}
            onChange={(e) => handleChange("no_invoice", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Jatuh Tempo"
            type="date"
            value={form.jatuh_tempo}
            onChange={(e) => handleChange("jatuh_tempo", e.target.value)}
          />

          <Input
            label="Nilai"
            type="number"
            value={form.nilai}
            onChange={(e) => handleChange("nilai", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/hutang")}
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
