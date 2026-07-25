"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  telepon: string | null;
  email: string | null;
  status: boolean;
}

export default function VendorsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/vendors");

    if (!res.ok) {
      showToast("Gagal mengambil data vendor", "error");
      setLoading(false);
      return;
    }

    const vendors: Vendor[] = await res.json();

    setData(vendors);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Vendor ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/vendors/${id}`, {
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
        <Card title="Vendor">
          <div className="flex justify-between mb-4">
            <div />

            <Button onClick={() => router.push("/vendors/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Vendor
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
                    <th className="border px-3 py-2">Kode</th>
                    <th className="border px-3 py-2">Nama</th>
                    <th className="border px-3 py-2">Kategori</th>
                    <th className="border px-3 py-2">Telepon</th>
                    <th className="border px-3 py-2">Email</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">
                          {item.kode_vendor ?? "-"}
                        </td>

                        <td className="border px-3 py-2">{item.nama_vendor}</td>

                        <td className="border px-3 py-2">
                          {item.kategori_vendor ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          {item.telepon ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          {item.email ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/vendors/${item.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/vendors/${item.id}/edit`)
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
