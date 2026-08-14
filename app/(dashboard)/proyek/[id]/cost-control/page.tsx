"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type CostControlItem = {
  id_rab: string;
  id_proyek: string;
  kode_proyek: string;
  nama_proyek: string;
  id_kategori: number;
  kode_kategori: string;
  kategori: string;
  uraian: string;
  qty_rab: number;
  qty_rap: number;
  qty_realisasi: number;
  satuan: string;
  harga_satuan: number;
  nilai_rab: number;
  nilai_rap: number;
  nilai_realisasi: number;
  sisa_qty_rab: number;
  sisa_qty_rap: number;
  sisa_rab: number;
  sisa_rap: number;
  progress_rap: number;
  progress_realisasi: number;
  progress_rab_realisasi: number;
  status: CostControlStatus;
  variance: number;
  created_at: string;
  updated_at: string;
};

type CostControlStatus =
  | "BELUM RAP"
  | "BELUM REALISASI"
  | "ON PROGRESS"
  | "SELESAI"
  | "OVER RAP"
  | "OVER RAB";

type ApiResponse = {
  success: boolean;
  data: CostControlItem[];
};

export default function CostControlPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CostControlItem[]>([]);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const res = await fetch(`/api/proyek/cost-control?id_proyek=${proyekId}`);

      if (!res.ok) {
        throw new Error("Gagal mengambil Cost Control.");
      }

      const result: ApiResponse = await res.json();

      setData(result.data);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Terjadi kesalahan.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.rab += item.nilai_rab;
        acc.rap += item.nilai_rap;
        acc.realisasi += item.nilai_realisasi;
        acc.sisaRab += item.sisa_rab;
        acc.sisaRap += item.sisa_rap;

        return acc;
      },
      {
        rab: 0,
        rap: 0,
        realisasi: 0,
        sisaRab: 0,
        sisaRap: 0,
        progressRap: 0,
        progressRealisasi: 0,
        progressRab: 0,
        variance: 0,
      },
    );
  }, [data]);

  const proyek = useMemo(() => data.at(0) ?? null, [data]);

  function rupiah(value: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  const badgeClass: Record<CostControlStatus, string> = {
    "BELUM RAP": "bg-gray-100 text-gray-700",

    "BELUM REALISASI": "bg-yellow-100 text-yellow-700",

    "ON PROGRESS": "bg-blue-100 text-blue-700",

    SELESAI: "bg-green-100 text-green-700",

    "OVER RAP": "bg-orange-100 text-orange-700",

    "OVER RAB": "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Cost Control Proyek">
        <div className="mb-5 flex justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button disabled>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {proyek && (
          <div className="mb-6 rounded-lg border bg-slate-50 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Kode Proyek</p>
                <p className="font-semibold">{proyek.kode_proyek}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Nama Proyek</p>
                <p className="font-semibold">{proyek.nama_proyek}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Jumlah Item RAB</p>
                <p className="font-semibold">{data.length}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Status Cost Control</p>
                <p className="font-semibold">
                  {data.some((x) => x.status === "OVER RAB")
                    ? "OVER RAB"
                    : data.some((x) => x.status === "OVER RAP")
                      ? "OVER RAP"
                      : data.some((x) => x.status === "ON PROGRESS")
                        ? "ON PROGRESS"
                        : "NORMAL"}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat Cost Control...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th>No</th>
                    <th>Kategori</th>
                    <th>Uraian</th>
                    <th>Qty RAB</th>
                    <th>Qty RAP</th>
                    <th>Qty Realisasi</th>
                    <th>Sat</th>
                    <th>Nilai RAB</th>
                    <th>Nilai RAP</th>
                    <th>Nilai Realisasi</th>
                    <th>Sisa RAB</th>
                    <th>Sisa RAP</th>
                    <th>% RAP</th>
                    <th>% Realisasi</th>
                    <th>% RAB</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={16}
                        className="py-8 text-center text-gray-500"
                      >
                        Belum ada data Cost Control.
                      </td>
                    </tr>
                  ) : (
                    data.map((item, index) => (
                      <tr key={item.id_rab} className="hover:bg-gray-50">
                        <td className="border px-3 py-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border px-3 py-2">{item.kategori}</td>

                        <td className="border px-3 py-2">{item.uraian}</td>

                        <td className="border px-3 py-2 text-right">
                          {item.qty_rab.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.qty_rap.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.qty_realisasi.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">{item.satuan}</td>

                        <td className="border px-3 py-2 text-right">
                          {rupiah(item.nilai_rab)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {rupiah(item.nilai_rap)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {rupiah(item.nilai_realisasi)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {rupiah(item.sisa_rab)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {rupiah(item.sisa_rap)}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {item.progress_rap}%
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {item.progress_realisasi}%
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {item.progress_rab_realisasi}%
                        </td>

                        <td className="border px-3 py-2 text-center">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              badgeClass[item.status]
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="min-w-[340px] rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex justify-between py-1">
                  <span>Total RAB</span>
                  <strong>{rupiah(summary.rab)}</strong>
                </div>

                <div className="flex justify-between py-1">
                  <span>Total RAP</span>
                  <strong>{rupiah(summary.rap)}</strong>
                </div>

                <div className="flex justify-between py-1">
                  <span>Total Realisasi</span>
                  <strong>{rupiah(summary.realisasi)}</strong>
                </div>

                <hr className="my-2" />

                <div className="flex justify-between py-1 text-blue-700">
                  <span>Sisa RAB</span>
                  <strong>{rupiah(summary.sisaRab)}</strong>
                </div>

                <div className="flex justify-between py-1 text-green-700">
                  <span>Sisa RAP</span>
                  <strong>{rupiah(summary.sisaRap)}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
