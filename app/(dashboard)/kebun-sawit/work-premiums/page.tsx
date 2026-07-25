"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface WorkPremium {
  id: string;
  employee_id: string;
  block_id: string | null;
  work_date: string;
  work_type: string;
  work_result: number;
  rate: number;
  total_premium: number;
  pph21_amount: number;
  total_after_tax: number;
}

interface Employee {
  id: string;
  name: string;
}

export default function WorkPremiumPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<WorkPremium[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const resData = await fetch("/api/kebun-sawit/work-premiums");
    const resEmployees = await fetch("/api/kebun-sawit/employees");

    if (!resData.ok || !resEmployees.ok) {
      showToast("Gagal mengambil data work premium", "error");
      setLoading(false);
      return;
    }

    const wp: WorkPremium[] = await resData.json();
    const emp: Employee[] = await resEmployees.json();

    setData(wp);
    setEmployees(emp);
    setLoading(false);
  }

  useEffect(() => {
    async function loadData(): Promise<void> {
      await fetchData();
    }

    void loadData();
  }, []);

  function getEmployeeName(id: string): string {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : "-";
  }

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Work Premiums ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/work-premiums/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Work Premium">
          <div className="flex justify-between mb-4">
            <div />

            <Button
              onClick={() => router.push("/kebun-sawit/work-premiums/form")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Work Premium
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Tanggal</th>
                    <th className="border px-3 py-2">Employee</th>
                    <th className="border px-3 py-2">Jenis Kerja</th>
                    <th className="border px-3 py-2">Hasil</th>
                    <th className="border px-3 py-2">Premium</th>
                    <th className="border px-3 py-2">PPh21</th>
                    <th className="border px-3 py-2">Net</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">{item.work_date}</td>

                        <td className="border px-3 py-2">
                          {getEmployeeName(item.employee_id)}
                        </td>

                        <td className="border px-3 py-2">{item.work_type}</td>

                        <td className="border px-3 py-2 text-right">
                          {item.work_result.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_premium.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.pph21_amount.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_after_tax.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/work-premiums/${item.id}`,
                                )
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/work-premiums/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                              disabled={loadingId === item.id}
                            >
                              {loadingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
