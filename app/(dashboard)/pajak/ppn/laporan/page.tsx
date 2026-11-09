"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Printer, RefreshCw, ArrowLeft } from "lucide-react";

import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* =========================================================
   TYPE
========================================================= */

interface PpnReportRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  keterangan: string;
  kode_vendor: string;
  nama_vendor: string;
  npwp: string;
  nomor_seri: string;
  tanggal: string;
  nilai_transaksi: number;
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
}

interface PpnTotal {
  nilai_transaksi: number;
  nilai_dasar: number;
  nilai_ppn: number;
}

interface PpnReportResponse {
  periode: {
    bulan: number;
    tahun: number;
    label: string;
  };

  keluaran: PpnReportRow[];

  masukan: PpnReportRow[];

  total: {
    keluaran: PpnTotal;
    masukan: PpnTotal;
  };
}

type JenisFilter = "semua" | "keluaran" | "masukan";

/* =========================================================
   MONTH
========================================================= */

const MONTHS: Array<{
  value: number;
  label: string;
}> = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

/* =========================================================
   HELPER
========================================================= */

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function formatRupiah(value: number): string {
  return Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  const datePart: string = value.substring(0, 10);
  const parts: string[] = datePart.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const year: string = parts[0] ?? "";
  const month: string = parts[1] ?? "";
  const day: string = parts[2] ?? "";

  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function LaporanPpnPage(): React.JSX.Element {
  const router = useRouter();

  const [bulan, setBulan] = useState<number>(getCurrentMonth());

  const [tahun, setTahun] = useState<number>(getCurrentYear());

  const [jenisFilter, setJenisFilter] = useState<JenisFilter>("semua");

  const [data, setData] = useState<PpnReportResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string>("");

  const monthOptions = useMemo(() => MONTHS, []);

  /* =======================================================
     FETCH REPORT
  ======================================================= */

  const fetchReport = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const searchParams = new URLSearchParams();

      searchParams.set("bulan", String(bulan));
      searchParams.set("tahun", String(tahun));

      const response = await fetch(
        `/api/report/pajak/ppn?${searchParams.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        let message = "Gagal mengambil laporan PPN";

        if (
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
        ) {
          message = result.error;
        }

        throw new Error(message);
      }

      setData(result as PpnReportResponse);
    } catch (err: unknown) {
      console.error("LAPORAN PPN ERROR:", err);

      setData(null);

      setError(
        err instanceof Error ? err.message : "Gagal mengambil laporan PPN",
      );
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  /* =======================================================
     PRINT
  ======================================================= */

  function handlePrint(): void {
    if (loading || data === null) {
      return;
    }

    window.print();
  }

  /* =======================================================
     DATA
  ======================================================= */

  const keluaran: PpnReportRow[] = data?.keluaran ?? [];

  const masukan: PpnReportRow[] = data?.masukan ?? [];

  const totalKeluaran: PpnTotal = data?.total.keluaran ?? {
    nilai_transaksi: 0,
    nilai_dasar: 0,
    nilai_ppn: 0,
  };

  const totalMasukan: PpnTotal = data?.total.masukan ?? {
    nilai_transaksi: 0,
    nilai_dasar: 0,
    nilai_ppn: 0,
  };

  const periodeLabel: string =
    data?.periode.label ??
    `${
      monthOptions.find((item) => item.value === bulan)?.label ?? ""
    } ${tahun}`;

  const tampilKeluaran: boolean =
    jenisFilter === "semua" || jenisFilter === "keluaran";

  const tampilMasukan: boolean =
    jenisFilter === "semua" || jenisFilter === "masukan";

  /* =======================================================
     RENDER TABLE KELUARAN
  ======================================================= */

  function renderTabelKeluaran(): React.JSX.Element {
    return (
      <section className="ppn-report-section">
        <h2 className="mb-4 text-center text-sm font-bold uppercase">
          REKAPITULASI PAJAK KELUARAN
        </h2>

        <div className="w-full overflow-x-auto">
          <table className="ppn-table w-full border-collapse text-sm">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
            </colgroup>

            <thead>
              <tr>
                <th>No</th>
                <th>Keterangan</th>
                <th>NPWP</th>
                <th>Tanggal</th>
                <th>Nomor Seri</th>
                <th>Nilai Transaksi</th>
                <th>Dasar Pengenaan</th>
                <th>PPN</th>
                <th>Keterangan</th>
              </tr>
            </thead>

            <tbody>
              {keluaran.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    Tidak ada data PPN keluaran
                  </td>
                </tr>
              ) : (
                keluaran.map((item: PpnReportRow, index: number) => (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>

                    <td>{item.nama_vendor || "-"}</td>

                    <td className="nowrap">{item.npwp || "-"}</td>

                    <td className="text-center nowrap">
                      {formatDate(item.tanggal)}
                    </td>

                    <td className="nowrap">{item.nomor_seri || "-"}</td>

                    <td className="text-right nowrap">
                      {formatRupiah(item.nilai_transaksi)}
                    </td>

                    <td className="text-right nowrap">
                      {formatRupiah(item.nilai_dasar)}
                    </td>

                    <td className="text-right nowrap font-semibold">
                      {formatRupiah(item.nilai_ppn)}
                    </td>

                    <td>{item.keterangan || "-"}</td>
                  </tr>
                ))
              )}

              <tr className="total-row">
                <td colSpan={5} className="text-right">
                  TOTAL
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalKeluaran.nilai_transaksi)}
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalKeluaran.nilai_dasar)}
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalKeluaran.nilai_ppn)}
                </td>

                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  /* =======================================================
     RENDER TABLE MASUKAN
  ======================================================= */

  function renderTabelMasukan(): React.JSX.Element {
    return (
      <section className="ppn-report-section">
        <h2 className="mb-4 text-center text-sm font-bold uppercase">
          REKAPITULASI PAJAK MASUKAN
        </h2>

        <div className="w-full overflow-x-auto">
          <table className="ppn-table w-full border-collapse text-sm">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
            </colgroup>

            <thead>
              <tr>
                <th>No</th>
                <th>Keterangan</th>
                <th>NPWP</th>
                <th>Nomor Seri</th>
                <th>Tanggal</th>
                <th>Nilai Transaksi</th>
                <th>Dasar Pengenaan</th>
                <th>PPN</th>
                <th>Keterangan</th>
              </tr>
            </thead>

            <tbody>
              {masukan.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    Tidak ada data PPN masukan
                  </td>
                </tr>
              ) : (
                masukan.map((item: PpnReportRow, index: number) => (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>

                    <td>{item.nama_vendor || "-"}</td>

                    <td className="nowrap">{item.npwp || "-"}</td>

                    <td className="nowrap">{item.nomor_seri || "-"}</td>

                    <td className="text-center nowrap">
                      {formatDate(item.tanggal)}
                    </td>

                    <td className="text-right nowrap">
                      {formatRupiah(item.nilai_transaksi)}
                    </td>

                    <td className="text-right nowrap">
                      {formatRupiah(item.nilai_dasar)}
                    </td>

                    <td className="text-right nowrap font-semibold">
                      {formatRupiah(item.nilai_ppn)}
                    </td>

                    <td>{item.keterangan || "-"}</td>
                  </tr>
                ))
              )}

              <tr className="total-row">
                <td colSpan={5} className="text-right">
                  TOTAL
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalMasukan.nilai_transaksi)}
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalMasukan.nilai_dasar)}
                </td>

                <td className="text-right nowrap">
                  {formatRupiah(totalMasukan.nilai_ppn)}
                </td>

                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* =====================================================
          CONTROL PANEL
          TIDAK IKUT PRINT
      ===================================================== */}

      <div className="print:hidden">
        <Card title="Laporan Rekapitulasi PPN">
          <div className="flex flex-wrap items-end gap-3">
            {/* BULAN */}

            <div>
              <label htmlFor="bulan" className="mb-1 block text-sm font-medium">
                Bulan
              </label>

              <select
                id="bulan"
                value={bulan}
                onChange={(event) => setBulan(Number(event.target.value))}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* TAHUN */}

            <div>
              <label htmlFor="tahun" className="mb-1 block text-sm font-medium">
                Tahun
              </label>

              <select
                id="tahun"
                value={tahun}
                onChange={(event) => setTahun(Number(event.target.value))}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {Array.from(
                  { length: 11 },
                  (_, index) => getCurrentYear() - 5 + index,
                ).map((year: number) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* FILTER JENIS PPN */}

            <div>
              <label
                htmlFor="jenis-ppn"
                className="mb-1 block text-sm font-medium"
              >
                Jenis PPN
              </label>

              <select
                id="jenis-ppn"
                value={jenisFilter}
                onChange={(event) =>
                  setJenisFilter(event.target.value as JenisFilter)
                }
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="semua">Semua</option>

                <option value="keluaran">PPN Keluaran</option>

                <option value="masukan">PPN Masukan</option>
              </select>
            </div>

            {/* REFRESH */}

            <Button
              variant="secondary"
              onClick={() => void fetchReport()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>

            {/* BACK */}

            <Button
              variant="secondary"
              onClick={() => router.push("/pajak/ppn")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            {/* PRINT */}

            <Button onClick={handlePrint} disabled={loading || data === null}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>

          {/* FILTER INFO */}

          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            Laporan:
            <strong className="ml-1">
              {jenisFilter === "semua"
                ? "Semua PPN"
                : jenisFilter === "keluaran"
                  ? "PPN Keluaran"
                  : "PPN Masukan"}
            </strong>
          </div>

          {/* ERROR */}

          {error ? (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              <strong>Gagal memuat laporan:</strong> {error}
            </div>
          ) : null}
        </Card>
      </div>

      {/* =====================================================
          REPORT
      ===================================================== */}

      <div className="ppn-print-container mt-6">
        <div className="ppn-report">
          {/* HEADER */}

          <div className="report-header">
            <h1>REKAPITULASI PAJAK PPN</h1>

            <p>
              Periode : <strong>{periodeLabel}</strong>
            </p>

            <p className="report-filter">
              Jenis PPN :{" "}
              <strong>
                {jenisFilter === "semua"
                  ? "Semua"
                  : jenisFilter === "keluaran"
                    ? "PPN Keluaran"
                    : "PPN Masukan"}
              </strong>
            </p>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center print:hidden">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat laporan PPN...
              </div>
            </div>
          ) : (
            <>
              {/* =================================================
                  KELUARAN
              ================================================= */}

              {tampilKeluaran ? renderTabelKeluaran() : null}

              {/* =================================================
                  PEMISAH
              ================================================= */}

              {jenisFilter === "semua" ? (
                <div className="ppn-section-space" />
              ) : null}

              {/* =================================================
                  MASUKAN
              ================================================= */}

              {tampilMasukan ? renderTabelMasukan() : null}

              {/* FOOTER */}

              <div className="report-footer">
                Laporan berdasarkan transaksi PPN pada periode{" "}
                <strong>{periodeLabel}</strong>.
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          PRINT CSS
      ===================================================== */}

      <style jsx global>{`
        .ppn-print-container {
          width: 100%;
        }

        .ppn-report {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          background: white;
        }

        .report-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .report-header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .report-header p {
          margin-top: 8px;
          font-size: 14px;
        }

        .report-filter {
          color: #555;
          font-size: 12px !important;
        }

        .ppn-report-section {
          width: 100%;
          margin-bottom: 28px;
        }

        .ppn-section-space {
          height: 20px;
        }

        .ppn-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .ppn-table th,
        .ppn-table td {
          border: 1px solid #000;
          padding: 8px 9px;
          vertical-align: middle;
          line-height: 1.4;
          word-break: normal;
          overflow-wrap: break-word;
        }

        .ppn-table th {
          background: #f3f4f6;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
        }

        .ppn-table td {
          font-size: 10px;
        }

        .ppn-table .nowrap {
          white-space: nowrap;
          overflow-wrap: normal;
          word-break: normal;
        }

        .ppn-table .text-right {
          text-align: right;
        }

        .ppn-table .text-center {
          text-align: center;
        }

        .ppn-table .total-row td {
          font-weight: 700;
          background: #f8f8f8;
        }

        .ppn-table .empty-row {
          padding: 14px;
          text-align: center;
          font-style: italic;
          color: #555;
        }

        .report-footer {
          margin-top: 20px;
          font-size: 11px;
          color: #333;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          html,
          body {
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .ppn-print-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ppn-report {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-header {
            margin-bottom: 12mm !important;
          }

          .report-header h1 {
            font-size: 16px !important;
          }

          .report-header p {
            margin-top: 4px !important;
            font-size: 10px !important;
          }

          .report-filter {
            font-size: 9px !important;
          }

          /*
             PENTING:
             Semua section selalu vertikal.
             Tidak ada grid/flex dua kolom.
          */

          .ppn-report-section {
            display: block !important;
            width: 100% !important;
            margin-bottom: 12mm !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .ppn-section-space {
            display: block !important;
            height: 8mm !important;
          }

          .ppn-report-section h2 {
            margin-bottom: 5mm !important;
            font-size: 11px !important;
            text-align: center !important;
          }

          .ppn-table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          .ppn-table th,
          .ppn-table td {
            border: 1px solid #000 !important;
            padding: 5px 6px !important;
            font-size: 8.5px !important;
            line-height: 1.35 !important;
            vertical-align: middle !important;
          }

          .ppn-table th {
            font-size: 8.5px !important;
            white-space: normal !important;
          }

          .ppn-table td {
            white-space: normal !important;
          }

          .ppn-table td.nowrap {
            white-space: nowrap !important;
          }

          .ppn-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .ppn-table thead {
            display: table-header-group !important;
          }

          .ppn-table tbody {
            display: table-row-group !important;
          }

          .ppn-table .total-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .report-footer {
            margin-top: 6mm !important;
            font-size: 8.5px !important;
          }

          .ppn-report-section + .ppn-report-section {
            margin-top: 10mm !important;
          }
        }
      `}</style>
    </>
  );
}
