"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";

type ProfitRow = {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  nilai_kontrak: number;
  margin_target: number | null;
  total_rab: number;
  total_beban: number;
  total_pendapatan: number;
  profit: number;
};

export default function ProfitGlobalPage() {
  const [data, setData] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proyek/profit-global")
      .then((r) => r.json())
      .then((d: ProfitRow[]) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Dashboard Profit Global Proyek">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Kode</th>
                <th className="border p-2">Nama Proyek</th>
                <th className="border p-2 text-right">Nilai Kontrak</th>
                <th className="border p-2 text-right">Total RAB</th>
                <th className="border p-2 text-right">Total Beban</th>
                <th className="border p-2 text-right">Pendapatan</th>
                <th className="border p-2 text-right">Profit</th>
                <th className="border p-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const margin =
                  p.total_pendapatan > 0
                    ? (p.profit / p.total_pendapatan) * 100
                    : 0;

                return (
                  <tr key={p.id}>
                    <td className="border p-2">{p.kode_proyek}</td>
                    <td className="border p-2">{p.nama_proyek}</td>
                    <td className="border p-2 text-right">
                      {p.nilai_kontrak.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2 text-right">
                      {p.total_rab.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2 text-right">
                      {p.total_beban.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2 text-right">
                      {p.total_pendapatan.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2 text-right">
                      {p.profit.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2 text-right">
                      {margin.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
