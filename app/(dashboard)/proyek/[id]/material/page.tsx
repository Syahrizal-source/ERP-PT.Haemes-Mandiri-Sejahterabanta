"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type MaterialKategori = {
  id: number;
  kode: string;
  nama: string;
  jenis: "MATERIAL" | "BIAYA";
};

type MaterialItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  tanggal: string;
  qty: number | string;
  satuan: string | null;
  harga: number | string;
  total: number | string;
  metode_pembayaran: MetodePembayaran;
  gudang: string | null;
  supplier: string | null;
  keterangan: string | null;
  no_bukti: string | null;
  id_jurnal: number | null;
  created_at?: string;
  updated_at?: string;
  kategori: MaterialKategori | null;
};

type MaterialGetResponse = {
  success: boolean;
  data: MaterialItem[];
  error?: string;
};

function formatRupiah(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "Rp 0";
  }

  return `Rp ${numericValue.toLocaleString("id-ID")}`;
}

function formatNumber(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString("id-ID");
}

function getPaymentClass(metode: MetodePembayaran): string {
  switch (metode) {
    case "KAS":
      return "rounded bg-gray-100 px-2 py-1 text-gray-700";

    case "KAS_BESAR":
      return "rounded bg-green-100 px-2 py-1 text-green-700";

    case "KAS_KECIL":
      return "rounded bg-emerald-100 px-2 py-1 text-emerald-700";

    case "BANK":
      return "rounded bg-blue-100 px-2 py-1 text-blue-700";

    case "HUTANG":
      return "rounded bg-orange-100 px-2 py-1 text-orange-700";

    default:
      return "rounded bg-gray-100 px-2 py-1 text-gray-700";
  }
}

function getPaymentLabel(metode: MetodePembayaran): string {
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
      return "Hutang";

    default:
      return metode;
  }
}

export default function MaterialPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [data, setData] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!proyekId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/proyek/material?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = (await response.json()) as MaterialGetResponse;

      if (!response.ok || !result.success) {
        showToast(result.error ?? "Gagal mengambil data material.", "error");

        setData([]);
        return;
      }

      setData(result.data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil data material.";

      showToast(message, "error");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDelete = async (): Promise<void> => {
    if (!deleteId) {
      return;
    }

    const item = data.find((material) => material.id === deleteId);

    if (!item) {
      setDeleteId(null);
      return;
    }

    if (item.id_jurnal !== null) {
      showToast("Material yang sudah Posted tidak boleh dihapus.", "error");

      setDeleteId(null);
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/proyek/material/${deleteId}`, {
        method: "DELETE",
      });

      let result: {
        success?: boolean;
        error?: string;
      } = {};

      try {
        result = (await response.json()) as {
          success?: boolean;
          error?: string;
        };
      } catch {
        // DELETE 204 tidak mempunyai body.
      }

      if (!response.ok || result.success === false) {
        showToast(result.error ?? "Gagal menghapus material.", "error");

        return;
      }

      showToast("Material berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus material.";

      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const totalMaterial = data.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
    0,
  );

  const totalQty = data.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);

  const totalPosted = data.filter((item) => item.id_jurnal !== null).length;

  const totalDraft = data.filter((item) => item.id_jurnal === null).length;

  return (
    <div className="mx-auto max-w-7xl">
      <Card title="Material Proyek">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/material/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Material
          </Button>
        </div>

        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Transaksi</div>

            <div className="mt-1 text-xl font-semibold">{data.length}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Qty</div>

            <div className="mt-1 text-xl font-semibold">
              {formatNumber(totalQty)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Material</div>

            <div className="mt-1 text-xl font-semibold text-blue-600">
              {formatRupiah(totalMaterial)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Posting</div>

            <div className="mt-1 flex gap-2 text-sm">
              <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                Posted {totalPosted}
              </span>

              {totalDraft > 0 && (
                <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                  Draft {totalDraft}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat data material...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-gray-500">
            Belum ada material untuk proyek ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-center">No</th>

                  <th className="border px-3 py-2">No. Bukti</th>

                  <th className="border px-3 py-2">Tanggal</th>

                  <th className="border px-3 py-2">Material</th>

                  <th className="border px-3 py-2 text-right">Qty</th>

                  <th className="border px-3 py-2">Sat</th>

                  <th className="border px-3 py-2 text-right">Harga</th>

                  <th className="border px-3 py-2 text-right">Total</th>

                  <th className="border px-3 py-2">Supplier</th>

                  <th className="border px-3 py-2">Pembayaran</th>

                  <th className="border px-3 py-2">Gudang</th>

                  <th className="border px-3 py-2">Keterangan</th>

                  <th className="border px-3 py-2 text-center">Jurnal</th>

                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item, index) => {
                  const isPosted = item.id_jurnal !== null;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border px-2 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2 font-medium">
                        {item.no_bukti ?? "-"}
                      </td>

                      <td className="border px-3 py-2">
                        {item.tanggal
                          ? new Date(item.tanggal).toLocaleDateString("id-ID")
                          : "-"}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="font-medium">
                          {item.kategori?.nama ?? "-"}
                        </div>

                        {item.kategori?.kode && (
                          <div className="text-xs text-gray-500">
                            {item.kategori.kode}
                          </div>
                        )}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {formatNumber(item.qty)}
                      </td>

                      <td className="border px-3 py-2">{item.satuan ?? "-"}</td>

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.harga)}
                      </td>

                      <td className="border px-3 py-2 text-right font-semibold text-blue-600">
                        {formatRupiah(item.total)}
                      </td>

                      <td className="border px-3 py-2">
                        {item.supplier ?? "-"}
                      </td>

                      <td className="border px-3 py-2 text-center">
                        <span
                          className={getPaymentClass(item.metode_pembayaran)}
                        >
                          {getPaymentLabel(item.metode_pembayaran)}
                        </span>
                      </td>

                      <td className="border px-3 py-2">{item.gudang ?? "-"}</td>

                      <td className="border px-3 py-2">
                        <div className="max-w-xs line-clamp-2">
                          {item.keterangan ?? "-"}
                        </div>
                      </td>

                      <td className="border px-3 py-2 text-center">
                        {isPosted ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-700"
                            onClick={() =>
                              router.push(
                                `/accounting/jurnal/${item.id_jurnal}`,
                              )
                            }
                          >
                            <BookOpen className="h-3.5 w-3.5" />#
                            {item.id_jurnal}
                          </button>
                        ) : (
                          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            disabled={isPosted}
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/material/${item.id}/edit`,
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            disabled={isPosted}
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ================================================= */}
              {/* TOTAL */}
              {/* ================================================= */}

              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={4} className="border px-3 py-3 text-right">
                    TOTAL
                  </td>

                  <td className="border px-3 py-3 text-right">
                    {formatNumber(totalQty)}
                  </td>

                  <td className="border px-3 py-3" />

                  <td className="border px-3 py-3" />

                  <td className="border px-3 py-3 text-right text-blue-600">
                    {formatRupiah(totalMaterial)}
                  </td>

                  <td colSpan={6} className="border px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ===================================================== */}
      {/* CONFIRM DELETE */}
      {/* ===================================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Yakin ingin menghapus material ini? Material yang sudah Posted tidak dapat dihapus."
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
