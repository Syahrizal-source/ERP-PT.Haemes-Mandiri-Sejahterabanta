"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Pph4ReportRow {
  id: number;
  npwp_pembeli: string | null;
  nama_pembeli: string | null;
  nomor_faktur_pajak: string | null;
  tanggal_faktur_pajak: string | null;
  nilai_transaksi: number;
  dpp_nilai_lain: number;
  ppn: number;
  tanggal_transaksi: string;
  tarif_pph4: number;
  potongan: number;
  pph4_terutang: number;
  jenis_objek: string;
  id_vendor: number;
  vendors: {
    id: number;
    kode_vendor: string | null;
    nama_vendor: string;
  } | null;
}

interface Pph4ReportResponse {
  data: Pph4ReportRow[];
  total: {
    nilai_transaksi: number;
    dpp_nilai_lain: number;
    ppn: number;
    potongan: number;
    pph4_terutang: number;
  };
  filter: {
    tahun: number | null;
    bulan: number | null;
  };
}

const bulanOptions: Array<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function formatNumber(value: number): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRate(value: number): string {
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export default function Pph4ReportPage() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [tahun, setTahun] = useState<string>(String(currentYear));

  const [bulan, setBulan] = useState<string>("");

  const [data, setData] = useState<Pph4ReportRow[]>([]);

  const [total, setTotal] = useState<Pph4ReportResponse["total"]>({
    nilai_transaksi: 0,
    dpp_nilai_lain: 0,
    ppn: 0,
    potongan: 0,
    pph4_terutang: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  async function fetchReport(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (tahun.trim() !== "") {
        params.set("tahun", tahun);
      }

      if (bulan !== "") {
        params.set("bulan", bulan);
      }

      const response = await fetch(
        `/api/report/pajak/pph4?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengambil laporan PPh4";

        throw new Error(message);
      }

      const report = result as Pph4ReportResponse;

      setData(Array.isArray(report.data) ? report.data : []);

      setTotal(
        report.total ?? {
          nilai_transaksi: 0,
          dpp_nilai_lain: 0,
          ppn: 0,
          potongan: 0,
          pph4_terutang: 0,
        },
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil laporan PPh4",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchReport();
  }, [tahun, bulan]);

  const judulPeriode = useMemo(() => {
    const selectedMonth = bulanOptions.find((item) => item.value === bulan);

    if (!selectedMonth || selectedMonth.value === "") {
      return `Tahun ${tahun}`;
    }

    return `${selectedMonth.label} ${tahun}`;
  }, [tahun, bulan]);

  function handlePrint(): void {
    window.print();
  }

  return (
    <>
      <div className="print:hidden">
        <Card title="Rekap Final PPh 4 ayat 2">
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label htmlFor="tahun" className="block text-sm font-medium mb-1">
                Tahun
              </label>

              <input
                id="tahun"
                type="number"
                min="2000"
                max="2100"
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="border rounded px-3 py-2 w-32"
              />
            </div>

            <div>
              <label htmlFor="bulan" className="block text-sm font-medium mb-1">
                Bulan
              </label>

              <select
                id="bulan"
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="border rounded px-3 py-2"
              >
                {bulanOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="secondary"
              onClick={() => void fetchReport()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>

            <Button variant="secondary" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            <Button
              variant="secondary"
              onClick={() => router.push("/pajak/pph4")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border p-2 text-center">
                    No
                  </th>

                  <th rowSpan={2} className="border p-2 min-w-[180px]">
                    NPWP Pembeli /
                    <br />
                    Identitas lainnya
                  </th>

                  <th rowSpan={2} className="border p-2 min-w-[220px]">
                    Nama Pembeli
                  </th>

                  <th rowSpan={2} className="border p-2 min-w-[170px]">
                    Nomor Faktur Pajak
                  </th>

                  <th rowSpan={2} className="border p-2 whitespace-nowrap">
                    Tanggal Faktur Pajak
                  </th>

                  <th
                    rowSpan={2}
                    className="border p-2 text-right min-w-[160px]"
                  >
                    Harga Jual/
                    <br />
                    Penggantian/DPP
                  </th>

                  <th
                    rowSpan={2}
                    className="border p-2 text-right min-w-[150px]"
                  >
                    DPP Nilai Lain/
                    <br />
                    DPP
                  </th>

                  <th
                    rowSpan={2}
                    className="border p-2 text-right min-w-[130px]"
                  >
                    PPN
                  </th>

                  <th rowSpan={2} className="border p-2 whitespace-nowrap">
                    Tanggal
                  </th>

                  <th rowSpan={2} className="border p-2 text-right">
                    Tarif
                  </th>

                  <th
                    rowSpan={2}
                    className="border p-2 text-right min-w-[140px]"
                  >
                    Potongan
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="border p-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                      Memuat laporan...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="border p-8 text-center text-gray-500"
                    >
                      Tidak ada data PPh4 untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border p-2 text-center">{index + 1}</td>

                      <td className="border p-2 whitespace-nowrap">
                        {item.npwp_pembeli ?? "-"}
                      </td>

                      <td className="border p-2">{item.nama_pembeli ?? "-"}</td>

                      <td className="border p-2 whitespace-nowrap">
                        {item.nomor_faktur_pajak ?? "-"}
                      </td>

                      <td className="border p-2 whitespace-nowrap">
                        {formatDate(item.tanggal_faktur_pajak)}
                      </td>

                      <td className="border p-2 text-right whitespace-nowrap">
                        {formatNumber(item.nilai_transaksi)}
                      </td>

                      <td className="border p-2 text-right whitespace-nowrap">
                        {formatNumber(item.dpp_nilai_lain)}
                      </td>

                      <td className="border p-2 text-right whitespace-nowrap">
                        {formatNumber(item.ppn)}
                      </td>

                      <td className="border p-2 whitespace-nowrap">
                        {formatDate(item.tanggal_transaksi)}
                      </td>

                      <td className="border p-2 text-right whitespace-nowrap">
                        {formatRate(item.tarif_pph4)}
                      </td>

                      <td className="border p-2 text-right whitespace-nowrap">
                        {formatNumber(item.potongan)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {!loading && data.length > 0 && (
                <tfoot>
                  <tr className="font-semibold bg-gray-100">
                    <td colSpan={5} className="border p-2 text-right">
                      TOTAL
                    </td>

                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatNumber(total.nilai_transaksi)}
                    </td>

                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatNumber(total.dpp_nilai_lain)}
                    </td>

                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatNumber(total.ppn)}
                    </td>

                    <td className="border p-2" />

                    <td className="border p-2" />

                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatNumber(total.potongan)}
                    </td>
                  </tr>

                  <tr className="font-semibold">
                    <td colSpan={10} className="border p-2 text-right">
                      PPh4 Terutang
                    </td>

                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatNumber(total.pph4_terutang)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>

      <div className="hidden print:block p-4">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">REKAP PPh4</h1>

          <p className="text-sm">{judulPeriode}</p>
        </div>

        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="border p-1">No</th>
              <th className="border p-1">
                NPWP Pembeli /
                <br />
                Identitas lainnya
              </th>
              <th className="border p-1">Nama Pembeli</th>
              <th className="border p-1">Nomor Faktur Pajak</th>
              <th className="border p-1">Tanggal Faktur Pajak</th>
              <th className="border p-1">
                Harga Jual/
                <br />
                Penggantian/DPP
              </th>
              <th className="border p-1">DPP Nilai Lain/DPP</th>
              <th className="border p-1">PPN</th>
              <th className="border p-1">Tanggal</th>
              <th className="border p-1">Tarif</th>
              <th className="border p-1">Potongan</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr key={item.id}>
                <td className="border p-1 text-center">{index + 1}</td>

                <td className="border p-1">{item.npwp_pembeli ?? "-"}</td>

                <td className="border p-1">{item.nama_pembeli ?? "-"}</td>

                <td className="border p-1">{item.nomor_faktur_pajak ?? "-"}</td>

                <td className="border p-1">
                  {formatDate(item.tanggal_faktur_pajak)}
                </td>

                <td className="border p-1 text-right">
                  {formatNumber(item.nilai_transaksi)}
                </td>

                <td className="border p-1 text-right">
                  {formatNumber(item.dpp_nilai_lain)}
                </td>

                <td className="border p-1 text-right">
                  {formatNumber(item.ppn)}
                </td>

                <td className="border p-1">
                  {formatDate(item.tanggal_transaksi)}
                </td>

                <td className="border p-1 text-right">
                  {formatRate(item.tarif_pph4)}
                </td>

                <td className="border p-1 text-right">
                  {formatNumber(item.potongan)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="font-bold">
              <td colSpan={5} className="border p-1 text-right">
                TOTAL
              </td>

              <td className="border p-1 text-right">
                {formatNumber(total.nilai_transaksi)}
              </td>

              <td className="border p-1 text-right">
                {formatNumber(total.dpp_nilai_lain)}
              </td>

              <td className="border p-1 text-right">
                {formatNumber(total.ppn)}
              </td>

              <td className="border p-1" />
              <td className="border p-1" />

              <td className="border p-1 text-right">
                {formatNumber(total.potongan)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-3 text-right text-sm font-bold">
          PPh4 Terutang: {formatNumber(total.pph4_terutang)}
        </div>
      </div>
    </>
  );
}
