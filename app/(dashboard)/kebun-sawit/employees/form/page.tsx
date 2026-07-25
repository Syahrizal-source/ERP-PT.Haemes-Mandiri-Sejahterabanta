"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Division {
  id: string;
  name: string;
}

interface EmployeeForm {
  nik: string;
  name: string;
  position: string;
  division_id: string;
  hire_date: string;
  basic_salary: number;
  is_active: boolean;
}

export default function EmployeeCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [divisions, setDivisions] = useState<Division[]>([]);

  const [form, setForm] = useState<EmployeeForm>({
    nik: "",
    name: "",
    position: "",
    division_id: "",
    hire_date: "",
    basic_salary: 0,
    is_active: true,
  });

  useEffect(() => {
    async function loadDivisions(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/divisions");

      if (!res.ok) return;

      const data: Division[] = await res.json();

      setDivisions(data);
    }

    loadDivisions();
  }, []);

  function handleChange<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.basic_salary < 0) {
      showToast("Gaji tidak boleh minus", "error");
      return;
    }

    const res = await fetch("/api/kebun-sawit/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan employees",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Employees Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/employees");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Employee">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="NIK"
            value={form.nik}
            onChange={(e) => handleChange("nik", e.target.value)}
          />

          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Posisi"
            value={form.position}
            onChange={(e) => handleChange("position", e.target.value)}
          />

          <Input
            label="Tanggal Masuk"
            type="date"
            value={form.hire_date}
            onChange={(e) => handleChange("hire_date", e.target.value)}
          />

          <Input
            label="Gaji Pokok"
            type="number"
            min={0}
            value={form.basic_salary}
            onChange={(e) =>
              handleChange("basic_salary", Number(e.target.value))
            }
          />

          <div>
            <label className="text-sm font-medium">Division</label>

            <select
              className="w-full border rounded p-2"
              value={form.division_id}
              onChange={(e) => handleChange("division_id", e.target.value)}
            >
              <option value="">Pilih Division</option>

              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/employees")}
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
