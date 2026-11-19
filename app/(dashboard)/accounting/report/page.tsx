"use client";

import { useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

import * as XLSX from "xlsx";

import {
  BarChart3,
  BookOpen,
  Book,
  Coins,
  FileText,
  TrendingUp,
  Package,
  Download,
  ArrowLeftRight,
  FileSpreadsheet,
  Receipt,
  Briefcase,
  Landmark,
  Loader2,
  Scale,
  Wallet,
  Banknote,
  List,
  CreditCard,
  X,
  Eye,
  RefreshCw,
  BanknoteIcon,
} from "lucide-react";

import { useToast } from "@/components/ui/toast-context";

import Button from "@/components/ui/Button";

import Card from "@/components/ui/Card";

type ReportCategory = "ACCOUNTING" | "FINANCIAL" | "MASTER";

interface ReportItem {
  title: string;

  endpoint: string;

  description: string;

  icon: ReactNode;

  category: ReportCategory;

  supportsDetail: boolean;
}

interface ApiErrorPayload {
  error?: string;

  message?: string;

  detail?: string;
}

interface PreviewRow {
  rowNumber: number;

  cells: string[];

  rowType: "header" | "section" | "total" | "data";
}

interface PreviewSheet {
  name: string;

  columnCount: number;

  rows: PreviewRow[];
}

interface ReportPreview {
  title: string;

  sheets: PreviewSheet[];

  fetchedAt: string;
}

const reports: ReportItem[] = [
  {
    title: "Buku Besar Umum",

    endpoint: "/api/report/buku-besar",

    description: "Seluruh akun dan transaksi perusahaan",

    icon: <BookOpen className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Besar Per Akun",

    endpoint: "/api/report/buku-besar-perakun",

    description:
      "Saldo awal sebagai transaksi jurnal, lalu debit, kredit, dan saldo berjalan per akun COA",

    icon: <Book className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Trial Balance",

    endpoint: "/api/report/trial-balance",

    description: "Saldo debit dan kredit seluruh akun perusahaan",

    icon: <Scale className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Besar Piutang",

    endpoint: "/api/report/buku-besar-piutang",

    description: "Rincian saldo awal dan transaksi piutang dari jurnal Posted",

    icon: <Coins className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Besar Liabilitas",

    endpoint: "/api/report/liabilitas",

    description: "Buku Besar Liabilitas",

    icon: <FileText className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Ekuitas",

    endpoint: "/api/report/ekuitas",

    description: "Buku Ekuitas",

    icon: <TrendingUp className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Beban Pokok Pendapatan",

    endpoint: "/api/report/beban-pokok-pendapatan",

    description: "Buku Beban Pokok Pendapatan",

    icon: <Package className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Beban Usaha",

    endpoint: "/api/report/beban-usaha",

    description: "Buku Beban Usaha",

    icon: <Briefcase className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Pendapatan Beban Lain-lain",

    endpoint: "/api/report/pendapatan-beban-lain-lain",

    description: "Buku Pendapatan Beban Lain-lain",

    icon: <ArrowLeftRight className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Beban Pajak Penghasilan",

    endpoint: "/api/report/beban-pajak-penghasilan",

    description: "Buku Beban Pajak",

    icon: <Receipt className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Pendapatan Usaha",

    endpoint: "/api/report/buku-besar-pendapatan-usaha",

    description: "Buku Pendapatan Usaha",

    icon: <CreditCard className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Besar Bank",

    endpoint: "/api/report/buku-besar-bank",

    description: "Buku Bank",

    icon: <BanknoteIcon className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Buku Besar Kas",

    endpoint: "/api/report/buku-besar-kas",

    description: "Rincian transaksi buku besar kas",

    icon: <Banknote className="h-5 w-5" />,

    category: "ACCOUNTING",

    supportsDetail: true,
  },

  {
    title: "Laba Rugi",

    endpoint: "/api/report/laba-rugi",

    description: "Pendapatan, beban, dan hasil laba/rugi perusahaan",

    icon: <BarChart3 className="h-5 w-5" />,

    category: "FINANCIAL",

    supportsDetail: true,
  },

  {
    title: "Neraca",

    endpoint: "/api/report/neraca",

    description: "Posisi aset, liabilitas, dan ekuitas perusahaan",

    icon: <Landmark className="h-5 w-5" />,

    category: "FINANCIAL",

    supportsDetail: true,
  },

  {
    title: "Cashflow",

    endpoint: "/api/report/cashflow",

    description: "Arus kas aktivitas operasi, investasi, dan pendanaan",

    icon: <Wallet className="h-5 w-5" />,

    category: "FINANCIAL",

    supportsDetail: true,
  },

  {
    title: "Chart Of Account",

    endpoint: "/api/report/coa",

    description: "Master daftar akun perusahaan",

    icon: <List className="h-5 w-5" />,

    category: "MASTER",

    supportsDetail: false,
  },
];

const categoryTitles: Record<ReportCategory, string> = {
  ACCOUNTING: "Accounting Reports",

  FINANCIAL: "Financial Statements",

  MASTER: "Master Data",
};

const categoryOrder: ReportCategory[] = ["ACCOUNTING", "FINANCIAL", "MASTER"];

function getFileDate(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createSafeFileName(title: string): string {
  const safeTitle = title

    .normalize("NFKD")

    .replace(/[^a-zA-Z0-9_-]+/g, "-")

    .replace(/^-+|-+$/g, "");

  return safeTitle || "laporan";
}

async function readApiError(response: Response): Promise<string> {
  const fallbackMessage = `Permintaan gagal (HTTP ${response.status}).`;

  try {
    const responseText = await response.text();

    if (!responseText.trim()) {
      return fallbackMessage;
    }

    try {
      const payload: unknown = JSON.parse(responseText);

      if (typeof payload === "object" && payload !== null) {
        const errorPayload = payload as ApiErrorPayload;

        if (
          typeof errorPayload.error === "string" &&
          errorPayload.error.trim()
        ) {
          return errorPayload.error;
        }

        if (
          typeof errorPayload.message === "string" &&
          errorPayload.message.trim()
        ) {
          return errorPayload.message;
        }

        if (
          typeof errorPayload.detail === "string" &&
          errorPayload.detail.trim()
        ) {
          return errorPayload.detail;
        }
      }
    } catch {
      // Jangan tampilkan respons HTML mentah ke notifikasi.
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function normalizeCellText(value: string): string {
  const cleaned = value.replace(/\u0000/g, "").trim();

  if (cleaned === "—" || cleaned === "–" || cleaned === "-") {
    return "";
  }

  return cleaned;
}

function formatXlsxValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("id-ID");
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return formatXlsxValue(value.result);
    }

    try {
      return JSON.stringify(value) ?? "";
    } catch {
      return "";
    }
  }

  return "";
}

function isReportMetadataRow(cells: string[]): boolean {
  const text = cells.filter(Boolean).join(" ").toLocaleLowerCase("id-ID");

  if (!text) {
    return true;
  }

  const metadataPatterns = [
    /^pt\.\s*haemes mandiri/i,

    /^jasa cut\s*&\s*fill/i,

    /^buku besar(?:\s+per akun|\s+umum)?$/i,

    /^trial balance$/i,

    /^laba rugi$/i,

    /^neraca$/i,

    /^cash\s*flow$/i,

    /^laporan\s+(?:keuangan|laba rugi|neraca|arus kas)$/i,

    /^divisi\s*:/i,

    /^periode\s*:/i,

    /^tanggal cetak\s*:/i,

    /^mata uang\s*:/i,

    /^kelompok\s*:/i,

    /^dibuat oleh\b/i,

    /^diperiksa oleh\b/i,

    /^disetujui oleh\b/i,

    /^\(?_{3,}\)?$/,
  ];

  return metadataPatterns.some((pattern) => pattern.test(text));
}

function detectPreviewRowType(cells: string[]): PreviewRow["rowType"] {
  const meaningfulCells = cells.filter(Boolean);

  const normalized = meaningfulCells.map((cell) =>
    cell.toLocaleLowerCase("id-ID"),
  );

  if (
    normalized.some((cell) => cell.includes("total akun")) ||
    normalized.some((cell) => cell.includes("total keseluruhan")) ||
    normalized.some((cell) => cell.startsWith("total "))
  ) {
    return "total";
  }

  const headerWords = [
    "tanggal",

    "voucher",

    "no. voucher",

    "keterangan",

    "debit",

    "kredit",

    "saldo berjalan",

    "akun",

    "kode akun",

    "nama akun",

    "saldo debit",

    "saldo kredit",
  ];

  const headerMatches = normalized.filter((cell) =>
    headerWords.some((word) => cell === word || cell.includes(word)),
  ).length;

  if (headerMatches >= 2) {
    return "header";
  }

  if (meaningfulCells.length === 1) {
    return "section";
  }

  return "data";
}

/**



 * Preview mengambil workbook dari endpoint laporan yang sama.



 * Baris metadata cetak, tanda strip, dan bagian tanda tangan disembunyikan.



 * Nilai transaksi dan total tetap ditampilkan apa adanya.



 */

async function readWorkbookPreview(
  buffer: ArrayBuffer,

  title: string,
): Promise<ReportPreview> {
  if (buffer.byteLength === 0) {
    throw new Error(`Laporan ${title} tidak memiliki data.`);
  }

  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",

    cellDates: true,

    raw: false,
  });

  const sheets: PreviewSheet[] = [];

  const sheetNames = Array.isArray(workbook.SheetNames)
    ? workbook.SheetNames
    : [];

  sheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return;
    }

    const sourceRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,

      raw: false,

      defval: "",

      blankrows: false,
    });

    const rows: PreviewRow[] = [];

    sourceRows.forEach((sourceRow, index) => {
      const cells = sourceRow.map((cell) =>
        normalizeCellText(formatXlsxValue(cell)),
      );

      while (cells.length > 0 && cells[cells.length - 1] === "") {
        cells.pop();
      }

      if (cells.every((cell) => cell === "")) {
        return;
      }

      if (isReportMetadataRow(cells)) {
        return;
      }

      rows.push({
        rowNumber: index + 1,

        cells,

        rowType: detectPreviewRowType(cells),
      });
    });

    const columnCount = rows.reduce(
      (maximum, row) => Math.max(maximum, row.cells.length),

      1,
    );

    sheets.push({
      name: sheetName,

      columnCount,

      rows,
    });
  });

  if (sheets.length === 0 || sheets.every((sheet) => sheet.rows.length === 0)) {
    throw new Error(
      `Laporan ${title} diterima, tetapi tidak ditemukan baris data untuk ditampilkan.`,
    );
  }

  return {
    title,

    sheets,

    fetchedAt: new Date().toLocaleString("id-ID"),
  };
}

