"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Printer, RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type LaporanAset = {
  kelompok_aset: string;
  jumlah_aset: number;
  total_perolehan: number | string;
  total_akumulasi_penyusutan: number | string;
  total_penyusutan_bulanan: number | string;
  total_nilai_buku: number | string;
};

type TotalAset = {
  jumlah_aset: number;
  total_perolehan: number | string;
  total_akumulasi_penyusutan: number | string;
  total_penyusutan_bulanan: number | string;
  total_nilai_buku: number | string;
};

type LaporanResponse = {
  rekap: LaporanAset[];
  total: TotalAset | null;
};

function toNumber(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatTanggalIndonesia(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function LaporanAsetPage(): React.JSX.Element {
  const router = useRouter();

  const [data, setData] = useState<LaporanResponse>({
    rekap: [],
    total: null,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLaporan(showRefreshLoading: boolean): Promise<void> {
    try {
      if (showRefreshLoading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/aset/laporan", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil laporan aset");
      }

      const result: LaporanResponse = await response.json();

      setData({
        rekap: Array.isArray(result.rekap) ? result.rekap : [],
        total: result.total ?? null,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil laporan aset",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadLaporan(false);
  }, []);

  function handleRefresh(): void {
    void loadLaporan(true);
  }

  function handlePrint(): void {
    window.print();
  }

  const tanggalLaporan: string = formatTanggalIndonesia(new Date());

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6 print:max-w-none print:px-0 print:py-0">
        <Card title="Laporan Aset Tetap">
          {/* =========================
              HEADER ACTION
          ========================= */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/accounting/aset")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}

                {refreshing ? "Memuat..." : "Refresh"}
              </Button>

              <Button type="button" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak Laporan
              </Button>
            </div>
          </div>

          {/* =========================
              HEADER LAPORAN
          ========================= */}
          <div className="mb-8 text-center">
            <h1 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">
              PT. HAEMES MANDIRI SEJAHTERABANTA
            </h1>

            <h2 className="mt-2 text-lg font-bold uppercase sm:text-xl">
              LAPORAN ASET TETAP
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Periode: {tanggalLaporan}
            </p>
          </div>

          {/* =========================
              LOADING
          ========================= */}
          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat laporan aset...
              </div>
            </div>
          ) : error !== null ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* =========================
                  REKAPITULASI
              ========================= */}
              <div className="mb-8">
                <h3 className="mb-3 text-base font-bold uppercase">
                  Rekapitulasi Aset Tetap
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-[1050px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-3 text-center">
                          No
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-left">
                          Kelompok Aset
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-right">
                          Jumlah Aset
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-right">
                          Total Perolehan
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-right">
                          Akumulasi Penyusutan
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-right">
                          Penyusutan Bulanan
                        </th>

                        <th className="border border-gray-300 px-3 py-3 text-right">
                          Nilai Buku
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.rekap.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="border border-gray-300 px-3 py-8 text-center text-gray-500"
                          >
                            Tidak ada data aset.
                          </td>
                        </tr>
                      ) : (
                        data.rekap.map((item, index) => (
                          <tr
                            key={item.kelompok_aset}
                            className="hover:bg-gray-50"
                          >
                            <td className="border border-gray-300 px-3 py-3 text-center">
                              {index + 1}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 font-semibold">
                              {item.kelompok_aset}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 text-right">
                              {item.jumlah_aset}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 text-right">
                              {formatRupiah(item.total_perolehan)}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 text-right">
                              {formatRupiah(item.total_akumulasi_penyusutan)}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 text-right">
                              {formatRupiah(item.total_penyusutan_bulanan)}
                            </td>

                            <td className="border border-gray-300 px-3 py-3 text-right font-bold">
                              {formatRupiah(item.total_nilai_buku)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {data.total !== null && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td
                            colSpan={2}
                            className="border border-gray-300 px-3 py-3"
                          >
                            TOTAL AKTIVA TETAP
                          </td>

                          <td className="border border-gray-300 px-3 py-3 text-right">
                            {data.total.jumlah_aset}
                          </td>

                          <td className="border border-gray-300 px-3 py-3 text-right">
                            {formatRupiah(data.total.total_perolehan)}
                          </td>

                          <td className="border border-gray-300 px-3 py-3 text-right">
                            {formatRupiah(
                              data.total.total_akumulasi_penyusutan,
                            )}
                          </td>

                          <td className="border border-gray-300 px-3 py-3 text-right">
                            {formatRupiah(data.total.total_penyusutan_bulanan)}
                          </td>

                          <td className="border border-gray-300 px-3 py-3 text-right font-bold">
                            {formatRupiah(data.total.total_nilai_buku)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* =========================
                  RINGKASAN NILAI
              ========================= */}
              {data.total !== null && (
                <div className="border-t border-gray-300 pt-6">
                  <h3 className="mb-4 text-base font-bold uppercase">
                    Ringkasan Aktiva Tetap
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Jumlah Aset
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {data.total.jumlah_aset}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Total Perolehan
                      </p>

                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {formatRupiah(data.total.total_perolehan)}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Akumulasi Penyusutan
                      </p>

                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {formatRupiah(data.total.total_akumulasi_penyusutan)}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Nilai Buku
                      </p>

                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {formatRupiah(data.total.total_nilai_buku)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================
                  FOOTER
              ========================= */}
              <div className="mt-10 hidden border-t pt-4 text-xs text-gray-500 print:block">
                <p>
                  Laporan ini dihasilkan berdasarkan data aset yang tersimpan
                  pada sistem.
                </p>

                <p className="mt-1">
                  Dicetak pada {formatTanggalIndonesia(new Date())}.
                </p>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* =========================
          PRINT STYLE
      ========================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          header,
          nav,
          aside {
            display: none !important;
          }

          button {
            display: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </>
  );
}
