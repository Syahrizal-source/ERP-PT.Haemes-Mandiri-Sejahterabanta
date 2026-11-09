"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPES
// =====================================================

type MetodePembayaranOperasional =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

type StatusOperasional = "DRAFT" | "POSTED" | "DIBATALKAN";

type KategoriOperasional = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

type OperasionalItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  no_bukti: string;
  tanggal: string;
  uraian: string;
  qty: number;
  satuan: string | null;
  harga: number;
  total: number;
  supplier: string | null;
  metode_pembayaran: MetodePembayaranOperasional;
  periode: string | null;
  status: StatusOperasional;
  keterangan: string | null;
  id_jurnal: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  kategori: KategoriOperasional | null;
};

// =====================================================
// HELPERS
// =====================================================

function formatNumber(value: number | string | null): string {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toLocaleString("id-ID");
}

function formatRupiah(value: number | string | null): string {
  return `Rp ${formatNumber(value)}`;
}

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID");
}

function getMetodeLabel(metode: MetodePembayaranOperasional): string {
  switch (metode) {
    case "KAS":
      return "Kas";

    case "KAS_BESAR":
      return "Kas Besar";

    case "KAS_KECIL":
      return "Kas Kecil";

    case "BANK":
      return "Bank";

    case "HUTANG":
      return "Hutang";

    default:
      return metode;
  }
}

// =====================================================
// PAGE
// =====================================================

