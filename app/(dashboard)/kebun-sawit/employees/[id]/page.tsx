"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Employee {
  id: string;
  nik: string;
  name: string;
  position: string;
  division_id: string;
  hire_date: string;
  basic_salary: number;
  is_active: boolean;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [data, setData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/employees");

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const list: Employee[] = await res.json();

      const found = list.find((item) => item.id === id);

      if (!found) {
        showToast("Employee tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      setData(found);
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Employee">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">NIK</label>
            <div className="font-medium">{data.nik}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Nama</label>
            <div className="font-medium">{data.name}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Posisi</label>
            <div className="font-medium">{data.position}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Tanggal Masuk</label>
            <div className="font-medium">{data.hire_date}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Gaji Pokok</label>
            <div className="font-medium">
              {data.basic_salary.toLocaleString("id-ID")}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Status</label>
            <div className="font-medium">
              {data.is_active ? "Aktif" : "Nonaktif"}
            </div>
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

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/employees/${data.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
