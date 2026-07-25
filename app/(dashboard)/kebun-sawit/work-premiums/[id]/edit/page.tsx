"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface FormState {
  work_type: string;
  work_result: number;
  rate: number;
  pph21_rate: number;
}

interface WorkPremium {
  id: string;
  work_type: string;
  work_result: number;
  rate: number;
  pph21_rate: number;
}

export default function EditWorkPremiumPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [form, setForm] = useState<FormState>({
    work_type: "",
    work_result: 0,
    rate: 0,
    pph21_rate: 0,
  });

  const premium = form.work_result * form.rate;
  const pph21 = premium * (form.pph21_rate / 100);
  const totalAfterTax = premium - pph21;

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/work-premiums/${id}`);

      if (!res.ok) return;

      const data: WorkPremium = await res.json();

      setForm({
        work_type: data.work_type,
        work_result: data.work_result,
        rate: data.rate,
        pph21_rate: data.pph21_rate,
      });
    }

    load();
  }, [id]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/work-premiums/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan work premiums",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Work Premiums Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/work-premiums/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Work Premium">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Jenis Kerja"
            value={form.work_type}
            onChange={(e) => handleChange("work_type", e.target.value)}
          />

          <Input
            label="Hasil Kerja"
            type="number"
            min={0}
            value={form.work_result}
            onChange={(e) =>
              handleChange("work_result", Number(e.target.value))
            }
          />

          <Input
            label="Rate"
            type="number"
            min={0}
            value={form.rate}
            onChange={(e) => handleChange("rate", Number(e.target.value))}
          />

          <Input
            label="PPh21 (%)"
            type="number"
            min={0}
            value={form.pph21_rate}
            onChange={(e) => handleChange("pph21_rate", Number(e.target.value))}
          />
        </div>

        <div className="mt-6 border rounded p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>Total Premium</div>
            <div>{premium.toLocaleString("id-ID")}</div>

            <div>PPh21</div>
            <div>{pph21.toLocaleString("id-ID")}</div>

            <div>Total Setelah Pajak</div>
            <div>{totalAfterTax.toLocaleString("id-ID")}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/kebun-sawit/work-premiums/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
