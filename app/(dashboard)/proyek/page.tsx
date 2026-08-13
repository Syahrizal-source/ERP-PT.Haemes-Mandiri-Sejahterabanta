"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { ProyekMaster } from "@/types/proyek";
import { useToast } from "@/components/ui/toast-context";

export default function ProyekListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<ProyekMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/proyek/master");
    if (!res.ok) {
      showToast("Gagal mengambil data proyek", "error");
      setLoading(false);
      return;
    }

    const result = await res.json();
    console.log(result);

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setLoadingId(deleteId);

    const res = await fetch(`/api/proyek/master/${deleteId}`, {
      method: "DELETE",
    });

    setLoadingId(null);
    setDeleteId(null);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menghapus proyek", "error");
      return;
    }

    showToast("Proyek berhasil dihapus", "success");
    fetchData();
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Daftar Proyek">
          <div className="flex justify-between mb-4">
            <div />
            <Button onClick={() => router.push("/proyek/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Proyek
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
                    <th className="border px-3 py-2">Jenis Proyek</th>
                    <th className="border px-3 py-2">Customer</th>
                    <th className="border px-3 py-2">Nilai Kontrak</th>
                    <th className="border px-3 py-2">Status</th>
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
                        <td className="border px-3 py-2">{item.kode_proyek}</td>
                        <td className="border px-3 py-2">{item.nama_proyek}</td>
                        <td className="border px-3 py-2">
                          {item.jenis_proyek}
                        </td>
                        <td className="border px-3 py-2">{item.customer}</td>
                        <td className="border px-3 py-2 text-right">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(item.nilai_kontrak)}
                        </td>
                        <td className="border px-3 py-2">
                          <span className="px-2 py-1 rounded text-xs font-medium">
                            {item.status}
                          </span>
                        </td>
                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            {/* DETAIL */}
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/proyek/${item.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* UPDATE */}
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/proyek/${item.id}/edit`)
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* DELETE */}
                            <Button
                              variant="destructive"
                              disabled={loadingId === item.id}
                              onClick={() => setDeleteId(item.id)}
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

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus proyek ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
