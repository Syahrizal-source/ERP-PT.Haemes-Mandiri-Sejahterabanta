"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Eye, Loader2, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPE
// Sesuai database public.piutang_proyek
// =====================================================

type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type PiutangProyekItem = {
  id_piutang_proyek: number;
  id_proyek: string;
  id_tagihan: string;
  tanggal: string;
  customer: string;
  tanggal_pembayaran: string | null;
  nilai_piutang: number;
  penerimaan: number;
  saldo: number;
  keterangan: string | null;
  status: StatusPiutangProyek;
  is_posted: boolean;
  id_jurnal: number | null;
  created_at?: string;
  updated_at?: string;
};

type ApiErrorResponse = {
  error?: string;
};

// =====================================================
// HELPER FORMAT RUPIAH
// =====================================================

function formatRupiah(value: number): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

// =====================================================
// HELPER FORMAT TANGGAL
// Hindari masalah timezone
// =====================================================

function formatTanggal(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// =====================================================
// PAGE
// =====================================================

export default function PiutangProyekPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const { showToast } = useToast();

  const proyekId = params.id;

  const [data, setData] = useState<PiutangProyekItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadData = useCallback(async (): Promise<void> => {
    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `/api/proyek/piutang?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        throw new Error(
          errorResult.error ?? "Gagal mengambil data piutang proyek.",
        );
      }

      if (!Array.isArray(result)) {
        throw new Error("Format data piutang proyek tidak valid.");
      }

      const normalized: PiutangProyekItem[] = result.map((item: unknown) => {
        const row = item as Record<string, unknown>;

        return {
          id_piutang_proyek: Number(row.id_piutang_proyek),

          id_proyek: String(row.id_proyek ?? proyekId),

          id_tagihan: String(row.id_tagihan ?? ""),

          tanggal: String(row.tanggal ?? ""),

          customer: String(row.customer ?? ""),

          tanggal_pembayaran:
            typeof row.tanggal_pembayaran === "string"
              ? row.tanggal_pembayaran
              : null,

          nilai_piutang: Number(row.nilai_piutang ?? 0),

          penerimaan: Number(row.penerimaan ?? 0),

          saldo: Number(row.saldo ?? 0),

          keterangan:
            typeof row.keterangan === "string" ? row.keterangan : null,

          status: row.status as StatusPiutangProyek,

          is_posted: row.is_posted === true,

          id_jurnal:
            row.id_jurnal === null || row.id_jurnal === undefined
              ? null
              : Number(row.id_jurnal),

          created_at:
            typeof row.created_at === "string" ? row.created_at : undefined,

          updated_at:
            typeof row.updated_at === "string" ? row.updated_at : undefined,
        };
      });

      setData(normalized);
    } catch (error: unknown) {
      console.error("LOAD PIUTANG PROYEK ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data piutang proyek.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  // ===================================================
  // EFFECT
  // ===================================================

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ===================================================
  // TOTAL
  // ===================================================

  const totalPiutang = data.reduce(
    (sum, item) => sum + Number(item.nilai_piutang),
    0,
  );

  const totalPenerimaan = data.reduce(
    (sum, item) => sum + Number(item.penerimaan),
    0,
  );

  const totalSaldo = data.reduce((sum, item) => sum + Number(item.saldo), 0);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card title="Piutang Proyek">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Daftar piutang yang berasal dari tagihan proyek.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/proyek/${proyekId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Proyek
            </Button>

            <Button
              onClick={() => router.push(`/proyek/${proyekId}/piutang/form`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Piutang
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Piutang</p>

            <p className="mt-1 text-xl font-semibold">
              {formatRupiah(totalPiutang)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Penerimaan</p>

            <p className="mt-1 text-xl font-semibold">
              {formatRupiah(totalPenerimaan)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Saldo</p>

            <p className="mt-1 text-xl font-semibold">
              {formatRupiah(totalSaldo)}
            </p>
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat data ...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-center">No</th>
                  <th className="border px-3 py-2 text-left">Tanggal</th>
                  <th className="border px-3 py-2 text-left">Customer</th>
                  <th className="border px-3 py-2 text-left">ID Tagihan</th>
                  <th className="border px-3 py-2 text-left">
                    Tanggal Pembayaran
                  </th>
                  <th className="border px-3 py-2 text-right">Piutang</th>
                  <th className="border px-3 py-2 text-right">Penerimaan</th>
                  <th className="border px-3 py-2 text-right">Saldo</th>
                  <th className="border px-3 py-2 text-center">Status</th>
                  <th className="border px-3 py-2 text-center">Jurnal</th>
                  <th className="border px-3 py-2 text-center">Posted</th>
                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="border px-3 py-8 text-center text-gray-500"
                    >
                      Tidak ada data piutang proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr
                      key={item.id_piutang_proyek}
                      className="hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2">
                        {formatTanggal(item.tanggal)}
                      </td>
                      <td className="border px-3 py-2">{item.customer}</td>
                      <td className="border px-3 py-2">
                        {item.id_tagihan ? (
                          <span className="font-mono text-xs">
                            {item.id_tagihan}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border px-3 py-2">
                        {formatTanggal(item.tanggal_pembayaran)}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.nilai_piutang)}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.penerimaan)}
                      </td>
                      <td className="border px-3 py-2 text-right font-semibold">
                        {formatRupiah(item.saldo)}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        <span className="inline-flex rounded border px-2 py-1 text-xs">
                          {item.status}
                        </span>
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {item.id_jurnal !== null ? `#${item.id_jurnal}` : "-"}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {item.is_posted ? (
                          <span className="font-semibold">Posted</span>
                        ) : (
                          <span className="text-gray-500">Draft</span>
                        )}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/piutang/${item.id_piutang_proyek}`,
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/piutang/${item.id_piutang_proyek}/edit`,
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* =================================================
                  FOOTER
              ================================================= */}

              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={5} className="border px-3 py-2 text-right">
                      TOTAL
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalPiutang)}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalPenerimaan)}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalSaldo)}
                    </td>

                    <td colSpan={4} className="border" />
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
