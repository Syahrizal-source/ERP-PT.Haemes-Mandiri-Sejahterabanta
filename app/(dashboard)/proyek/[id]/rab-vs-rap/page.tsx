"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Row = {
  kategori: string;
  nama_item: string;
  total_rab: number;
  total_rap: number;
  selisih: number;
  status: "AMAN" | "OVER";
};

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function RabVsRapPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<Row[]>([]);

  async function load(): Promise<void> {
    const res = await fetch(`/api/proyek/rab-vs-rap?id_proyek=${id}`);
    const json = await res.json();

    if (!res.ok) {
      Swal.fire("Error", json.error, "error");
      return;
    }

    setData(json);

    const over = json.filter((d: Row) => d.status === "OVER");

    if (over.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Overbudget 🚨",
        text: `${over.length} item melebihi anggaran`,
      });
    }
  }

  useEffect(() => {
    load();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRab = data.reduce((s, d) => s + d.total_rab, 0);
  const totalRap = data.reduce((s, d) => s + d.total_rap, 0);
  const totalSelisih = totalRap - totalRab;

  const persen =
    totalRab > 0 ? Math.min((totalRap / totalRab) * 100, 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-2 text-2xl font-bold">
        <TrendingUp /> RAB vs RAP
      </div>

      {/* SUMMARY */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-blue-500">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Wallet size={16} /> Total RAB
          </div>
          <div className="text-xl font-bold text-blue-600">
            {formatRupiah(totalRab)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-purple-500">
          <div className="text-sm text-gray-500">Total RAP</div>
          <div className="text-xl font-bold text-purple-600">
            {formatRupiah(totalRap)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-gray-700">
          <div className="text-sm text-gray-500">Selisih</div>
          <div
            className={`text-xl font-bold ${totalSelisih > 0 ? "text-red-600" : "text-green-600"
              }`}
          >
            {formatRupiah(totalSelisih)}
          </div>
        </div>
      </div>

      {/* PROGRESS BUDGET */}
      <div className="bg-white p-5 rounded-xl shadow">
        <div className="flex justify-between text-sm mb-2">
          <span>Progress Budget</span>
          <span>{persen.toFixed(0)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${persen > 100
                ? "bg-red-500"
                : persen > 70
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            style={{ width: `${persen}%` }}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">Kategori</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">RAB</th>
              <th className="p-3 text-right">RAP</th>
              <th className="p-3 text-right">Selisih</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {data.map((d, i) => {
              const persenItem =
                d.total_rab > 0
                  ? (d.total_rap / d.total_rab) * 100
                  : 0;

              return (
                <tr
                  key={i}
                  className={`border-t transition ${d.status === "OVER"
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50"
                    }`}
                >
                  <td className="p-3 capitalize">{d.kategori}</td>

                  <td className="p-3">
                    <div className="font-medium">{d.nama_item}</div>

                    {/* progress kecil per item */}
                    <div className="w-full bg-gray-200 h-1 mt-1 rounded">
                      <div
                        className="bg-blue-500 h-1 rounded"
                        style={{
                          width: `${Math.min(persenItem, 100)}%`,
                        }}
                      />
                    </div>
                  </td>

                  <td className="p-3 text-right text-blue-600 font-medium">
                    {formatRupiah(d.total_rab)}
                  </td>

                  <td className="p-3 text-right text-purple-600 font-medium">
                    {formatRupiah(d.total_rap)}
                  </td>

                  <td
                    className={`p-3 text-right font-bold ${d.selisih > 0
                        ? "text-red-600"
                        : "text-green-600"
                      }`}
                  >
                    {formatRupiah(d.selisih)}
                  </td>

                  <td className="p-3 text-center">
                    {d.status === "OVER" ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                        <AlertTriangle size={16} />
                        OVER
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle size={16} />
                        AMAN
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}