"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TrendingUp, PieChart } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

/* =========================
   TYPES (SUDAH FIX)
========================= */
type Monthly = {
  bulan: string;
  pendapatan: number;
  beban: number;
};

type Divisi = {
  nama: string;
  total: number;
};

type Forecast = {
  bulan: string;
  estimasi: number;
};

type Anomaly = {
  bulan: string;
  beban: number;
};

type Margin = {
  id_proyek: string;
  margin: number;
};

type Ranking = {
  id_proyek: string;
  profit: number;
};

type Data = {
  monthly: Monthly[];
  divisi: Divisi[];
  forecast: Forecast[];
  anomaly: Anomaly[];
  margin: Margin[];
  ranking: Ranking[];
  profit_chart: { proyek: string; profit: number }[];
  rekomendasi: string[];
};

/* =========================
   HELPER
========================= */
function toNumber(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);

  async function load(): Promise<void> {
    try {
      const res = await fetch("/api/laporan/analytics");
      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        Swal.fire("Error", "Gagal load analytics", "error");
        return;
      }

      const safeData: Data = {
        monthly: Array.isArray(json.monthly) ? json.monthly : [],
        divisi: Array.isArray(json.divisi) ? json.divisi : [],
        forecast: Array.isArray(json.forecast) ? json.forecast : [],
        anomaly: Array.isArray(json.anomaly) ? json.anomaly : [],
        margin: Array.isArray(json.margin) ? json.margin : [],
        ranking: Array.isArray(json.ranking) ? json.ranking : [],
        profit_chart: Array.isArray(json.profit_chart)
          ? json.profit_chart
          : [],
        rekomendasi: Array.isArray(json.rekomendasi)
          ? json.rekomendasi
          : [],
      };

      setData(safeData);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Server error", "error");
    }
  }

  useEffect(() => {
    load();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <div className="p-6">Loading...</div>;

  /* =========================
     CHART SAFE (ANTI KOSONG)
  ========================= */
  const monthlyChart = {
    labels:
      data.monthly.length > 0
        ? data.monthly.map((m) => m.bulan)
        : ["Tidak Ada Data"],
    datasets: [
      {
        label: "Pendapatan",
        data:
          data.monthly.length > 0
            ? data.monthly.map((m) => toNumber(m.pendapatan))
            : [0],
        backgroundColor: "rgba(34,197,94,0.6)",
      },
      {
        label: "Beban",
        data:
          data.monthly.length > 0
            ? data.monthly.map((m) => toNumber(m.beban))
            : [0],
        backgroundColor: "rgba(239,68,68,0.6)",
      },
    ],
  };

  const divisiChart = {
    labels:
      data.divisi.length > 0
        ? data.divisi.map((d) => d.nama)
        : ["Tidak Ada Data"],
    datasets: [
      {
        label: "Beban per Divisi",
        data:
          data.divisi.length > 0
            ? data.divisi.map((d) => toNumber(d.total))
            : [0],
        backgroundColor: "rgba(168,85,247,0.6)",
      },
    ],
  };

  const forecastChart = {
    labels:
      data.forecast.length > 0
        ? data.forecast.map((f) => f.bulan)
        : ["Tidak Ada Data"],
    datasets: [
      {
        label: "Forecast AI",
        data:
          data.forecast.length > 0
            ? data.forecast.map((f) => toNumber(f.estimasi))
            : [0],
        borderColor: "rgba(59,130,246,1)",
        backgroundColor: "rgba(59,130,246,0.2)",
      },
    ],
  };

  const profitChart = {
    labels:
      data.profit_chart.length > 0
        ? data.profit_chart.map((p) => p.proyek)
        : ["Tidak Ada Data"],
    datasets: [
      {
        label: "Profit Proyek",
        data:
          data.profit_chart.length > 0
            ? data.profit_chart.map((p) => toNumber(p.profit))
            : [0],
        backgroundColor: "rgba(34,197,94,0.6)",
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-xl font-bold">
        <TrendingUp /> Analytics CEO
      </div>

      {/* MONTHLY */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-4 font-semibold">Tren Bulanan</h2>
        <Bar data={monthlyChart} />
      </div>

      {/* DIVISI */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-4 font-semibold">Analisa Divisi</h2>
        <Bar data={divisiChart} />
      </div>

      {/* FORECAST */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-4 font-semibold">Forecast AI</h2>
        <Line data={forecastChart} />
      </div>

      {/* PROFIT */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-4 font-semibold">Profit per Proyek</h2>
        <Bar data={profitChart} />
      </div>

      {/* RANKING */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-3 font-semibold">Top Proyek</h2>
        {data.ranking.map((r, i) => (
          <div key={i}>
            #{i + 1} {r.id_proyek} - Rp{" "}
            {r.profit.toLocaleString("id-ID")}
          </div>
        ))}
      </div>

      {/* ANOMALY */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-3 font-semibold">Anomaly</h2>
        {data.anomaly.length === 0 ? (
          <div className="text-gray-500">Tidak ada anomali</div>
        ) : (
          data.anomaly.map((a, i) => (
            <div key={i} className="text-red-600">
              {a.bulan} - Rp {a.beban.toLocaleString("id-ID")}
            </div>
          ))
        )}
      </div>

      {/* MARGIN */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-3 font-semibold">Margin Proyek</h2>
        {data.margin.map((m, i) => (
          <div key={i}>
            {m.id_proyek} - Rp{" "}
            {m.margin.toLocaleString("id-ID")}
          </div>
        ))}
      </div>

      {/* AI */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="mb-3 font-semibold">AI Rekomendasi</h2>
        {data.rekomendasi.map((r, i) => (
          <div key={i} className="text-blue-600">
            • {r}
          </div>
        ))}
      </div>
    </div>
  );
}