"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type MaterialItem = {
  id: string;
  material: string;
  qty: number;
  harga: number;
  gudang: string | null;
};

export default function MaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/material?id_proyek=${proyekId}`);

    if (!res.ok) {
      showToast("Gagal mengambil data material", "error");
      setLoading(false);
      return;
    }

    const result: MaterialItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/material/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus material", "error");
      return;
    }

    showToast("Material berhasil dihapus", "success");
    fetchData();
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Material Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/material/form`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Material
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
                <th className="border px-3 py-2">Material</th>
                <th className="border px-3 py-2 text-right">Qty</th>
                <th className="border px-3 py-2 text-right">Harga</th>
                <th className="border px-3 py-2">Gudang</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Belum ada material
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.material}</td>
                    <td className="border px-3 py-2 text-right">{item.qty}</td>
                    <td className="border px-3 py-2 text-right">
                      {item.harga.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">{item.gudang ?? "-"}</td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/proyek/${proyekId}/material/${item.id}/edit`,
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
        description="Yakin ingin menghapus material ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
