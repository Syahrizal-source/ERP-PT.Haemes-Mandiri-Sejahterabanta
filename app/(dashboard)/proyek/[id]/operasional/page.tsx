"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type OperasionalItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  tanggal: string;
  no_bukti: string;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  total: number;
  supplier: string | null;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  periode: string | null;
  status: "DRAFT" | "POSTED";
  id_jurnal: number | null;
  created_by: string | null;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
};

export default function OperasionalPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<OperasionalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/operasional?id_proyek=${proyekId}`);

    if (!res.ok) {
      showToast("Gagal mengambil data operasional", "error");
      setLoading(false);
      return;
    }

    const result: OperasionalItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  const summary = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.total += item.total;

        if (item.status === "POSTED") {
          acc.posted++;
        } else {
          acc.draft++;
        }

        return acc;
      },
      {
        qty: 0,
        total: 0,
        posted: 0,
        draft: 0,
      },
    );
  }, [data]);

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    setDeleting(true);

    const res = await fetch(`/api/proyek/operasional/${deleteId}`, {
      method: "DELETE",
    });

    setDeleting(false);
    setDeleteId(null);

    if (!res.ok) {
      showToast("Gagal menghapus operasional", "error");
      return;
    }

    showToast("Operasional berhasil dihapus", "success");
    fetchData();
  }

  useEffect(() => {
    void fetchData();
  }, [proyekId]);

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Operasional Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/operasional/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Operasional
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
                <th className="border px-3 py-2">No</th>
                <th className="border px-3 py-2">No Bukti</th>
                <th className="border px-3 py-2">Tanggal</th>
                <th className="border px-3 py-2">Jenis Operasional</th>
                <th className="border px-3 py-2 text-right">Qty</th>
                <th className="border px-3 py-2">Sat</th>
                <th className="border px-3 py-2">Supplier</th>
                <th className="border px-3 py-2">Pembayaran</th>
                <th className="border px-3 py-2">Periode</th>
                <th className="border px-3 py-2">Keterangan</th>
                <th className="border px-3 py-2 text-right">Jurnal</th>
                <th className="border px-3 py-2 text-right">Harga</th>
                <th className="border px-3 py-2">Total</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-4">
                    Belum ada operasional
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border px-2 text-center">{index + 1}</td>
                    <td className="border px-3 py-2">{item.no_bukti}</td>
                    <td className="border px-2">
                      {new Date(item.tanggal).toLocaleDateString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      <div className="font-medium">{item.kategori.nama}</div>
                      <div className="text-xs text-gray-500">{item.uraian}</div>
                    </td>
                    <td className="border px-3 py-2 text-right">{item.qty}</td>
                    <td className="border px-3 py-2 text-right">
                      {item.satuan}
                    </td>
                    <td className="border px-2">{item.supplier}</td>
                    <td className="border px-3 py-2 text-center">
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
                    <td>{item.periode ?? "-"}</td>

                    <td className="border px-3 py-2 max-w-xs">
                      <div className="line-clamp-2">
                        {item.keterangan ?? "-"}
                      </div>
                    </td>

                    <td className="text-center">
                      {item.status === "POSTED" ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                          Posted
                        </span>
                      ) : (
                        <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      Rp {item.harga.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-2 text-right text-blue-600 font-semibold">
                      Rp {item.total.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/proyek/${proyekId}/operasional/${item.id}/edit`,
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
        description="Yakin ingin menghapus operasional ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
