"use client";

import { useEffect, useState } from "react";

type HealthData = {
  kas: number;
  hutang: number;
  pendapatan: number;
  beban: number;
  laba: number;
  kondisi: "UNTUNG" | "RUGI";
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

function formatLabel(value: number): string {
  if (value < 0) return "(Defisit)";
  return "";
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/laporan/health?id_periode=1");
      const json: HealthData = await res.json();
      setData(json);
    };

    fetchData();
  }, []);

  if (!data) {
    return <div className="p-6">Memuat data...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard Kesehatan Keuangan</h1>

        <span
          className={`px-4 py-1 rounded-full text-sm font-semibold ${
            data.kondisi === "UNTUNG"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {data.kondisi}
        </span>
      </div>

      {/* ================= GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardERP title="Total Kas" value={data.kas} />

        <CardERP title="Total Hutang" value={data.hutang} />

        <CardERP title="Pendapatan" value={data.pendapatan} positive />

        <CardERP title="Beban" value={data.beban} negative />

        <CardERP title="Laba / Rugi" value={data.laba} highlight />
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */

type CardProps = {
  title: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
};

function CardERP({ title, value, positive, negative, highlight }: CardProps) {
  const isNegative = value < 0;

  return (
    <div
      className={`p-5 rounded-xl border shadow-sm bg-white ${
        highlight ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>

      <p
        className={`text-lg font-bold mt-1 ${
          positive
            ? "text-green-600"
            : negative
              ? "text-red-600"
              : isNegative
                ? "text-red-600"
                : "text-gray-800"
        }`}
      >
        {formatRupiah(value)}
      </p>

      {/* LABEL TAMBAHAN */}
      {isNegative && (
        <p className="text-xs text-red-500 mt-1">{formatLabel(value)}</p>
      )}
    </div>
  );
}
