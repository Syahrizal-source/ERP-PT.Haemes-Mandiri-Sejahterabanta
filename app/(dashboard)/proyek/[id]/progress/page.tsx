"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type ProgressItem = {
  id: string;
  tanggal: string;
  target_volume: number;
  realisasi_volume: number;
  deviasi: number;
  keterangan: string | null;
};

export default function ProyekProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  async function fetchProgress(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/progress?id_proyek=${proyekId}`);
    if (!res.ok) {
      showToast("Gagal mengambil data progress", "error");
      setLoading(false);
      return;
    }

    const result: ProgressItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/progress/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus progress", "error");
      return;
    }

    showToast("Progress berhasil dihapus", "success");
    fetchProgress();
  }

  useEffect(() => {
    fetchProgress();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Progress Proyek">
        {/* ACTION BAR */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/progress/form`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Progress
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
                  <th className="border px-3 py-2 text-right">Target</th>
                  <th className="border px-3 py-2 text-right">Realisasi</th>
                  <th className="border px-3 py-2 text-right">Deviasi</th>
                  <th className="border px-3 py-2">Keterangan</th>
                  <th className="border px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Belum ada progress
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.tanggal}</td>
                      <td className="border px-3 py-2 text-right">
                        {item.target_volume}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {item.realisasi_volume}
                      </td>
                      <td
                        className={`border px-3 py-2 text-right ${item.deviasi < 0 ? "text-red-600" : "text-green-600"
                          }`}
                      >
                        {item.deviasi}
                      </td>
                      <td className="border px-3 py-2">
                        {item.keterangan ?? "-"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/progress/${item.id}/edit`,
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
          </div>
        )}
      </Card>

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus progress ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
