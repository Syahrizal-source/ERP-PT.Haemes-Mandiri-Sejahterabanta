"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type RABItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  keterangan?: string;
};

export default function ProyekRABPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<RABItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const grandTotal = useMemo(
    () => data.reduce((sum, item) => sum + Number(item.total), 0),
    [data],
  );

  async function fetchRAB(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/rab?id_proyek=${proyekId}`);
    if (!res.ok) {
      showToast("Gagal mengambil data RAB", "error");
      setLoading(false);
      return;
    }

    const result = await res.json();

    if (!Array.isArray(result)) {
      showToast("Data RAB tidak valid", "error");
      return;
    }
    setData(result);
    setLoading(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/rab/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus RAB", "error");
      return;
    }

    showToast("RAB berhasil dihapus", "success");
    fetchRAB();
  }

  useEffect(() => {
    fetchRAB(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Rencana Anggaran Biaya (RAB)">
        {/* ACTION BAR */}
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button onClick={() => router.push(`/proyek/${proyekId}/rab/form`)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah RAB
          </Button>
        </div>

        {/* TABLE */}
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
                  <th className="p-2 border text-center">No</th>
                  <th className="p-2 border">Kategori</th>
                  <th className="p-2 border">Uraian</th>
                  <th className="p-2 border text-right">Volume</th>
                  <th className="p-2 border">Satuan</th>
                  <th className="p-2 border">Jenis</th>
                  <th className="p-2 border text-right">Harga Satuan</th>
                  <th className="p-2 border text-right">Jumlah</th>
                  <th className="p-2 border text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      Belum ada data RAB untuk proyek ini.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index: number) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2">{item.kategori.nama}</td>

                      <td className="border px-3 py-2">{item.uraian ?? "-"}</td>

                      <td className="border px-3 py-2 text-right">
                        {item.volume.toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2">{item.satuan ?? "-"}</td>
                      <td className="border px-3 py-2">
                        {item.kategori.jenis}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {item.harga_satuan.toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-right font-semibold text-blue-600">
                        {item.total.toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/rab/${item.id}/edit`,
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

            <div className="mt-6 flex justify-end">
              <div className="bg-white border rounded-lg px-6 py-3 shadow-sm text-right min-w-[220px]">
                <p className="text-sm text-gray-500">Total RAB</p>
                <p className="text-xl font-bold text-green-600">
                  {grandTotal.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CONFIRM DELETE */}
      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus RAB ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
