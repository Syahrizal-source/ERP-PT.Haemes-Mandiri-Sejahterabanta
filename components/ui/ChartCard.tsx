"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface Props {
  title: string;
  labels: string[];
  data: number[];
}

export default function ChartCard({
  title,
  labels,
  data,
}: Props): React.JSX.Element {
  const getColor = (title: string) => {
    if (title.toLowerCase().includes("penerimaan"))
      return {
        border: "#16a34a",
        bg: "rgba(22, 163, 74, 0.1)",
      };

    if (title.toLowerCase().includes("pengeluaran"))
      return {
        border: "#dc2626",
        bg: "rgba(220, 38, 38, 0.1)",
      };

    return {
      border: "#2563eb",
      bg: "rgba(37, 99, 235, 0.1)",
    };
  };

  const color = getColor(title);

  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        tension: 0.3,
        borderColor: color.border,
        backgroundColor: color.bg,
        pointBackgroundColor: color.border,
      },
    ],
  };

  const isCurrency = title.toLowerCase().includes("rp") ||
    title.toLowerCase().includes("biaya") ||
    title.toLowerCase().includes("fuel") ||
    title.toLowerCase().includes("rental") ||
    title.toLowerCase().includes("payroll") ||
    title.toLowerCase().includes("debit") ||
    title.toLowerCase().includes("kredit");

  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.parsed.y);

            return isCurrency
              ? `Rp ${value.toLocaleString("id-ID")}`
              : value.toLocaleString("id-ID");
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (val: string | number) => {
            const num = Number(val);

            return isCurrency
              ? `Rp ${num.toLocaleString("id-ID")}`
              : num.toLocaleString("id-ID");
          },
        },
      },
    },
  };



  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <Line data={chartData} options={options} />
    </div>
  );
}