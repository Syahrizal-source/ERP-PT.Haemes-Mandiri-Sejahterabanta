"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type TenagaKerjaItem = {
  id: string;
  nama: string;
  jabatan: string | null;
  tipe: "harian" | "borongan" | "staff" | null;
  upah: number;
  periode: string | null;
};

export default function TenagaKerjaPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<TenagaKerjaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/tenaga-kerja?id_proyek=${proyekId}`);

    if (!res.ok) {
      showToast("Gagal mengambil data tenaga kerja", "error");
      setLoading(false);
      return;
    }

    const result: TenagaKerjaItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/tenaga-kerja/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus tenaga kerja", "error");
      return;
    }

    showToast("Tenaga kerja berhasil dihapus", "success");
    fetchData();
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Tenaga Kerja Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/tenaga-kerja/form`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Tenaga Kerja
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Nama</th>
                <th className="border px-3 py-2">Jabatan</th>
                <th className="border px-3 py-2">Tipe</th>
                <th className="border px-3 py-2 text-right">Upah</th>
                <th className="border px-3 py-2">Periode</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Belum ada tenaga kerja
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.nama}</td>
                    <td className="border px-3 py-2">{item.jabatan ?? "-"}</td>
                    <td className="border px-3 py-2">{item.tipe ?? "-"}</td>
                    <td className="border px-3 py-2 text-right">
                      {item.upah.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">{item.periode ?? "-"}</td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/proyek/${proyekId}/tenaga-kerja/${item.id}/edit`,
                            )
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Yakin ingin menghapus tenaga kerja ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
