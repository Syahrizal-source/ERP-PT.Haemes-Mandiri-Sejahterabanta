"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type RealisasiItem = {
  id: string;
  id_proyek: string;
  id_rab: string | null;
  id_kategori: number;
  tanggal: string;
  no_bukti: string;
  uraian: string;
  qty: number;
  satuan: string | null;
  harga: number;
  total: number;
  metode_pembayaran: MetodePembayaran;
  keterangan: string | null;
  id_jurnal: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
    aktif: boolean;
  } | null;
};

export default function RealisasiPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<RealisasiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const grandTotal = useMemo<number>(
    () => data.reduce((sum, item) => sum + Number(item.total), 0),
    [data],
  );

  async function fetchRealisasi(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/proyek/realisasi?id_proyek=${encodeURIComponent(proyekId)}`,
      );

      if (!res.ok) {
        const errorData: { error?: string } = await res.json();

        showToast(
          errorData.error ?? "Gagal mengambil data realisasi.",
          "error",
        );

        return;
      }

      const result: unknown = await res.json();

      if (!Array.isArray(result)) {
        showToast("Format data realisasi tidak valid.", "error");
        return;
      }

      setData(result as RealisasiItem[]);
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data realisasi.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/proyek/realisasi/${deleteId}`, {
        method: "DELETE",
      });

      const result: { error?: string; message?: string } = await res.json();

      if (!res.ok) {
        showToast(result.error ?? "Gagal menghapus realisasi.", "error");
        return;
      }

      showToast(result.message ?? "Realisasi berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchRealisasi();
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus realisasi.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  function formatMetodePembayaran(metode: MetodePembayaran): string {
    switch (metode) {
      case "KAS":
        return "Kas Proyek";

      case "KAS_BESAR":
        return "Kas Besar";

      case "KAS_KECIL":
        return "Kas Kecil";

      case "BANK":
        return "Bank";

      case "HUTANG":
        return "Hutang Supplier";

      default:
        return metode;
    }
  }

  function getMetodeClass(metode: MetodePembayaran): string {
    switch (metode) {
      case "KAS":
        return "rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700";

      case "KAS_BESAR":
        return "rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700";

      case "KAS_KECIL":
        return "rounded bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700";

      case "BANK":
        return "rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700";

      case "HUTANG":
        return "rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700";

      default:
        return "rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700";
    }
  }

  useEffect(() => {
    void fetchRealisasi();

    // fetchRealisasi hanya bergantung pada proyekId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="mx-auto max-w-7xl">
      <Card title="Realisasi Biaya Proyek">
        {/* ACTION BAR */}
        <div className="mb-4 flex justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/realisasi/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Realisasi
          </Button>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">No</th>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">No Bukti</th>
                  <th className="border px-3 py-2">Kategori</th>
                  <th className="border px-3 py-2">Uraian</th>
                  <th className="border px-3 py-2 text-right">Qty</th>
                  <th className="border px-3 py-2">Satuan</th>
                  <th className="border px-3 py-2">Metode</th>
                  <th className="border px-3 py-2 text-right">Harga</th>
                  <th className="border px-3 py-2 text-right">Total</th>
                  <th className="border px-3 py-2 text-center">Jurnal</th>
                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-gray-500">
                      Belum ada data realisasi untuk proyek ini.
                    </td>
                  </tr>
                ) : (
                  data.map((item: RealisasiItem, index: number) => {
                    const posted = item.id_jurnal !== null;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border px-3 py-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border px-3 py-2">
                          {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 font-medium">
                          {item.no_bukti}
                        </td>

                        <td className="border px-3 py-2">
                          {item.kategori ? (
                            <div className="flex flex-col gap-1">
                              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                {item.kategori.nama}
                              </span>

                              <span className="text-xs text-gray-500">
                                {item.kategori.kode}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="border px-3 py-2">{item.uraian}</td>

                        <td className="border px-3 py-2 text-right">
                          {Number(item.qty).toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          {item.satuan ?? "-"}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          <span
                            className={getMetodeClass(item.metode_pembayaran)}
                          >
                            {formatMetodePembayaran(item.metode_pembayaran)}
                          </span>
                        </td>

                        <td className="border px-3 py-2 text-right">
                          Rp {Number(item.harga).toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right font-semibold text-blue-600">
                          Rp {Number(item.total).toLocaleString("id-ID")}
                        </td>

                        {/* STATUS JURNAL */}
                        <td className="border px-3 py-2 text-center">
                          {posted ? (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Posted #{item.id_jurnal}
                            </span>
                          ) : (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* AKSI */}
                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={posted}
                              onClick={() =>
                                router.push(
                                  `/proyek/${proyekId}/realisasi/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={posted}
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* TOTAL */}
            <div className="mt-4 flex justify-end">
              <div className="rounded-lg border bg-gray-50 px-5 py-3">
                <div className="text-right font-bold text-green-600">
                  Total Realisasi : Rp {grandTotal.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CONFIRM DELETE */}
      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus Realisasi ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
