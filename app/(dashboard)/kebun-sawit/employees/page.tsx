"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
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

export default function EmployeeListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/kebun-sawit/employees");

    if (!res.ok) {
      showToast("Gagal mengambil data employee", "error");
      setLoading(false);
      return;
    }

    const result: Employee[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Employees ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/employees/${id}`, {
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
        <Card title="Master Employees">
          <div className="flex justify-between mb-4">
            <div />

            <Button onClick={() => router.push("/kebun-sawit/employees/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Employee
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
                    <th className="border px-3 py-2">NIK</th>
                    <th className="border px-3 py-2">Nama</th>
                    <th className="border px-3 py-2">Posisi</th>
                    <th className="border px-3 py-2">Tanggal Masuk</th>
                    <th className="border px-3 py-2 text-right">Gaji</th>
                    <th className="border px-3 py-2">Status</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">{item.nik}</td>

                        <td className="border px-3 py-2">{item.name}</td>

                        <td className="border px-3 py-2">{item.position}</td>

                        <td className="border px-3 py-2">{item.hire_date}</td>

                        <td className="border px-3 py-2 text-right">
                          {item.basic_salary.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/kebun-sawit/employees/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/employees/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={loadingId === item.id}
                              onClick={() => handleDelete(item.id)}
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
