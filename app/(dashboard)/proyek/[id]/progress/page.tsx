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
  id_proyek: string;
  tanggal: string;
  no_bukti: string | null;
  target_volume: number;
  realisasi_volume: number;
  deviasi: number;
  progress_persen: number;
  nilai_progress: number;
  satuan: string;
  status: "SELESAI" | "TERLAMBAT" | "PROGRESS";
  periode: string | null;
  lokasi: string | null;
  pic: string | null;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  id_jurnal: number | null;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
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
    fetchProgress(); // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <thead className="bg-gray-100 text-center">
                <tr>
                  <th className="border px-3 py-2">No</th>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">No Bukti</th>
                  <th className="border px-3 py-2">Target</th>
                  <th className="border px-3 py-2">Realisasi</th>
                  <th className="border px-3 py-2">Deviasi</th>
                  <th className="border px-3 py-2">%</th>
                  <th className="border px-3 py-2">Nilai</th>
                  <th className="border px-3 py-2">Pembayaran</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Jurnal</th>
                  <th className="border px-3 py-2">PIC</th>
                  <th className="border px-3 py-2">Keterangan</th>
                  <th className="border px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-4">
                      Belum ada progress
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border px-2 text-center">{index + 1}</td>
                      <td className="border px-3 py-2">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="border px-2 font-mono">
                        {item.no_bukti ?? "-"}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {item.target_volume.toLocaleString("id-ID")}{" "}
                        {item.satuan}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {item.realisasi_volume.toLocaleString("id-ID")}{" "}
                        {item.satuan}
                      </td>
                      <td
                        className={`border px-3 py-2 text-right ${
                          item.deviasi < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {item.deviasi}
                      </td>
                      <td className="border px-2 text-right">
                        {Number(item.progress_persen).toFixed(2)}%
                      </td>

                      <td className="border px-2 text-right font-semibold text-blue-600">
                        Rp {Number(item.nilai_progress).toLocaleString("id-ID")}
                      </td>
                      <td className="text-center">
                        <span
                          className={
                            item.metode_pembayaran === "KAS"
                              ? "rounded bg-green-100 px-2 py-1 text-green-700"
                              : item.metode_pembayaran === "BANK"
                                ? "rounded bg-blue-100 px-2 py-1 text-blue-700"
                                : "rounded bg-orange-100 px-2 py-1 text-orange-700"
                          }
                        >
                          {item.metode_pembayaran}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={
                            item.status === "SELESAI"
                              ? "rounded bg-green-100 px-2 py-1 text-green-700"
                              : item.status === "TERLAMBAT"
                                ? "rounded bg-red-100 px-2 py-1 text-red-700"
                                : "rounded bg-yellow-100 px-2 py-1 text-yellow-700"
                          }
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="text-center">
                        {item.id_jurnal ? (
                          <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                            Posted
                          </span>
                        ) : (
                          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="border px-2">{item.pic ?? "-"}</td>
                      <td className="border px-2 max-w-xs">
                        <div className="line-clamp-2">
                          {item.keterangan ?? "-"}
                        </div>
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
