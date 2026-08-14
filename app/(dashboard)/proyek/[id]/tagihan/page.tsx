"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  ListTree,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type StatusTagihan =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type TagihanItem = {
  id: string;
  id_proyek: string;
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  status: StatusTagihan;

  no_bukti: string | null;
  periode: string | null;

  total_material: number;
  total_alat_berat: number;
  total_tenaga_kerja: number;
  total_operasional: number;
  total_realisasi: number;
  total_subkon: number;
  total_progress: number;

  nilai_ppn: number;
  nilai_pph: number;
  grand_total: number;

  id_jurnal: number | null;

  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

type ApiErrorResponse = {
  error?: string;
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatRupiah(value: unknown): string {
  return `Rp ${toNumber(value).toLocaleString("id-ID")}`;
}

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusClass(status: StatusTagihan): string {
  switch (status) {
    case "Paid (Pembayaran Penuh/ Lunas)":
      return "bg-green-100 text-green-700";

    case "Partial (Pembayaran Sebagian)":
      return "bg-yellow-100 text-yellow-700";

    case "Unpaid (Menunggu Pembayaran)":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function isPosted(item: TagihanItem): boolean {
  return item.id_jurnal !== null;
}

export default function TagihanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<TagihanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData(): Promise<void> {
      try {
        setLoading(true);

        const res = await fetch(`/api/proyek/tagihan?id_proyek=${proyekId}`, {
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          const errorResult = result as ApiErrorResponse;

          if (mounted) {
            showToast(
              errorResult.error ?? "Gagal mengambil data tagihan.",
              "error",
            );
          }

          return;
        }

        if (!Array.isArray(result)) {
          if (mounted) {
            showToast("Format data tagihan tidak valid.", "error");
          }

          return;
        }

        if (mounted) {
          setData(result as TagihanItem[]);
        }
      } catch (error: unknown) {
        console.error("FETCH TAGIHAN ERROR:", error);

        if (mounted) {
          showToast("Gagal mengambil data tagihan.", "error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [proyekId, showToast]);

  const totalNilai = data.reduce((sum, item) => sum + toNumber(item.nilai), 0);

  const totalPPN = data.reduce(
    (sum, item) => sum + toNumber(item.nilai_ppn),
    0,
  );

  const totalPPh = data.reduce(
    (sum, item) => sum + toNumber(item.nilai_pph),
    0,
  );

  const totalGrand = data.reduce(
    (sum, item) => sum + toNumber(item.grand_total),
    0,
  );

  const totalPosted = data.filter((item) => isPosted(item)).length;

  const totalDraft = data.length - totalPosted;

  async function reloadData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(`/api/proyek/tagihan?id_proyek=${proyekId}`, {
        cache: "no-store",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        showToast(
          errorResult.error ?? "Gagal mengambil data tagihan.",
          "error",
        );

        return;
      }

      if (!Array.isArray(result)) {
        showToast("Format data tagihan tidak valid.", "error");

        return;
      }

      setData(result as TagihanItem[]);
    } catch (error: unknown) {
      console.error("RELOAD TAGIHAN ERROR:", error);

      showToast("Gagal memuat ulang data tagihan.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(item: TagihanItem): void {
    if (isPosted(item)) {
      showToast(
        "Tagihan sudah diposting ke jurnal dan tidak dapat diedit.",
        "error",
      );

      return;
    }

    router.push(`/proyek/${proyekId}/tagihan/${item.id}/edit`);
  }

  function handleDeleteRequest(item: TagihanItem): void {
    if (isPosted(item)) {
      showToast(
        "Tagihan sudah diposting ke jurnal dan tidak dapat dihapus.",
        "error",
      );

      return;
    }

    setDeleteId(item.id);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) {
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(`/api/proyek/tagihan/${deleteId}`, {
        method: "DELETE",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        showToast(errorResult.error ?? "Gagal menghapus tagihan.", "error");

        return;
      }

      showToast("Tagihan berhasil dihapus.", "success");

      setDeleteId(null);

      await reloadData();
    } catch (error: unknown) {
      console.error("DELETE TAGIHAN ERROR:", error);

      showToast("Gagal menghapus tagihan.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Card title="Tagihan Proyek">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-semibold">Tagihan Proyek</h1>
            <p className="text-sm text-gray-500">
              Kelola tagihan dan detail sumber biaya proyek.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/proyek/${proyekId}`)}
            >
              Kembali ke Proyek
            </Button>

            <Button
              onClick={() => router.push(`/proyek/${proyekId}/tagihan/form`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tagihan
            </Button>
          </div>
        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Total Tagihan</div>

            <div className="mt-1 text-lg font-semibold">{data.length}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Nilai Sebelum Pajak</div>

            <div className="mt-1 text-lg font-semibold">
              {formatRupiah(totalNilai)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Total PPN</div>

            <div className="mt-1 text-lg font-semibold">
              {formatRupiah(totalPPN)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Total PPh</div>

            <div className="mt-1 text-lg font-semibold">
              {formatRupiah(totalPPh)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Grand Total</div>

            <div className="mt-1 text-lg font-bold">
              {formatRupiah(totalGrand)}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              Posted: {totalPosted} · Draft: {totalDraft}
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data tagihan...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">No</th>

                  <th className="border px-3 py-2">No Invoice</th>

                  <th className="border px-3 py-2">Tanggal</th>

                  <th className="border px-3 py-2">Periode</th>

                  <th className="border px-3 py-2 text-right">Nilai</th>

                  <th className="border px-3 py-2 text-right">PPN</th>

                  <th className="border px-3 py-2 text-right">PPh</th>

                  <th className="border px-3 py-2 text-right">Grand Total</th>

                  <th className="border px-3 py-2">Status</th>

                  <th className="border px-3 py-2">Jurnal</th>

                  <th className="border px-3 py-2">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">
                      Belum ada tagihan proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    const posted = isPosted(item);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border px-3 py-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="font-medium">
                            {item.nomor_invoice}
                          </div>

                          {item.no_bukti && (
                            <div className="text-xs text-gray-500">
                              {item.no_bukti}
                            </div>
                          )}
                        </td>

                        <td className="border px-3 py-2">
                          {formatTanggal(item.tanggal)}
                        </td>

                        <td className="border px-3 py-2">
                          {item.periode ?? "-"}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {formatRupiah(item.nilai)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {formatRupiah(item.nilai_ppn)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {formatRupiah(item.nilai_pph)}
                        </td>

                        <td className="border px-3 py-2 text-right font-semibold">
                          {formatRupiah(item.grand_total)}
                        </td>

                        <td className="border px-3 py-2">
                          <span
                            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getStatusClass(
                              item.status,
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {posted ? (
                            <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              <FileText className="h-3 w-3" />
                              Posted
                            </span>
                          ) : (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                              Draft
                            </span>
                          )}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={posted}
                              onClick={() => handleEdit(item)}
                              title={
                                posted
                                  ? "Tagihan sudah diposting"
                                  : "Edit tagihan"
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/proyek/${proyekId}/tagihan/${item.id}/detail`,
                                )
                              }
                            >
                              <ListTree className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={posted}
                              onClick={() => handleDeleteRequest(item)}
                              title={
                                posted
                                  ? "Tagihan sudah diposting"
                                  : "Hapus tagihan"
                              }
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
          DELETE CONFIRM
      ===================================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Tagihan beserta detail tagihan akan dihapus. Tagihan yang sudah diposting tidak dapat dihapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
