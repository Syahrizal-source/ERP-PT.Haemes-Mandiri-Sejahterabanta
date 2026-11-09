"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaranProgress =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

type StatusProgress = "ON_PROGRESS" | "SELESAI" | "TERLAMBAT" | "DIBATALKAN";

type ProgressItem = {
  id: string;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;

  target_volume: number;
  realisasi_volume: number;
  deviasi: number;
  progress_persen: number;

  nilai_progress: number;

  satuan: "m3" | "m2" | "km" | "ton" | "unit" | "ha";

  status: StatusProgress;

  periode: string | null;
  lokasi: string | null;
  pic: string | null;

  metode_pembayaran: MetodePembayaranProgress;

  id_jurnal: number | null;

  keterangan: string | null;

  created_at?: string;
  updated_at?: string;
};

function formatNumber(value: number): string {
  return Number(value).toLocaleString("id-ID");
}

function formatRupiah(value: number): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function getPaymentClass(metode: MetodePembayaranProgress): string {
  switch (metode) {
    case "KAS":
    case "KAS_BESAR":
    case "KAS_KECIL":
      return "rounded bg-green-100 px-2 py-1 text-green-700";

    case "BANK":
      return "rounded bg-blue-100 px-2 py-1 text-blue-700";

    case "HUTANG":
      return "rounded bg-orange-100 px-2 py-1 text-orange-700";

    default:
      return "rounded bg-gray-100 px-2 py-1 text-gray-700";
  }
}

function getStatusClass(status: StatusProgress): string {
  switch (status) {
    case "SELESAI":
      return "rounded bg-green-100 px-2 py-1 text-green-700";

    case "TERLAMBAT":
      return "rounded bg-red-100 px-2 py-1 text-red-700";

    case "DIBATALKAN":
      return "rounded bg-gray-100 px-2 py-1 text-gray-700";

    case "ON_PROGRESS":
      return "rounded bg-yellow-100 px-2 py-1 text-yellow-700";

    default:
      return "rounded bg-gray-100 px-2 py-1 text-gray-700";
  }
}

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
    try {
      setLoading(true);

      const response = await fetch(
        `/api/proyek/progress?id_proyek=${encodeURIComponent(proyekId)}`,
      );

      if (!response.ok) {
        const result: unknown = await response.json();

        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengambil data progress.";

        throw new Error(message);
      }

      const result: unknown = await response.json();

      if (!Array.isArray(result)) {
        throw new Error("Format data progress tidak valid.");
      }

      setData(result as ProgressItem[]);
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data progress.",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/proyek/progress/${deleteId}`, {
        method: "DELETE",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus progress.";

        throw new Error(message);
      }

      showToast("Progress berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchProgress();
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus progress.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    void fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  return (
    <div className="mx-auto max-w-7xl">
      <Card title="Progress Proyek">
        {/* =====================================================
            ACTION BAR
        ====================================================== */}

        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/progress/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Progress
          </Button>
        </div>

        {/* =====================================================
            TABLE
        ====================================================== */}

        {loading ? (
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
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
                    <td colSpan={14} className="py-8 text-center text-gray-500">
                      Belum ada progress proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item: ProgressItem, index: number) => {
                    const isPosted = item.id_jurnal !== null;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* NO */}
                        <td className="border px-2 py-2 text-center">
                          {index + 1}
                        </td>

                        {/* TANGGAL */}
                        <td className="border px-3 py-2 whitespace-nowrap">
                          {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        </td>

                        {/* NO BUKTI */}
                        <td className="border px-2 py-2 font-mono whitespace-nowrap">
                          {item.no_bukti}
                        </td>

                        {/* TARGET */}
                        <td className="border px-3 py-2 text-right whitespace-nowrap">
                          {formatNumber(item.target_volume)} {item.satuan}
                        </td>

                        {/* REALISASI */}
                        <td className="border px-3 py-2 text-right whitespace-nowrap">
                          {formatNumber(item.realisasi_volume)} {item.satuan}
                        </td>

                        {/* DEVIASI */}
                        <td
                          className={`border px-3 py-2 text-right whitespace-nowrap ${
                            Number(item.deviasi) < 0
                              ? "text-red-600"
                              : Number(item.deviasi) > 0
                                ? "text-green-600"
                                : "text-gray-600"
                          }`}
                        >
                          {formatNumber(item.deviasi)} {item.satuan}
                        </td>

                        {/* PROGRESS % */}
                        <td className="border px-2 py-2 text-right whitespace-nowrap">
                          {Number(item.progress_persen).toFixed(2)}%
                        </td>

                        {/* NILAI */}
                        <td className="border px-2 py-2 text-right font-semibold text-blue-600 whitespace-nowrap">
                          {formatRupiah(item.nilai_progress)}
                        </td>

                        {/* PEMBAYARAN */}
                        <td className="border px-3 py-2 text-center whitespace-nowrap">
                          <span
                            className={getPaymentClass(item.metode_pembayaran)}
                          >
                            {item.metode_pembayaran}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="border px-3 py-2 text-center whitespace-nowrap">
                          <span className={getStatusClass(item.status)}>
                            {item.status}
                          </span>
                        </td>

                        {/* JURNAL */}
                        <td className="border px-3 py-2 text-center whitespace-nowrap">
                          {isPosted ? (
                            <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                              Posted
                            </span>
                          ) : (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* PIC */}
                        <td className="border px-2 py-2 whitespace-nowrap">
                          {item.pic ?? "-"}
                        </td>

                        {/* KETERANGAN */}
                        <td className="max-w-xs border px-2 py-2">
                          <div className="line-clamp-2">
                            {item.keterangan ?? "-"}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={isPosted}
                              title={
                                isPosted
                                  ? "Progress sudah Posted dan tidak dapat diedit."
                                  : "Edit Progress"
                              }
                              onClick={() => {
                                if (isPosted) {
                                  return;
                                }

                                router.push(
                                  `/proyek/${proyekId}/progress/${item.id}/edit`,
                                );
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={isPosted}
                              title={
                                isPosted
                                  ? "Progress sudah Posted dan tidak dapat dihapus."
                                  : "Hapus Progress"
                              }
                              onClick={() => {
                                if (isPosted) {
                                  return;
                                }

                                setDeleteId(item.id);
                              }}
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
          </div>
        )}
      </Card>

      {/* =====================================================
          CONFIRM DELETE
      ====================================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus progress ini?"
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
        loading={deleting}
      />
    </div>
  );
}
