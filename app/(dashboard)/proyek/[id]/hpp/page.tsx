"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FileBarChart2,
  Filter,
  Loader2,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Project = {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
};

type HppSummary = {
  kategori_hpp: string;
  jumlah_transaksi: number;
  total_hpp: number;
};

type HppDetail = {
  id_proyek: string;
  kode_proyek: string;
  nama_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan_jurnal: string;
  kode_coa: string;
  nama_coa: string;
  kategori_hpp: string;
  nilai_hpp: number;
};

type HppResponse = {
  proyek: Project;
  filters: {
    dari: string | null;
    sampai: string | null;
  };
  total_transaksi: number;
  total_hpp: number;
  summary: HppSummary[];
  details: HppDetail[];
};

type ProjectApiRow = {
  id?: string;
  id_proyek?: string;
  kode_proyek?: string;
  nama_proyek?: string;
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string): string {
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

function categoryClass(category: string): string {
  switch (category) {
    case "NGEPOK":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "TANAH":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "BONCOS":
      return "border-red-200 bg-red-50 text-red-700";

    case "BBM":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "OLI":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "SEWA ALAT":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "SUBKONTRAKTOR":
      return "border-green-200 bg-green-50 text-green-700";

    case "SPAREPART":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "ARMADA":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default function HppProyekPage(): React.JSX.Element {
  const searchParams = useSearchParams();

  /*
   * =====================================================
   * ID PROYEK DARI URL
   * =====================================================
   *
   * Contoh:
   *
   * /proyek/hpp?id_proyek=UUID
   *
   * HPP SELALU DIISOLASI BERDASARKAN ID INI.
   */

  const idProyekFromUrl = searchParams.get("id_proyek") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedProject, setSelectedProject] =
    useState<string>(idProyekFromUrl);

  const [dariTanggal, setDariTanggal] = useState<string>("");

  const [sampaiTanggal, setSampaiTanggal] = useState<string>("");

  const [report, setReport] = useState<HppResponse | null>(null);

  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);

  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  const [error, setError] = useState<string>("");

  const [showDetail, setShowDetail] = useState<boolean>(true);

  /*
   * =====================================================
   * SINKRONKAN ID PROYEK DARI URL
   * =====================================================
   */

  useEffect(() => {
    if (idProyekFromUrl) {
      setSelectedProject(idProyekFromUrl);
    }
  }, [idProyekFromUrl]);

  /*
   * =====================================================
   * LOAD MASTER PROYEK
   * =====================================================
   */

  const loadProjects = useCallback(async (): Promise<void> => {
    setLoadingProjects(true);
    setError("");

    try {
      /*
       * PENTING:
       * endpoint yang benar adalah /api/proyek/master
       */
      const response = await fetch("/api/proyek/master", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil daftar proyek");
      }

      const result: unknown = await response.json();

      if (!Array.isArray(result)) {
        throw new Error("Format data proyek tidak valid");
      }

      const mapped: Project[] = result
        .filter(
          (item): item is ProjectApiRow =>
            typeof item === "object" && item !== null,
        )
        .map(
          (item): Project => ({
            id:
              typeof item.id === "string"
                ? item.id
                : typeof item.id_proyek === "string"
                  ? item.id_proyek
                  : "",

            kode_proyek:
              typeof item.kode_proyek === "string" ? item.kode_proyek : "",

            nama_proyek:
              typeof item.nama_proyek === "string" ? item.nama_proyek : "",
          }),
        )
        .filter((item) => item.id !== "");

      setProjects(mapped);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil daftar proyek",
      );
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  /*
   * =====================================================
   * LOAD LAPORAN HPP
   * =====================================================
   *
   * HANYA berdasarkan selectedProject.
   */

  const loadReport = useCallback(async (): Promise<void> => {
    if (!selectedProject) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");

    try {
      const params = new URLSearchParams();

      /*
       * INI YANG MENJAGA HPP TIDAK TERGABUNG
       */
      params.set("id_proyek", selectedProject);

      if (dariTanggal) {
        params.set("dari", dariTanggal);
      }

      if (sampaiTanggal) {
        params.set("sampai", sampaiTanggal);
      }

      const response = await fetch(`/api/proyek/hpp?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        if (
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
        ) {
          throw new Error(result.error);
        }

        throw new Error("Gagal mengambil laporan HPP");
      }

      setReport(result as HppResponse);
    } catch (err: unknown) {
      setReport(null);

      setError(
        err instanceof Error ? err.message : "Gagal mengambil laporan HPP",
      );
    } finally {
      setLoadingReport(false);
    }
  }, [dariTanggal, sampaiTanggal, selectedProject]);

  /*
   * =====================================================
   * OTOMATIS LOAD HPP DARI URL
   * =====================================================
   *
   * Jadi ketika membuka:
   *
   * /proyek/hpp?id_proyek=UUID
   *
   * laporan langsung muncul.
   */

  useEffect(() => {
    if (idProyekFromUrl && !loadingProjects) {
      void loadReport();
    }
  }, [idProyekFromUrl, loadingProjects, loadReport]);

  /*
   * =====================================================
   * PILIH PROYEK
   * =====================================================
   */

  function handleProjectChange(value: string): void {
    setSelectedProject(value);
    setReport(null);
    setError("");

    if (!value) {
      return;
    }

    /*
     * Setelah pilih proyek,
     * langsung ambil HPP proyek tersebut.
     */
    window.setTimeout(() => {
      void loadReport();
    }, 0);
  }

  /*
   * =====================================================
   * FILTER
   * =====================================================
   */

  function handleFilter(): void {
    if (!selectedProject) {
      setError("Silakan pilih proyek terlebih dahulu");
      return;
    }

    void loadReport();
  }

  /*
   * =====================================================
   * RESET TANGGAL
   * =====================================================
   */

  function handleReset(): void {
    setDariTanggal("");
    setSampaiTanggal("");

    if (selectedProject) {
      window.setTimeout(() => {
        void loadReport();
      }, 0);
    }
  }

  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const summary = useMemo(() => {
    if (!report) {
      return [];
    }

    return [...report.summary].sort((a, b) => b.total_hpp - a.total_hpp);
  }, [report]);

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileBarChart2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Laporan HPP Proyek
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              HPP dihitung khusus berdasarkan proyek yang dipilih.
            </p>
          </div>
        </div>

        {selectedProject && (
          <Button
            variant="secondary"
            onClick={() => void loadReport()}
            disabled={loadingReport}
          >
            {loadingReport ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        )}
      </div>

      {/* FILTER */}

      <Card title="Filter Laporan HPP">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* PROYEK */}

          <div className="lg:col-span-1">
            <label
              htmlFor="proyek"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Proyek
            </label>

            <select
              id="proyek"
              value={selectedProject}
              disabled={loadingProjects}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                {loadingProjects ? "Memuat proyek..." : "-- Pilih Proyek --"}
              </option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.kode_proyek} - {project.nama_proyek}
                </option>
              ))}
            </select>
          </div>

          {/* DARI */}

          <div>
            <label
              htmlFor="dari"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Dari Tanggal
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                id="dari"
                type="date"
                value={dariTanggal}
                onChange={(event) => setDariTanggal(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* SAMPAI */}

          <div>
            <label
              htmlFor="sampai"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Sampai Tanggal
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                id="sampai"
                type="date"
                value={sampaiTanggal}
                onChange={(event) => setSampaiTanggal(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* BUTTON */}

          <div className="flex items-end gap-2">
            <Button
              onClick={handleFilter}
              disabled={!selectedProject || loadingReport}
              className="flex-1"
            >
              {loadingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Tampilkan HPP
            </Button>

            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={!selectedProject || loadingReport}
            >
              Reset
            </Button>
          </div>
        </div>

        {!selectedProject && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Pilih satu proyek terlebih dahulu. Laporan HPP tidak digabung antar
            proyek.
          </div>
        )}
      </Card>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* BELUM PILIH */}

      {!selectedProject && !loadingReport && (
        <Card title="Laporan HPP">
          <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center">
            <WalletCards className="h-10 w-10 text-gray-300" />

            <p className="mt-3 font-medium text-gray-700">
              Belum ada proyek yang dipilih
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Silakan pilih proyek untuk melihat HPP.
            </p>
          </div>
        </Card>
      )}

      {/* LOADING */}

      {loadingReport && (
        <Card title="Laporan HPP">
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
          </div>
        </Card>
      )}

      {/* REPORT */}

      {report && !loadingReport && (
        <>
          {/* IDENTITAS PROYEK */}

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
              Proyek yang sedang dilaporkan
            </p>

            <div className="mt-1 text-xl font-bold text-gray-900">
              {report.proyek.kode_proyek}
            </div>

            <div className="mt-1 text-sm text-gray-700">
              {report.proyek.nama_proyek}
            </div>

            {(report.filters.dari || report.filters.sampai) && (
              <div className="mt-3 text-xs text-gray-500">
                Periode:{" "}
                {report.filters.dari
                  ? formatTanggal(report.filters.dari)
                  : "Awal"}
                {" s.d. "}
                {report.filters.sampai
                  ? formatTanggal(report.filters.sampai)
                  : "Sekarang"}
              </div>
            )}
          </div>

          {/* CARDS */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total HPP Proyek</p>

                  <p className="mt-2 break-words text-xl font-bold text-gray-900 sm:text-2xl">
                    {formatRupiah(report.total_hpp)}
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Jumlah Transaksi HPP</p>

              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {report.total_transaksi.toLocaleString("id-ID")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Khusus proyek {report.proyek.kode_proyek}
              </p>
            </div>
          </div>

          {/* REKAP KATEGORI */}

          <Card title="Rekap HPP Berdasarkan Kategori">
            {summary.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Belum ada transaksi HPP untuk proyek ini.
              </div>
            ) : (
              <>
                {/* MOBILE */}

                <div className="space-y-3 md:hidden">
                  {summary.map((item) => (
                    <div
                      key={item.kategori_hpp}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryClass(
                            item.kategori_hpp,
                          )}`}
                        >
                          {item.kategori_hpp}
                        </span>

                        <span className="text-sm font-bold text-gray-900">
                          {formatRupiah(item.total_hpp)}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-gray-500">
                        {item.jumlah_transaksi.toLocaleString("id-ID")}{" "}
                        transaksi
                      </p>
                    </div>
                  ))}
                </div>

                {/* DESKTOP */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          No
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          Kategori HPP
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                          Transaksi
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                          Total HPP
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {summary.map((item, index) => (
                        <tr
                          key={item.kategori_hpp}
                          className="border-b border-gray-100"
                        >
                          <td className="px-4 py-3 text-gray-500">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryClass(
                                item.kategori_hpp,
                              )}`}
                            >
                              {item.kategori_hpp}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            {item.jumlah_transaksi.toLocaleString("id-ID")}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold">
                            {formatRupiah(item.total_hpp)}
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="px-4 py-4 text-right">
                          TOTAL HPP
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatRupiah(report.total_hpp)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* DETAIL */}

          <Card title="Detail Transaksi HPP">
            <button
              type="button"
              onClick={() => setShowDetail((previous) => !previous)}
              className="mb-4 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700"
            >
              <span>
                {showDetail ? "Sembunyikan detail" : "Tampilkan detail"}
              </span>

              {showDetail ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showDetail && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        No
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Tanggal
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        No. Bukti
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Kategori
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        COA
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Keterangan
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        Nilai HPP
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.details.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          Tidak ada transaksi HPP.
                        </td>
                      </tr>
                    ) : (
                      report.details.map((detail, index) => (
                        <tr
                          key={`${detail.no_bukti}-${detail.tanggal}-${index}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-500">
                            {index + 1}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {formatTanggal(detail.tanggal)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {detail.no_bukti}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryClass(
                                detail.kategori_hpp,
                              )}`}
                            >
                              {detail.kategori_hpp}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium">{detail.kode_coa}</div>

                            <div className="max-w-48 truncate text-xs text-gray-500">
                              {detail.nama_coa}
                            </div>
                          </td>

                          <td className="max-w-80 px-4 py-3">
                            <div className="truncate">
                              {detail.keterangan_jurnal}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                            {formatRupiah(detail.nilai_hpp)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={6} className="px-4 py-4 text-right">
                        TOTAL HPP PROYEK
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        {formatRupiah(report.total_hpp)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
