"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  Download,
  FileSpreadsheet,
  Landmark,
  Wallet,
  BarChart3,
  Scale,
  BookOpen,
  Loader2,
} from "lucide-react";

import { useToast } from "@/components/ui/toast-context";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/* =========================
   TYPES
========================= */

interface ReportItem {
  title: string;
  endpoint: string;
  description: string;
  icon: ReactNode;
  category: "ACCOUNTING" | "FINANCIAL" | "MASTER";
}

/* =========================
   REPORT DATA
========================= */

const reports: ReportItem[] = [
  {
    title: "Buku Besar Umum",
    endpoint: "/api/report/buku-besar",
    description: "General ledger seluruh akun perusahaan",
    icon: <BookOpen className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Buku Besar Per Akun",
    endpoint: "/api/report/buku-besar-perakun",
    description:
      "Rincian transaksi, debit, kredit, dan saldo berjalan setiap akun COA",
    icon: <BookOpen className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Laba Rugi",
    endpoint: "/api/report/laba-rugi",
    description: "Pendapatan dan beban perusahaan",
    icon: <BarChart3 className="w-5 h-5" />,
    category: "FINANCIAL",
  },
  {
    title: "Neraca",
    endpoint: "/api/report/neraca",
    description: "Posisi keuangan perusahaan",
    icon: <Landmark className="w-5 h-5" />,
    category: "FINANCIAL",
  },
  {
    title: "Trial Balance",
    endpoint: "/api/report/trial-balance",
    description: "Neraca saldo akun perusahaan",
    icon: <Scale className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Buku Besar Piutang",
    endpoint: "/api/report/buku-besar-piutang",
    description: "Buku Besar Piutang",
    icon: <BookOpen className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Buku Kas Corporate",
    endpoint: "/api/report/buku-kas-corporate",
    description: "Buku kas harian corporate",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Buku Besar Kas",
    endpoint: "/api/report/buku-besar-kas",
    description: "Buku Besar Kas",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    category: "ACCOUNTING",
  },
  {
    title: "Cashflow",
    endpoint: "/api/report/cashflow",
    description: "Arus kas operating, investing, financing",
    icon: <Wallet className="w-5 h-5" />,
    category: "FINANCIAL",
  },
  {
    title: "Chart Of Account",
    endpoint: "/api/report/coa",
    description: "Master daftar akun perusahaan",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    category: "MASTER",
  },
];

/* =========================
   PAGE
========================= */

export default function ReportPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState<string | null>(null);

  const groupedReports = useMemo(() => {
    return {
      ACCOUNTING: reports.filter((report) => report.category === "ACCOUNTING"),
      FINANCIAL: reports.filter((report) => report.category === "FINANCIAL"),
      MASTER: reports.filter((report) => report.category === "MASTER"),
    };
  }, []);

  /* =========================
     DOWNLOAD REPORT
  ========================= */

  async function handleDownload(
    endpoint: string,
    title: string,
  ): Promise<void> {
    try {
      setLoading(endpoint);

      const response = await fetch(endpoint);

      if (!response.ok) {
        let message = `Export ${title} gagal`;

        try {
          const result: { message?: string } = await response.json();

          if (result.message) {
            message = result.message;
          }
        } catch {
          // Gunakan pesan default jika respons bukan JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      const today = new Date().toISOString().split("T")[0];

      link.href = url;
      link.download = `${title.replace(/[^a-zA-Z0-9-_]/g, "-")}-${today}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      showToast(`${title} berhasil di-download`, "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengunduh laporan";

      showToast(message, "error");
    } finally {
      setLoading(null);
    }
  }

  /* =========================
     REPORT SECTION
  ========================= */

  function renderSection(title: string, items: ReportItem[]) {
    return (
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card
              key={item.endpoint}
              title=""
              className="
                border
                border-slate-200
                hover:border-blue-400
                transition-all
                duration-200
                shadow-sm
                hover:shadow-md
              "
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="
                      p-3
                      rounded-xl
                      bg-blue-50
                      text-blue-700
                    "
                  >
                    {item.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800">
                      {item.title}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleDownload(item.endpoint, item.title)}
                  disabled={loading !== null}
                >
                  {loading === item.endpoint ? (
                    <Loader2
                      className="
                        w-4
                        h-4
                        animate-spin
                        mr-2
                      "
                    />
                  ) : (
                    <Download
                      className="
                        w-4
                        h-4
                        mr-2
                      "
                    />
                  )}

                  {loading === item.endpoint ? "Memproses..." : "Export Excel"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* =========================
     RENDER PAGE
  ========================= */

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="space-y-2">
        <h1
          className="
            text-3xl
            font-bold
            text-slate-800
          "
        >
          Laporan Keuangan
        </h1>

        <p className="text-slate-500">
          Executive corporate financial reporting
        </p>
      </div>

      {renderSection("Accounting Reports", groupedReports.ACCOUNTING)}

      {renderSection("Financial Statements", groupedReports.FINANCIAL)}

      {renderSection("Master Data", groupedReports.MASTER)}
    </div>
  );
}
