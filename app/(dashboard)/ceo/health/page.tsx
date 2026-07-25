"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Wallet,
  ArrowDownRight,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Insight = {
  level: "INFO" | "WARNING" | "DANGER";
  message: string;
};

type Data = {
  kas: number;
  pendapatan: number;
  beban: number;
  laba: number;
  hutang: number;
  score: number;
  kategori: string;
  warna: string;
  insights: Insight[];
  rekomendasi: string[];
};

export default function HealthPage() {
  const [data, setData] = useState<Data | null>(null);

  async function loadData(): Promise<void> {
    try {
      const res = await fetch("/api/laporan/health");
      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        Swal.fire("Error", "Data kesehatan tidak tersedia", "error");
        return;
      }

      const safeData: Data = {
        kas: Number(json.kas ?? 0),
        pendapatan: Number(json.pendapatan ?? 0),
        beban: Number(json.beban ?? 0),
        laba: Number(json.laba ?? 0),
        hutang: Number(json.hutang ?? 0),
        score: Number(json.score ?? 0),
        kategori: String(json.kategori ?? "UNKNOWN"),
        warna: String(json.warna ?? "green"),
        insights: Array.isArray(json.insights) ? json.insights : [],
        rekomendasi: Array.isArray(json.rekomendasi)
          ? json.rekomendasi
          : [],
      };

      setData(safeData);

      if (safeData.kas < 0) {
        Swal.fire("Kas Minus", "Kas perusahaan negatif", "error");
      }

      if (safeData.laba < 0) {
        Swal.fire("Rugi", "Perusahaan mengalami kerugian", "warning");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal load dashboard", "error");
    }
  }

  useEffect(() => {
    loadData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  const chartData = {
    labels: ["Pendapatan", "Beban"],
    datasets: [
      {
        label: "Nilai",
        data: [data.pendapatan, data.beban],
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Activity />
        <h1 className="text-2xl font-bold">
          Dashboard Kesehatan Keuangan
        </h1>
      </div>

      {/* SCORE */}
      <div
        className={`p-6 rounded-xl shadow text-white ${data.warna === "red"
          ? "bg-red-500"
          : data.warna === "yellow"
            ? "bg-yellow-500"
            : "bg-green-500"
          }`}
      >
        <div className="text-sm">Skor Kesehatan</div>
        <div className="text-4xl font-bold">{data.score}/100</div>
        <div className="text-sm mt-2">{data.kategori}</div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Kas" value={data.kas} icon={<Wallet size={20} />} />
        <Card title="Pendapatan" value={data.pendapatan} icon={<TrendingUp size={20} />} />
        <Card title="Beban" value={data.beban} icon={<AlertTriangle size={20} />} />
        <Card title="Laba / Rugi" value={data.laba} icon={<ArrowDownRight size={20} />} />
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="flex items-center gap-2 font-semibold mb-4">
          <TrendingUp /> Grafik Laba vs Beban
        </h2>
        <Bar data={chartData} />
      </div>

      {/* INSIGHT */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="flex items-center gap-2 font-semibold mb-4">
          <AlertTriangle /> Insight Otomatis
        </h2>

        <div className="space-y-2">
          {data.insights.map((i, idx) => (
            <div
              key={idx}
              className={`p-3 rounded ${i.level === "DANGER"
                ? "bg-red-100"
                : i.level === "WARNING"
                  ? "bg-yellow-100"
                  : "bg-blue-100"
                }`}
            >
              [{i.level}] {i.message}
            </div>
          ))}
        </div>
      </div>

      {/* REKOMENDASI */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-3">Rekomendasi</h2>
        <ul className="list-disc pl-5 space-y-1">
          {data.rekomendasi.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================
   CARD
========================= */
function Card({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: JSX.Element;
}) {
  const isNegative = value < 0;

  return (
    <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
      <div>
        <div className="text-sm">{title}</div>
        <div
          className={`font-bold ${isNegative ? "text-red-600" : "text-green-600"
            }`}
        >
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(value)}
        </div>
      </div>
      {icon}
    </div>
  );
}