function formatCellForDisplay(value: string): string {
  return value;
}

type BukuBesarTipeFilter =
  | "all"
  | "kas"
  | "bank"
  | "piutang"
  | "aset-tetap"
  | "liabilitas"
  | "ekuitas"
  | "pendapatan-usaha"
  | "beban-pokok-pendapatan"
  | "beban-usaha"
  | "pendapatan-beban-lain-lain"
  | "beban-pajak-penghasilan";

type BukuBesarStatusFilter = "ALL" | "POSTED";

const BUKU_BESAR_TIPE_OPTIONS: Array<{
  value: BukuBesarTipeFilter;

  label: string;
}> = [
  { value: "all", label: "Semua Tipe" },

  { value: "kas", label: "Kas" },

  { value: "bank", label: "Bank" },

  { value: "piutang", label: "Piutang" },

  { value: "aset-tetap", label: "Aset Tetap" },

  { value: "liabilitas", label: "Liabilitas/Utang" },

  { value: "ekuitas", label: "Ekuitas" },

  { value: "pendapatan-usaha", label: "Pendapatan Usaha Bersih" },

  { value: "beban-pokok-pendapatan", label: "Beban Pokok Pendapatan" },

  { value: "beban-usaha", label: "Beban Usaha" },

  {
    value: "pendapatan-beban-lain-lain",

    label: "Pendapatan(Beban)(Lain-lain)",
  },

  { value: "beban-pajak-penghasilan", label: "Beban Pajak Penghasilan" },
];

