"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type RAPItem = {
  id: string;
  id_rab: string;
  id_proyek: string;
  id_kategori: number;
  kategori?: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
  uraian: string;
  qty: number;
  satuan: string | null;
  harga: number;
  total: number;
  tanggal: string;
  keterangan: string | null;
};

export default function ProyekRAPPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<RAPItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const grandTotal = useMemo(
    () => data.reduce((sum, item) => sum + Number(item.total), 0),
    [data],
  );

  type RapResponse = {
    data: RAPItem[];
  };

  async function fetchRAP(): Promise<void> {
    try {
      setLoading(true);
      const res = await fetch(`/api/proyek/rap?id_proyek=${proyekId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data RAP", "error");
        setLoading(false);
        return;
      }

      const result: RapResponse = await res.json();
      setData(result.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/rap/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus RAP", "error");
      return;
    }

    showToast("RAP berhasil dihapus", "success");
    fetchRAP();
  }

  useEffect(() => {
    fetchRAP(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Rencana Anggaran Pelaksanaan (RAP)">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button onClick={() => router.push(`/proyek/${proyekId}/rap/form`)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah RAP
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
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">Kategori</th>
                  <th className="p-2 border">Uraian</th>
                  <th className="p-2 border text-right">Qty</th>
                  <th className="p-2 border">Sat</th>
                  <th className="p-2 border text-right">Harga</th>
                  <th className="p-2 border text-right">Total</th>

                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      Belum ada RAP
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border px-2 text-center">{index + 1}</td>
                      <td className="border px-2">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="border px-2">
                        {item.kategori?.nama ?? "-"}
                      </td>
                      <td className="border px-2">{item.uraian}</td>
                      <td className="border px-2 text-right">
                        {Number(item.qty).toLocaleString("id-ID")}
                      </td>
                      <td className="border px-2">{item.satuan ?? "-"}</td>
                      <td className="border px-2 text-right">
                        {Number(item.harga).toLocaleString("id-ID")}
                      </td>
                      <td className="border px-2 text-right text-blue-600 font-semibold">
                        {Number(item.total).toLocaleString("id-ID")}
                      </td>
                      <td className="border px-2">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/rap/${item.id}/edit`,
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

            <div className="mt-6 text-right font-bold text-green-600">
              Total RAP: {grandTotal.toLocaleString("id-ID")}
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={deleteId !== null}
        title="Hapus RAP"
        description="Yakin ingin menghapus data?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
