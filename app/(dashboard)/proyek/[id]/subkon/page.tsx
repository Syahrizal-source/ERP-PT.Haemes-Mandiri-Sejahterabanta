"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type StatusSubkon = "AKTIF" | "SELESAI" | "DIBATALKAN";

type MetodePembayaran = "KAS" | "BANK" | "HUTANG";

type SubkonItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  no_bukti: string;
  tanggal: string;
  nama_vendor: string;
  pekerjaan: string;
  nilai_kontrak: number;
  metode_pembayaran: MetodePembayaran;
  periode: string | null;
  status: StatusSubkon;
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

export default function SubkonPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<SubkonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(`/api/proyek/subkon?id_proyek=${proyekId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data subkon", "error");
        return;
      }

      const result: SubkonItem[] = await res.json();

      setData(result);
    } catch (error: unknown) {
      console.error("FETCH SUBKON ERROR:", error);

      showToast("Gagal mengambil data subkon", "error");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.nilaiKontrak += Number(item.nilai_kontrak);

        if (item.id_jurnal) {
          acc.posted++;
        }

        if (item.status === "AKTIF") {
          acc.aktif++;
        }

        if (item.status === "SELESAI") {
          acc.selesai++;
        }

        if (item.status === "DIBATALKAN") {
          acc.dibatalkan++;
        }

        return acc;
      },
      {
        nilaiKontrak: 0,
        posted: 0,
        aktif: 0,
        selesai: 0,
        dibatalkan: 0,
      },
    );
  }, [data]);

  async function handleDelete(): Promise<void> {
    if (!deleteId) {
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(`/api/proyek/subkon/${deleteId}`, {
        method: "DELETE",
      });

      const result: {
        error?: string;
      } = await res.json();

      if (!res.ok) {
        showToast(result.error ?? "Gagal menghapus subkon", "error");
        return;
      }

      showToast("Subkon berhasil dihapus", "success");

      setDeleteId(null);

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE SUBKON ERROR:", error);

      showToast("Gagal menghapus subkon", "error");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, [proyekId]);

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Subkon Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/subkon/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Subkon
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
                <th className="border px-3 py-2">Vendor</th>
                <th className="border px-3 py-2 text-right">Pekerjaan</th>
                <th className="border px-3 py-2">Kategori</th>
                <th className="border px-3 py-2">Nilai Kontrak</th>
                <th className="border px-3 py-2">Pembayaran</th>
                <th className="border px-3 py-2">Periode</th>
                <th className="border px-3 py-2">Status</th>
                <th className="border px-3 py-2 text-right">Jurnal</th>
                <th className="border px-3 py-2 text-right">Keterangan</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-4">
                    Belum ada data...
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
                      <div className="font-medium">{item.nama_vendor}</div>
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.pekerjaan}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.kategori?.nama ?? "-"}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.nilai_kontrak}
                    </td>
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

                    <td className="text-center">{item.status}</td>
                    <td className="border px-3 py-2 text-right">
                      <div className="line-clamp-2 text-xs text-gray-500"></div>
                      {item.keterangan}
                    </td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/proyek/${proyekId}/subkon/${item.id}/edit`,
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
        description="Yakin ingin menghapus subkon ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