const BUKU_BESAR_STATUS_OPTIONS: Array<{
  value: BukuBesarStatusFilter;

  label: string;
}> = [
  { value: "ALL", label: "Semua Status" },

  { value: "POSTED", label: "POSTED" },
];

function buildBukuBesarEndpoint(
  endpoint: string,

  tipe: BukuBesarTipeFilter,

  status: BukuBesarStatusFilter,
): string {
  if (endpoint !== "/api/report/buku-besar-perakun") return endpoint;

  return `${endpoint}?${new URLSearchParams({ tipe, status }).toString()}`;
}

export default function ReportPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const [preview, setPreview] = useState<ReportPreview | null>(null);

  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const [bukuBesarTipe, setBukuBesarTipe] =
    useState<BukuBesarTipeFilter>("all");

  const [bukuBesarStatus, setBukuBesarStatus] =
    useState<BukuBesarStatusFilter>("POSTED");

  const groupedReports = useMemo(
    () => ({
      ACCOUNTING: reports.filter((report) => report.category === "ACCOUNTING"),

      FINANCIAL: reports.filter((report) => report.category === "FINANCIAL"),

      MASTER: reports.filter((report) => report.category === "MASTER"),
    }),

    [],
  );

  async function handleDownload(
    endpoint: string,

    title: string,
  ): Promise<void> {
    if (loading !== null || previewLoading !== null) {
      return;
    }

    setLoading(endpoint);

    try {
      const requestEndpoint = buildBukuBesarEndpoint(
        endpoint,

        bukuBesarTipe,

        bukuBesarStatus,
      );

      const response = await fetch(requestEndpoint, {
        method: "GET",

        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json",
        },

        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const contentType = response.headers.get("content-type") ?? "";

      const normalizedContentType = contentType.toLowerCase();

      if (
        normalizedContentType.includes("application/json") ||
        normalizedContentType.includes("text/html")
      ) {
        throw new Error(await readApiError(response));
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(`File Excel ${title} kosong dan tidak dapat diunduh.`);
      }

      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      const fileName = `${createSafeFileName(title)}-${getFileDate()}.xlsx`;

      link.href = objectUrl;

      link.download = fileName;

      link.style.display = "none";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);

      showToast(`${title} berhasil di-download`, "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Terjadi kesalahan saat mengunduh ${title}.`;

      showToast(message, "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleOpenDetail(
    endpoint: string,

    title: string,
  ): Promise<void> {
    if (loading !== null || previewLoading !== null) {
      return;
    }

    setPreviewLoading(endpoint);

    setPreview(null);

    setActiveSheetIndex(0);

    try {
      const requestEndpoint = buildBukuBesarEndpoint(
        endpoint,

        bukuBesarTipe,

        bukuBesarStatus,
      );

      const response = await fetch(requestEndpoint, {
        method: "GET",

        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json",
        },

        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const contentType = (
        response.headers.get("content-type") ?? ""
      ).toLowerCase();

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/html")
      ) {
        throw new Error(await readApiError(response));
      }

      const buffer = await response.arrayBuffer();

      if (buffer.byteLength === 0) {
        throw new Error(`Laporan ${title} tidak memiliki data.`);
      }

      const reportPreview = await readWorkbookPreview(buffer, title);

      setPreview(reportPreview);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Terjadi kesalahan saat membaca laporan ${title}.`;

      showToast(message, "error");
    } finally {
      setPreviewLoading(null);
    }
  }

  useEffect(() => {
    if (!preview) {
      return;
    }

    document

      .getElementById("report-detail")

      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preview]);

  function renderSection(
    sectionKey: ReportCategory,

    title: string,

    items: ReportItem[],
  ): ReactNode {
    return (
      <section key={sectionKey} className="space-y-4" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

          <span className="text-xs font-medium text-slate-500">
            {items.length} laporan
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isDownloading = loading === item.endpoint;

            const isPreviewing = previewLoading === item.endpoint;

            const isDisabled = loading !== null || previewLoading !== null;

            return (
              <Card
                key={item.endpoint}
                title=""
                className="border border-slate-200 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {item.endpoint === "/api/report/buku-besar-perakun" ? (
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Tipe
                        <select
                          value={bukuBesarTipe}
                          onChange={(event) =>
                            setBukuBesarTipe(
                              event.target.value as BukuBesarTipeFilter,
                            )
                          }
                          disabled={isDisabled}
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          {BUKU_BESAR_TIPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                        Status
                        <select
                          value={bukuBesarStatus}
                          onChange={(event) =>
                            setBukuBesarStatus(
                              event.target.value as BukuBesarStatusFilter,
                            )
                          }
                          disabled={isDisabled}
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          {BUKU_BESAR_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <p className="sm:col-span-2 text-xs leading-5 text-slate-500">
                        Semua Status tetap menampilkan jurnal POSTED karena
                        seluruh 11 view sumber hanya berisi jurnal POSTED.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                    {item.supportsDetail ? (
                      <Button
                        className="w-full flex-1"
                        onClick={() =>
                          handleOpenDetail(item.endpoint, item.title)
                        }
                        disabled={isDisabled}
                      >
                        {isPreviewing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="mr-2 h-4 w-4" />
                        )}

                        {isPreviewing ? "Membaca..." : "View"}
                      </Button>
                    ) : null}

                    <Button
                      className="w-full flex-1"
                      onClick={() => handleDownload(item.endpoint, item.title)}
                      disabled={isDisabled}
                    >
                      {isDownloading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}

                      {isDownloading ? "Memproses..." : "Export Excel"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    );
  }

  const activeSheet =
    preview && activeSheetIndex >= 0 && activeSheetIndex < preview.sheets.length
      ? preview.sheets[activeSheetIndex]
      : (preview?.sheets[0] ?? null);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-3 pb-10 sm:px-5 lg:px-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <FileSpreadsheet className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                Laporan Keuangan
              </h1>

              <p className="text-sm text-slate-500">
                Executive corporate financial reporting
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Jurnal Posted
          </span>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            Periode laporan: 2026
          </span>
        </div>
      </header>

      {categoryOrder.map((category) =>
        renderSection(
          category,

          categoryTitles[category],

          groupedReports[category],
        ),
      )}

      {preview ? (
        <section
          id="report-detail"
          className="scroll-mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-700" />

                <h2 className="text-lg font-bold text-slate-800">
                  {preview.title}
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Data dibaca dari hasil API laporan · Dibuka {preview.fetchedAt}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const report = reports.find(
                    (item) => item.title === preview.title,
                  );

                  if (report) {
                    void handleOpenDetail(report.endpoint, report.title);
                  }
                }}
                disabled={loading !== null || previewLoading !== null}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Ulang
              </Button>

              <Button
                onClick={() => {
                  const report = reports.find(
                    (item) => item.title === preview.title,
                  );

                  if (report) {
                    void handleDownload(report.endpoint, report.title);
                  }
                }}
                disabled={loading !== null || previewLoading !== null}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>

              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                aria-label="Tutup detail laporan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {preview.sheets.length > 1 ? (
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Lembar laporan"
            >
              {preview.sheets.map((sheet, index) => (
                <button
                  key={`${sheet.name}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={activeSheetIndex === index}
                  onClick={() => setActiveSheetIndex(index)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    activeSheetIndex === index
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          ) : null}

          {activeSheet ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-700">
                  {activeSheet.name}
                </h3>

                <span className="text-xs text-slate-500">
                  {activeSheet.rows.length.toLocaleString("id-ID")} baris
                </span>
              </div>

              {activeSheet.rows.length > 0 ? (
                <div className="max-h-[680px] overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full border-collapse text-sm">
                    <tbody>
                      {activeSheet.rows.map((row) => {
                        const rowKey = `${activeSheet.name}-${row.rowNumber}`;

                        if (row.rowType === "section") {
                          return (
                            <tr
                              key={rowKey}
                              className="border-b border-slate-100 bg-slate-50"
                            >
                              <td
                                colSpan={activeSheet.columnCount}
                                className="px-4 py-3 font-semibold text-slate-800"
                              >
                                {row.cells.find((cell) => cell.length > 0) ??
                                  ""}
                              </td>
                            </tr>
                          );
                        }

                        if (row.rowType === "header") {
                          return (
                            <tr
                              key={rowKey}
                              className="border-b border-slate-200 bg-slate-100"
                            >
                              {row.cells.map((cell, index) => (
                                <th
                                  key={`${rowKey}-${index}`}
                                  scope="col"
                                  className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  {cell}
                                </th>
                              ))}
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={rowKey}
                            className={`border-b border-slate-100 last:border-b-0 ${
                              row.rowType === "total"
                                ? "bg-blue-50/70 font-semibold text-slate-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {Array.from(
                              { length: activeSheet.columnCount },

                              (_, index) => (
                                <td
                                  key={`${rowKey}-${index}`}
                                  className={`min-w-28 whitespace-pre-wrap px-3 py-2.5 align-top ${
                                    /debit|kredit|saldo/i.test(
                                      activeSheet.rows.find(
                                        (candidate) =>
                                          candidate.rowType === "header",
                                      )?.cells[index] ?? "",
                                    )
                                      ? "text-right tabular-nums"
                                      : "text-left"
                                  }`}
                                >
                                  {formatCellForDisplay(row.cells[index] ?? "")}
                                </td>
                              ),
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Sheet ini tidak memiliki baris data.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Tidak ada sheet laporan yang dapat ditampilkan.
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
