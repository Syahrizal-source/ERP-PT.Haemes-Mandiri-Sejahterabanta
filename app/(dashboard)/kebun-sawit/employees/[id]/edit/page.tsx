"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
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

interface Employee extends EmployeeForm {
  id: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

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
    async function fetchData(): Promise<void> {
      const [empRes, divRes] = await Promise.all([
        fetch("/api/kebun-sawit/employees"),
        fetch("/api/kebun-sawit/divisions"),
      ]);

      if (!empRes.ok || !divRes.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const employees: Employee[] = await empRes.json();
      const divisionsData: Division[] = await divRes.json();

      const found = employees.find((e) => e.id === id);

      if (!found) {
        showToast("Employee tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      setDivisions(divisionsData);

      setForm({
        nik: found.nik,
        name: found.name,
        position: found.position,
        division_id: found.division_id,
        hire_date: found.hire_date,
        basic_salary: found.basic_salary,
        is_active: found.is_active,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

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

    setSaving(true);

    const res = await fetch(`/api/kebun-sawit/employees/${id}`, {
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
        text: "Gagal menyimpan employees",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Employees Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/employees/${id}`);
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
      <Card title="Edit Employee">
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
            onClick={() => router.push(`/kebun-sawit/employees/${id}`)}
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
