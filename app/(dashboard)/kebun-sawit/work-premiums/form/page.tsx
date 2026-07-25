"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Employee {
  id: string;
  name: string;
}

interface Block {
  id: string;
  code: string;
}

interface FormState {
  employee_id: string;
  block_id: string;
  work_date: string;
  work_type: string;
  work_result: number;
  rate: number;
  pph21_rate: number;
}

export default function CreateWorkPremiumPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState<FormState>({
    employee_id: "",
    block_id: "",
    work_date: "",
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
      const resEmp = await fetch("/api/kebun-sawit/employees");
      const resBlocks = await fetch("/api/kebun-sawit/blocks");

      if (!resEmp.ok || !resBlocks.ok) return;

      const emp: Employee[] = await resEmp.json();
      const blk: Block[] = await resBlocks.json();

      setEmployees(emp);
      setBlocks(blk);
    }

    load();
  }, []);

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
    const payload = {
      ...form,
      total_premium: premium,
      pph21_amount: pph21,
      total_after_tax: totalAfterTax,
    };

    const res = await fetch("/api/kebun-sawit/work-premiums", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
      title: "Work Premiums Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/work-premiums");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Work Premium">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Employee</label>

            <select
              className="w-full border rounded p-2"
              value={form.employee_id}
              onChange={(e) => handleChange("employee_id", e.target.value)}
            >
              <option value="">Pilih</option>

              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Block</label>

            <select
              className="w-full border rounded p-2"
              value={form.block_id}
              onChange={(e) => handleChange("block_id", e.target.value)}
            >
              <option value="">Pilih</option>

              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tanggal"
            type="date"
            value={form.work_date}
            onChange={(e) => handleChange("work_date", e.target.value)}
          />

          <Input
            label="Jenis Kerja"
            value={form.work_type}
            onChange={(e) => handleChange("work_type", e.target.value)}
          />

          <Input
            label="Hasil Kerja"
            type="number"
            value={form.work_result}
            onChange={(e) =>
              handleChange("work_result", Number(e.target.value))
            }
          />

          <Input
            label="Rate"
            type="number"
            value={form.rate}
            onChange={(e) => handleChange("rate", Number(e.target.value))}
          />

          <Input
            label="PPh21 (%)"
            type="number"
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
            onClick={() => router.push("/kebun-sawit/work-premiums")}
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
