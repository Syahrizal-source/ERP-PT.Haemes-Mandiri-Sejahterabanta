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

type InsightLevel = "INFO" | "WARNING" | "DANGER" | "SUCCESS";

type Insight = {
  level: InsightLevel;
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

type ApiResponse = {
  kas?: unknown;
  pendapatan?: unknown;
  beban?: unknown;
  laba?: unknown;
  hutang?: unknown;
  score?: unknown;
  kategori?: unknown;
  warna?: unknown;
  insights?: unknown;
  rekomendasi?: unknown;
};

type CardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "normal" | "expense" | "profit";
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return numberValue;
}

function parseInsights(value: unknown): Insight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: Insight[] = [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("level" in item) ||
      !("message" in item)
    ) {
      continue;
    }

    const level = String(item.level);

    if (
      level !== "INFO" &&
      level !== "WARNING" &&
      level !== "DANGER" &&
      level !== "SUCCESS"
    ) {
      continue;
    }

    result.push({
      level,
      message: String(item.message),
    });
  }

  return result;
}

function parseRekomendasi(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HealthPage() {
  const [data, setData] = useState<Data | null>(null);

  async function loadData(): Promise<void> {
    try {
      /*
       * =====================================================
       * API ADALAH SOURCE OF TRUTH
       * =====================================================
       *
       * Frontend tidak menghitung ulang:
       *
       * laba = pendapatan - beban
       *
       * API sudah menghitungnya.
       */

      const res = await fetch("/api/laporan/health", {
        method: "GET",
        cache: "no-store",
      });

      const json: ApiResponse | null = await res.json().catch(() => null);

      if (!res.ok || json === null) {
        await Swal.fire("Error", "Data kesehatan tidak tersedia", "error");

        return;
      }

      const safeData: Data = {
        /*
         * Kas dari API.
         *
         * API sekarang hanya menghitung COA
         * dengan is_cash = true.
         */
        kas: toNumber(json.kas),

        /*
         * Pendapatan dari API.
         */
        pendapatan: toNumber(json.pendapatan),

        /*
         * BEBAN DARI API DISIMPAN POSITIF.
         *
         * Contoh:
         * API -> 489.479.755.168
         *
         * Jangan dikalikan -1 di sini.
         */
        beban: Math.max(toNumber(json.beban), 0),

        /*
         * LABA DARI API ADALAH SOURCE OF TRUTH.
         *
         * Jangan:
         * pendapatan + Math.abs(beban)
         *
         * Jangan menghitung ulang di frontend.
         */
        laba: toNumber(json.laba),

        hutang: toNumber(json.hutang),

        score: toNumber(json.score),

        kategori: String(json.kategori ?? "UNKNOWN"),

        warna: String(json.warna ?? "green"),

        insights: parseInsights(json.insights),

        rekomendasi: parseRekomendasi(json.rekomendasi),
      };

      setData(safeData);

      /*
       * =====================================================
       * ALERT
       * =====================================================
       */

      if (safeData.kas < 0) {
        await Swal.fire("Kas Minus", "Kas perusahaan negatif", "error");
      }

      if (safeData.laba < 0) {
        await Swal.fire("Rugi", "Perusahaan mengalami kerugian", "warning");
      }
    } catch (err) {
      console.error("Health dashboard error:", err);

      await Swal.fire("Error", "Gagal load dashboard", "error");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  /*
   * =========================================================
   * CHART
   * =========================================================
   *
   * Beban tetap POSITIF.
   *
   * API:
   * Pendapatan = positif
   * Beban      = positif
   *
   * Jadi chart membandingkan dua nilai positif.
   */

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
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center gap-3">
        <Activity />

        <h1 className="text-2xl font-bold">Dashboard Kesehatan Keuangan</h1>
      </div>

      {/* =====================================================
          SCORE
      ====================================================== */}

      <div
        className={`p-6 rounded-xl shadow text-white ${
          data.warna === "red"
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

      {/* =====================================================
          KPI
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Kas" value={data.kas} icon={<Wallet size={20} />} />

        <Card
          title="Pendapatan"
          value={data.pendapatan}
          icon={<TrendingUp size={20} />}
        />

        <Card
          title="Beban"
          value={data.beban}
          icon={<AlertTriangle size={20} />}
          variant="expense"
        />

        <Card
          title="Laba / Rugi"
          value={data.laba}
          icon={<ArrowDownRight size={20} />}
          variant="profit"
        />
      </div>

      {/* =====================================================
          VALIDASI VISUAL
      ====================================================== */}

      <div className="bg-white p-4 rounded-xl shadow">
        <div className="text-sm text-gray-500">Perhitungan Laba / Rugi</div>

        <div className="mt-2 text-lg font-semibold">
          {formatRupiah(data.pendapatan)}

          {" - "}

          {formatRupiah(data.beban)}

          {" = "}

          {formatRupiah(data.laba)}
        </div>
      </div>

      {/* =====================================================
          CHART
      ====================================================== */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="flex items-center gap-2 font-semibold mb-4">
          <TrendingUp />
          Grafik Pendapatan vs Beban
        </h2>

        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
              legend: {
                display: true,
              },

              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = Number(context.raw ?? 0);

                    return formatRupiah(value);
                  },
                },
              },
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback: (value) => {
                    const numericValue =
                      typeof value === "number" ? value : Number(value);

                    return formatRupiah(numericValue);
                  },
                },
              },
            },
          }}
        />
      </div>

      {/* =====================================================
          INSIGHT
      ====================================================== */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="flex items-center gap-2 font-semibold mb-4">
          <AlertTriangle />
          Insight Otomatis
        </h2>

        <div className="space-y-2">
          {data.insights.map((insight, index) => (
            <div
              key={`${insight.level}-${index}`}
              className={`p-3 rounded ${
                insight.level === "DANGER"
                  ? "bg-red-100"
                  : insight.level === "WARNING"
                    ? "bg-yellow-100"
                    : insight.level === "SUCCESS"
                      ? "bg-green-100"
                      : "bg-blue-100"
              }`}
            >
              [{insight.level}] {insight.message}
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================
          REKOMENDASI
      ====================================================== */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-3">Rekomendasi</h2>

        <ul className="list-disc pl-5 space-y-1">
          {data.rekomendasi.map((rekomendasi, index) => (
            <li key={index}>{rekomendasi}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   CARD
========================================================= */

function Card({ title, value, icon, variant = "normal" }: CardProps) {
  const isNegative = value < 0;

  let valueClass = "text-green-600";

  /*
   * Beban normalnya positif tetapi secara visual
   * kita tampilkan sebagai expense, bukan negatif.
   */
  if (variant === "expense") {
    valueClass = "text-orange-600";
  }

  /*
   * Laba:
   * positif -> hijau
   * negatif -> merah
   */
  if (variant === "profit") {
    valueClass = isNegative ? "text-red-600" : "text-green-600";
  }

  /*
   * Kas / Pendapatan:
   * nilai negatif -> merah
   */
  if (variant === "normal" && isNegative) {
    valueClass = "text-red-600";
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
      <div>
        <div className="text-sm">{title}</div>

        <div className={`font-bold ${valueClass}`}>{formatRupiah(value)}</div>
      </div>

      {icon}
    </div>
  );
}
