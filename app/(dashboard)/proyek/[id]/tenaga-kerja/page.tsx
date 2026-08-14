"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ProyekTenagaKerja } from "@/types/proyek";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

export default function TenagaKerjaPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [data, setData] = useState<ProyekTenagaKerja[]>([]);

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(`/api/proyek/tenaga-kerja?id_proyek=${proyekId}`);

      if (!res.ok) {
        throw new Error();
      }

      const result: ProyekTenagaKerja[] = await res.json();

      setData(result);
    } catch {
      showToast("Gagal mengambil data tenaga kerja", "error");
    } finally {
      setLoading(false);
    }
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
    void fetchData();
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
            <thead className="bg-gray-100 text-center">
              <tr>
                <th className="border px-3 py-2">No</th>
                <th className="border px-3 py-2">Nama</th>
                <th className="border px-3 py-2">Jabatan</th>
                <th className="border px-3 py-2">Tipe</th>
                <th className="border px-3 py-2">Tanggal Mulai</th>
                <th className="border px-3 py-2">Tanggal Selesai</th>
                <th className="border px-3 py-2 text-right">Upah</th>
                <th className="border px-3 py-2"> Pembayaran</th>
                <th className="border px-3 py-2 text-right">Status</th>
                <th className="border px-3 py-2">Jurnal</th>
                <th className="border px-3 py-2">Keterangan</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-4">
                    Belum ada tenaga kerja
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border px-3 py-2">{item.nama}</td>
                    <td className="border px-3 py-2">{item.jabatan ?? "-"}</td>
                    <td className="border px-3 py-2">{item.tipe ?? "-"}</td>
                    <td className="border px-3 py-2">
                      {new Date(item.tanggal_mulai).toLocaleDateString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      {item.tanggal_selesai
                        ? new Date(item.tanggal_selesai).toLocaleDateString(
                            "id-ID",
                          )
                        : "-"}
                    </td>
                    <td className="border px-3 py-2">
                      Rp {item.upah.toLocaleString("id-ID")}
                    </td>

                    <td className="border px-3 py-2 text-center">
                      {item.metode_pembayaran ? (
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
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="border px-3 py-2 text-center">
                      <span
                        className={
                          item.status === "AKTIF"
                            ? "rounded bg-green-100 px-2 py-1 text-green-700"
                            : item.status === "SELESAI"
                              ? "rounded bg-blue-100 px-2 py-1 text-blue-700"
                              : "rounded bg-red-100 px-2 py-1 text-red-700"
                        }
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="border px-3 py-2 text-center">
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

                    <td className="border px-3 py-2 max-w-xs">
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
                              `/proyek/${proyekId}/tenaga-kerja/${item.id}/edit`,
                            )
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          disabled={deleting}
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
