"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Edit,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

/* ============================================================
   TYPE
============================================================ */

type HutangStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type HutangKategori = {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
};

type HutangItem = {
  id: string;
  id_proyek: string;
  id_kategori: number | null;

  supplier: string | null;
  tanggal: string | null;
  nilai: number;

  jatuh_tempo: string | null;
  status: HutangStatus | null;

  no_bukti: string | null;
  periode: string | null;

  id_jurnal: number | null;
  sumber: string | null;
  id_referensi: string | null;

  jumlah_pembayaran: number;
  sisa: number;

  tanggal_pembayaran: string | null;
  keterangan: string | null;

  kategori?: HutangKategori | null;

  created_at?: string;
  updated_at?: string;
};

type HutangApiResponse = {
  success: boolean;
  data?: HutangItem[];
  error?: string;
  detail?: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: string;
  detail?: string;
};

/* ============================================================
   FORMATTER
============================================================ */

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/* ============================================================
   STATUS
============================================================ */

function getStatusClass(status: HutangStatus | null): string {
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

/* ============================================================
   PAGE
============================================================ */

export default function HutangPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id;

  const [data, setData] = useState<HutangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  /* ============================================================
     GET DATA
  ============================================================ */

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/proyek/hutang?id_proyek=${encodeURIComponent(proyekId)}`,
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorData = result as ApiErrorResponse;

        throw new Error(
          errorData.error ?? "Gagal mengambil data hutang proyek.",
        );
      }

      const apiResult = result as HutangApiResponse;

      if (!apiResult.success || !Array.isArray(apiResult.data)) {
        throw new Error("Format response hutang proyek tidak valid.");
      }

      const rows: HutangItem[] = apiResult.data.map((item) => ({
        ...item,
        nilai: Number(item.nilai),
        jumlah_pembayaran: Number(item.jumlah_pembayaran ?? 0),
        sisa: Number(item.sisa ?? item.nilai),
      }));

      setData(rows);
    } catch (error: unknown) {
      console.error("GET HUTANG PROYEK:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data hutang proyek.",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* ============================================================
     DELETE
  ============================================================ */

  async function handleDelete(): Promise<void> {
    if (!deleteId || deleting) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/proyek/hutang/${deleteId}`, {
        method: "DELETE",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorData = result as ApiErrorResponse;

        throw new Error(errorData.error ?? "Gagal menghapus hutang proyek.");
      }

      showToast("Hutang proyek berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE HUTANG PROYEK:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menghapus hutang proyek.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* ============================================================
     SUMMARY
  ============================================================ */

  const selectedHutang = data.find((item) => item.id === deleteId) ?? null;

  const totalNilai = data.reduce((sum, item) => sum + Number(item.nilai), 0);

  const totalPembayaran = data.reduce(
    (sum, item) => sum + Number(item.jumlah_pembayaran ?? 0),
    0,
  );

  const totalSisa = data.reduce(
    (sum, item) => sum + Number(item.sisa ?? item.nilai),
    0,
  );

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <Card title="Hutang Proyek">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Daftar hutang dan kewajiban supplier proyek.
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
              onClick={() => router.push(`/proyek/${proyekId}/hutang/form`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Hutang
            </Button>
          </div>
        </div>
      </Card>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Total Hutang">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />

            <div>
              <p className="text-2xl font-semibold">
                {formatRupiah(totalNilai)}
              </p>

              <p className="text-sm text-gray-500">{data.length} transaksi</p>
            </div>
          </div>
        </Card>

        <Card title="Total Pembayaran">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />

            <div>
              <p className="text-2xl font-semibold">
                {formatRupiah(totalPembayaran)}
              </p>

              <p className="text-sm text-gray-500">Pembayaran tercatat</p>
            </div>
          </div>
        </Card>

        <Card title="Sisa Hutang">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />

            <div>
              <p className="text-2xl font-semibold">
                {formatRupiah(totalSisa)}
              </p>

              <p className="text-sm text-gray-500">Kewajiban tersisa</p>
            </div>
          </div>
        </Card>
      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <Card title="Daftar Hutang">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat data hutang...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">No. Bukti</th>

                  <th className="border p-3 text-left">Tanggal</th>

                  <th className="border p-3 text-left">Supplier</th>

                  <th className="border p-3 text-right">Nilai</th>

                  <th className="border p-3 text-right">Pembayaran</th>

                  <th className="border p-3 text-right">Sisa</th>

                  <th className="border p-3 text-left">Jatuh Tempo</th>

                  <th className="border p-3 text-center">Status</th>

                  <th className="border p-3 text-center">Jurnal</th>

                  <th className="border p-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="border p-8 text-center text-gray-500"
                    >
                      Belum ada hutang proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((hutang) => {
                    const sudahPosted = hutang.id_jurnal !== null;

                    return (
                      <tr key={hutang.id} className="hover:bg-gray-50">
                        <td className="border p-3">
                          <div className="font-medium">
                            {hutang.no_bukti ?? "-"}
                          </div>

                          {hutang.periode && (
                            <div className="text-xs text-gray-500">
                              {hutang.periode}
                            </div>
                          )}
                        </td>

                        <td className="border p-3">
                          {formatTanggal(hutang.tanggal)}
                        </td>

                        <td className="border p-3">{hutang.supplier ?? "-"}</td>

                        <td className="border p-3 text-right font-medium">
                          {formatRupiah(Number(hutang.nilai))}
                        </td>

                        <td className="border p-3 text-right">
                          {formatRupiah(Number(hutang.jumlah_pembayaran ?? 0))}
                        </td>

                        <td className="border p-3 text-right font-medium">
                          {formatRupiah(Number(hutang.sisa ?? hutang.nilai))}
                        </td>

                        <td className="border p-3">
                          {formatTanggal(hutang.jatuh_tempo)}
                        </td>

                        <td className="border p-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                              hutang.status,
                            )}`}
                          >
                            {hutang.status ?? "-"}
                          </span>
                        </td>

                        <td className="border p-3 text-center">
                          {sudahPosted ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                              Posted #{hutang.id_jurnal}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                              Belum Posted
                            </span>
                          )}
                        </td>

                        <td className="border p-3">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/proyek/${proyekId}/hutang/${hutang.id}/edit`,
                                )
                              }
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() => setDeleteId(hutang.id)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="border p-3 text-right">
                      TOTAL
                    </td>

                    <td className="border p-3 text-right">
                      {formatRupiah(totalNilai)}
                    </td>

                    <td className="border p-3 text-right">
                      {formatRupiah(totalPembayaran)}
                    </td>

                    <td className="border p-3 text-right">
                      {formatRupiah(totalSisa)}
                    </td>

                    <td colSpan={4} className="border p-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {/* =====================================================
          DELETE CONFIRMATION
      ====================================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Hapus Hutang Proyek"
        description={
          selectedHutang?.id_jurnal !== null
            ? "Transaksi ini sudah diposting ke jurnal dan tidak dapat dihapus."
            : "Yakin ingin menghapus hutang proyek ini? Transaksi yang sudah memiliki pembayaran atau jurnal tidak dapat dihapus."
        }
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
