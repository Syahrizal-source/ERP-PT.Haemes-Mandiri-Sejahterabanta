"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

interface PayrollForm {
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
}

interface PayrollResponse extends PayrollForm {
  id: number;
}

export default function EditPayrollPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<PayrollForm>({
    bulan: 1,
    tahun: 2026,
    total_gaji: 0,
    total_tunjangan: 0,
    total_potongan: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/payroll/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil payroll", "error");
        setLoading(false);
        return;
      }

      const data: PayrollResponse = await res.json();

      setForm({
        bulan: data.bulan,
        tahun: data.tahun,
        total_gaji: data.total_gaji,
        total_tunjangan: data.total_tunjangan,
        total_potongan: data.total_potongan,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof PayrollForm>(
    field: K,
    value: PayrollForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/payroll/${id}`, {
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
        text: "Gagal menyimpan payroll",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Payroll Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/payroll/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Payroll">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            value={form.bulan}
            onChange={(e) => handleChange("bulan", Number(e.target.value))}
          />

          <Input
            type="number"
            value={form.tahun}
            onChange={(e) => handleChange("tahun", Number(e.target.value))}
          />

          <Input
            type="number"
            value={form.total_gaji}
            onChange={(e) => handleChange("total_gaji", Number(e.target.value))}
          />

          <Input
            type="number"
            value={form.total_tunjangan}
            onChange={(e) =>
              handleChange("total_tunjangan", Number(e.target.value))
            }
          />

          <Input
            type="number"
            value={form.total_potongan}
            onChange={(e) =>
              handleChange("total_potongan", Number(e.target.value))
            }
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/payroll/${id}`)}
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
