"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPES
// =====================================================

type MetodePenerimaanProyek = "KAS" | "BANK";

type PenerimaanItem = {
  id: string;
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: MetodePenerimaanProyek | null;
  bank: string | null;
};

// =====================================================
// PAGE
// =====================================================

export default function PenerimaanListPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id;

  const [data, setData] = useState<PenerimaanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ===================================================
  // LOAD DATA
  // ===================================================

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/proyek/penerimaan?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengambil data penerimaan.";

        throw new Error(errorMessage);
      }

      if (!Array.isArray(result)) {
        throw new Error("Format data penerimaan tidak valid.");
      }

      setData(result as PenerimaanItem[]);
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data penerimaan.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // DELETE
  // ===================================================

  async function handleDelete(penerimaanId: string): Promise<void> {
    const confirmed = window.confirm(
      "Yakin ingin menghapus penerimaan ini?\n\nSaldo piutang proyek akan dihitung ulang.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(penerimaanId);

      const res = await fetch(`/api/proyek/penerimaan/${penerimaanId}`, {
        method: "DELETE",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus penerimaan.";

        throw new Error(errorMessage);
      }

      showToast(
        "Penerimaan berhasil dihapus dan saldo piutang disinkronkan.",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus penerimaan.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ===================================================
  // EFFECT
  // ===================================================

  useEffect(() => {
    if (!proyekId) {
      return;
    }
    void fetchData();

    // fetchData sengaja dipanggil ketika proyek berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  // ===================================================
  // TOTAL
  // ===================================================

  const totalPenerimaan = data.reduce(
    (sum, item) => sum + Number(item.jumlah),
    0,
  );

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Penerimaan Proyek">
        {/* =============================================
            HEADER
        ============================================= */}

        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/penerimaan/form`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Penerimaan
          </Button>
        </div>

        {/* =============================================
            SUMMARY
        ============================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Jumlah Transaksi</p>

            <p className="text-xl font-semibold">{data.length}</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Penerimaan</p>

            <p className="text-xl font-semibold">
              Rp {totalPenerimaan.toLocaleString("id-ID")}
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Status Data</p>

            <p className="text-xl font-semibold">
              {loading ? "Memuat..." : "Aktif"}
            </p>
          </div>
        </div>

        {/* =============================================
            TABLE
        ============================================= */}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            Memuat data penerimaan...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-center">No</th>

                  <th className="border px-3 py-2 text-left">Tanggal</th>

                  <th className="border px-3 py-2 text-left">ID Tagihan</th>

                  <th className="border px-3 py-2 text-right">Jumlah</th>

                  <th className="border px-3 py-2 text-center">Metode</th>

                  <th className="border px-3 py-2 text-left">Bank</th>

                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border px-3 py-8 text-center text-gray-500"
                    >
                      Belum ada penerimaan proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </td>

                      <td className="border px-3 py-2">
                        <span className="font-mono text-xs">
                          {item.id_tagihan}
                        </span>
                      </td>

                      <td className="border px-3 py-2 text-right font-medium">
                        Rp {Number(item.jumlah).toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-center">
                        <span className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium">
                          {item.metode ?? "-"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        {item.metode === "BANK" ? (item.bank ?? "-") : "-"}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/penerimaan/${item.id}/edit`,
                              )
                            }
                            disabled={deletingId === item.id}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            disabled={deletingId === item.id}
                            onClick={() => void handleDelete(item.id)}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={3} className="border px-3 py-2 text-right">
                      TOTAL
                    </td>

                    <td className="border px-3 py-2 text-right">
                      Rp {totalPenerimaan.toLocaleString("id-ID")}
                    </td>

                    <td colSpan={3} className="border" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
