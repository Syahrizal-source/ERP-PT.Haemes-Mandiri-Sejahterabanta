"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

interface Fuel {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  liter: number;
  harga: number;
  total: number;
  supplier: string | null;
  id_jurnal: number | null;
  created_at: string;
}

export default function FuelPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Fuel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/fuel");

    if (!res.ok) {
      showToast("Gagal mengambil data fuel", "error");
      setLoading(false);
      return;
    }

    const result: Fuel[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Fuel ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/alat-berat/fuel/${id}`, {
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
        <Card title="Fuel Consumption">
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/alat-berat/fuel/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Fuel
            </Button>
          </div>

          {loading ? (
            <div className="flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Tanggal</th>
                    <th className="border px-3 py-2">Equipment</th>
                    <th className="border px-3 py-2">Liter</th>
                    <th className="border px-3 py-2">Harga</th>
                    <th className="border px-3 py-2">Total</th>
                    <th className="border px-3 py-2">Supplier</th>
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
                        <td className="border px-3 py-2">{item.tanggal}</td>

                        <td className="border px-3 py-2">
                          {item.equipment_id ?? "-"}
                        </td>

                        <td className="border px-3 py-2">{item.liter}</td>

                        <td className="border px-3 py-2">{item.harga}</td>

                        <td className="border px-3 py-2">{item.total}</td>

                        <td className="border px-3 py-2">
                          {item.supplier ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/alat-berat/fuel/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/alat-berat/fuel/${item.id}/edit`)
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