export default function OperasionalPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [data, setData] = useState<OperasionalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<boolean>(false);

  // ===================================================
  // FETCH DATA
  // ===================================================

  async function fetchData(): Promise<void> {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/proyek/operasional?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const result: unknown = await response.json();

        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengambil data operasional.";

        showToast(message, "error");
        return;
      }

      const result: unknown = await response.json();

      if (!Array.isArray(result)) {
        showToast("Format data operasional tidak valid.", "error");
        return;
      }

      setData(result as OperasionalItem[]);
    } catch {
      showToast("Terjadi kesalahan saat mengambil data operasional.", "error");
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const qty = Number(item.qty);
        const total = Number(item.total);

        if (Number.isFinite(qty)) {
          acc.qty += qty;
        }

        if (Number.isFinite(total)) {
          acc.total += total;
        }

        if (item.id_jurnal !== null) {
          acc.posted += 1;
        } else if (item.status === "DRAFT") {
          acc.draft += 1;
        }

        if (item.status === "DIBATALKAN") {
          acc.cancelled += 1;
        }

        return acc;
      },
      {
        qty: 0,
        total: 0,
        posted: 0,
        draft: 0,
        cancelled: 0,
      },
    );
  }, [data]);

  // ===================================================
  // DELETE
  // ===================================================

  async function handleDelete(): Promise<void> {
    if (!deleteId) {
      return;
    }

    const target = data.find((item) => item.id === deleteId);

    if (!target) {
      setDeleteId(null);
      return;
    }

    // Jangan biarkan UI mengirim DELETE untuk transaksi
    // yang sudah memiliki jurnal.
    if (target.id_jurnal !== null) {
      showToast(
        `Operasional ${target.no_bukti} sudah diposting dan tidak dapat dihapus.`,
        "error",
      );

      setDeleteId(null);
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/proyek/operasional/${deleteId}`, {
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
            : "Gagal menghapus operasional.";

        showToast(message, "error");
        return;
      }

      showToast("Operasional berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchData();
    } catch {
      showToast("Terjadi kesalahan saat menghapus operasional.", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void fetchData();

    // fetchData menggunakan showToast dan state internal.
    // proyekId adalah dependency yang relevan untuk reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-7xl">
      <Card title="Operasional Proyek">
        {/* =============================================
            ACTION BAR
        ============================================= */}

        <div className="mb-4 flex items-center justify-between gap-3">
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

        {/* =============================================
            SUMMARY
        ============================================= */}

        {!loading && data.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Total Qty</div>

              <div className="mt-1 text-lg font-semibold">
                {formatNumber(summary.qty)}
              </div>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Total Nilai</div>

              <div className="mt-1 text-lg font-semibold text-blue-600">
                {formatRupiah(summary.total)}
              </div>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Posted</div>

              <div className="mt-1 text-lg font-semibold text-green-600">
                {summary.posted}
              </div>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Draft / Batal</div>

              <div className="mt-1 text-lg font-semibold">
                {summary.draft} / {summary.cancelled}
              </div>
            </div>
          </div>
        )}

        {/* =============================================
            TABLE
        ============================================= */}

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
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

                  <th className="border px-3 py-2 text-center">Jurnal</th>

                  <th className="border px-3 py-2 text-right">Harga</th>

                  <th className="border px-3 py-2 text-right">Total</th>

                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-gray-500">
                      Belum ada operasional proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    const isPosted = item.id_jurnal !== null;

                    const isCancelled = item.status === "DIBATALKAN";

                    const canEdit = !isPosted && !isCancelled;

                    const canDelete = !isPosted;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* No */}
                        <td className="border px-2 py-2 text-center">
                          {index + 1}
                        </td>

                        {/* No Bukti */}
                        <td className="border px-3 py-2 font-mono">
                          {item.no_bukti}
                        </td>

                        {/* Tanggal */}
                        <td className="border px-3 py-2 whitespace-nowrap">
                          {formatTanggal(item.tanggal)}
                        </td>

                        {/* Kategori */}
                        <td className="border px-3 py-2">
                          <div className="font-medium">
                            {item.kategori?.nama ?? "Kategori tidak ditemukan"}
                          </div>

                          <div className="text-xs text-gray-500">
                            {item.kategori?.kode ?? "-"}
                          </div>

                          <div className="mt-1 text-xs text-gray-600">
                            {item.uraian}
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="border px-3 py-2 text-right">
                          {formatNumber(item.qty)}
                        </td>

                        {/* Satuan */}
                        <td className="border px-3 py-2 text-center">
                          {item.satuan ?? "-"}
                        </td>

                        {/* Supplier */}
                        <td className="border px-3 py-2">
                          {item.supplier ?? "-"}
                        </td>

                        {/* Pembayaran */}
                        <td className="border px-3 py-2 text-center">
                          <span
                            className={
                              item.metode_pembayaran === "KAS"
                                ? "rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                                : item.metode_pembayaran === "KAS_BESAR"
                                  ? "rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                                  : item.metode_pembayaran === "KAS_KECIL"
                                    ? "rounded bg-lime-100 px-2 py-1 text-xs text-lime-700"
                                    : item.metode_pembayaran === "BANK"
                                      ? "rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                                      : "rounded bg-orange-100 px-2 py-1 text-xs text-orange-700"
                            }
                          >
                            {getMetodeLabel(item.metode_pembayaran)}
                          </span>
                        </td>

                        {/* Periode */}
                        <td className="border px-3 py-2 whitespace-nowrap">
                          {item.periode ?? "-"}
                        </td>

                        {/* Keterangan */}
                        <td className="border px-3 py-2">
                          <div className="max-w-xs line-clamp-2">
                            {item.keterangan ?? "-"}
                          </div>
                        </td>

                        {/* Jurnal */}
                        <td className="border px-3 py-2 text-center">
                          {isPosted ? (
                            <div>
                              <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Posted
                              </span>

                              <div className="mt-1 text-xs text-gray-500">
                                #{item.id_jurnal}
                              </div>
                            </div>
                          ) : item.status === "DIBATALKAN" ? (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Harga */}
                        <td className="border px-3 py-2 text-right whitespace-nowrap">
                          {formatRupiah(item.harga)}
                        </td>

                        {/* Total */}
                        <td className="border px-3 py-2 text-right font-semibold text-blue-600 whitespace-nowrap">
                          {formatRupiah(item.total)}
                        </td>

                        {/* Aksi */}
                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={!canEdit}
                              onClick={() => {
                                if (!canEdit) {
                                  showToast(
                                    isPosted
                                      ? "Transaksi sudah diposting ke jurnal dan tidak dapat diedit."
                                      : "Transaksi dibatalkan dan tidak dapat diedit.",
                                    "error",
                                  );
                                  return;
                                }

                                router.push(
                                  `/proyek/${proyekId}/operasional/${item.id}/edit`,
                                );
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={!canDelete}
                              onClick={() => {
                                if (!canDelete) {
                                  showToast(
                                    "Transaksi sudah diposting ke jurnal dan tidak dapat dihapus.",
                                    "error",
                                  );
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

      {/* ===============================================
          CONFIRM DELETE
      =============================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Yakin ingin menghapus operasional ini?"
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
