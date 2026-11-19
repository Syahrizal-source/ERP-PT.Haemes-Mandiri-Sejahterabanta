import { NextResponse } from "next/server";

import ExcelJS from "exceljs";

import QRCode from "qrcode";

import { db } from "@/lib/supabase/server";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* ============================================================

   TYPES

   ============================================================ */

type BukuBesarViewName =
  | "v_buku_besar_kas_per_akun"
  | "v_buku_besar_bank_per_akun"
  | "v_buku_besar_piutang_per_akun"
  | "v_buku_besar_aset_tetap_per_akun"
  | "v_buku_besar_liabilitas_per_akun"
  | "v_buku_besar_ekuitas_per_akun"
  | "v_buku_besar_pendapatan_usaha_per_akun"
  | "v_buku_besar_beban_pokok_pendapatan_per_akun"
  | "v_buku_besar_beban_usaha_per_akun"
  | "v_buku_besar_pendapatan_beban_lain_lain_per_akun"
  | "v_buku_besar_beban_pajak_penghasilan_per_akun";

type BukuBesarFilterKey =
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

interface BukuBesarViewConfig {
  view: BukuBesarViewName;

  kelompok: string;

  filterKey: BukuBesarFilterKey;
}

const LEDGER_FILTER_LABELS: Record<BukuBesarFilterKey, string> = {
  kas: "Kas",

  bank: "Bank",

  piutang: "Piutang",

  "aset-tetap": "Aset Tetap",

  liabilitas: "Liabilitas/Utang",

  ekuitas: "Ekuitas",

  "pendapatan-usaha": "Pendapatan Usaha Bersih",

  "beban-pokok-pendapatan": "Beban Pokok Pendapatan",

  "beban-usaha": "Beban Usaha",

  "pendapatan-beban-lain-lain": "Pendapatan(Beban)(Lain-lain)",

  "beban-pajak-penghasilan": "Beban Pajak Penghasilan",
};

interface BukuBesarViewRow {
  id_jurnal: number | string;

  id_detail: number | string;

  id_coa: number | string;

  id_periode?: number | string | null;

  tanggal: string;

  no_bukti: string | null;

  keterangan: string | null;

  sumber: string | null;

  status?: string | null;

  is_posted?: boolean | null;

  kelompok_buku_besar?: string | null;

  kode_coa: string | null;

  nama_coa: string | null;

  tipe_coa?: string | null;

  tipe?: string | null;

  normal_balance?: string | null;

  debit: number | string | null;

  kredit: number | string | null;

  saldo_berjalan: number | string | null;

  total_debit_berjalan?: number | string | null;

  total_kredit_berjalan?: number | string | null;
}

interface BukuBesarPerAkunRow {
  id_jurnal: number;

  id_detail: number;

  id_coa: number;

  id_periode: number | null;

  tanggal: string;

  no_bukti: string;

  keterangan: string | null;

  sumber: string | null;

  status: string;

  kelompok_buku_besar: string;

  kode_coa: string;

  nama_coa: string;

  tipe_coa: string | null;

  normal_balance: string | null;

  debit: number | string | null;

  kredit: number | string | null;

  saldo_berjalan: number | string | null;
}

interface BukuBesarAccount {
  id_coa: number;

  kode_coa: string;

  nama_coa: string;

  tipe_coa: string;

  normal_balance: string;

  kelompok_buku_besar: string;

  rows: BukuBesarPerAkunRow[];
}

/* ============================================================

   KONFIGURASI 11 VIEW BUKU BESAR

   ============================================================ */

const LEDGER_SOURCES: BukuBesarViewConfig[] = [
  {
    view: "v_buku_besar_kas_per_akun",

    kelompok: "KAS",

    filterKey: "kas",
  },

  {
    view: "v_buku_besar_bank_per_akun",

    kelompok: "BANK",

    filterKey: "bank",
  },

  {
    view: "v_buku_besar_piutang_per_akun",

    kelompok: "PIUTANG",

    filterKey: "piutang",
  },

  {
    view: "v_buku_besar_aset_tetap_per_akun",

    kelompok: "ASET TETAP",

    filterKey: "aset-tetap",
  },

  {
    view: "v_buku_besar_liabilitas_per_akun",

    kelompok: "LIABILITAS / UTANG",

    filterKey: "liabilitas",
  },

  {
    view: "v_buku_besar_ekuitas_per_akun",

    kelompok: "EKUITAS",

    filterKey: "ekuitas",
  },

  {
    view: "v_buku_besar_pendapatan_usaha_per_akun",

    kelompok: "PENDAPATAN USAHA",

    filterKey: "pendapatan-usaha",
  },

  {
    view: "v_buku_besar_beban_pokok_pendapatan_per_akun",

    kelompok: "BEBAN POKOK PENDAPATAN",

    filterKey: "beban-pokok-pendapatan",
  },

  {
    view: "v_buku_besar_beban_usaha_per_akun",

    kelompok: "BEBAN USAHA",

    filterKey: "beban-usaha",
  },

  {
    view: "v_buku_besar_pendapatan_beban_lain_lain_per_akun",

    kelompok: "PENDAPATAN / BEBAN LAIN-LAIN",

    filterKey: "pendapatan-beban-lain-lain",
  },

  {
    view: "v_buku_besar_beban_pajak_penghasilan_per_akun",

    kelompok: "BEBAN PAJAK PENGHASILAN",

    filterKey: "beban-pajak-penghasilan",
  },
];

/* ============================================================

   CONSTANT

   ============================================================ */

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

const COMPANY_NAME = "PT. Haemes Mandiri Sejahterabanta";

const PAGE_SIZE = 1000;

/* ============================================================

   HELPERS

   ============================================================ */

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: string | null | undefined): string {
  return value ?? "";
}

function parseDate(value: string): Date {
  const dateOnly = value.substring(0, 10);

  const parts = dateOnly.split("-");

  if (parts.length === 3) {
    const year = Number(parts[0]);

    const month = Number(parts[1]);

    const day = Number(parts[2]);

    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day)
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Tanggal jurnal tidak valid: ${value}`);
  }

  return parsed;
}

function border(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: "thin" },

    left: { style: "thin" },

    bottom: { style: "thin" },

    right: { style: "thin" },
  };
}

function currency(cell: ExcelJS.Cell): void {
  cell.numFmt = ACCOUNTING_FORMAT;
}

function headerStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,

    color: { argb: "FF000000" },
  };

  cell.alignment = {
    horizontal: "center",

    vertical: "middle",

    wrapText: true,
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FFF4CCCC" },
  };

  border(cell);
}

function totalStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FFD9D9D9" },
  };

  cell.border = {
    top: { style: "thin" },

    bottom: { style: "double" },

    left: { style: "thin" },

    right: { style: "thin" },
  };
}

function sectionStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,

    size: 12,

    color: { argb: "FF000000" },
  };

  cell.alignment = {
    horizontal: "left",

    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FFD9EAD3" },
  };

  cell.border = {
    top: { style: "thin" },

    bottom: { style: "thin" },
  };
}

function sanitizeSheetName(name: string): string {
  const sanitized = name

    .split("")

    .filter((character) => !"\\\\\\\\/*?:[]".includes(character))

    .join("")

    .trim();

  if (sanitized.length === 0) {
    return "BUKU BESAR";
  }

  return sanitized.substring(0, 31);
}

/* ============================================================

   POSTED VALIDATION

   ============================================================ */

function isPostedRow(row: BukuBesarViewRow): boolean {
  if (typeof row.is_posted === "boolean") {
    return row.is_posted;
  }

  if (typeof row.status === "string" && row.status.trim() !== "") {
    return row.status.trim().toUpperCase() === "POSTED";
  }

  /*

   * View khusus yang tidak menyediakan is_posted/status

   * sebelumnya telah dibangun sebagai view jurnal POSTED.

   * Karena itu baris tersebut mengikuti hasil view database.

   */

  return true;
}

/* ============================================================

   NORMALIZE VIEW ROW

   ============================================================ */

function normalizeLedgerRow(
  row: BukuBesarViewRow,

  source: BukuBesarViewConfig,
): BukuBesarPerAkunRow {
  const idJurnal = Number(row.id_jurnal);

  const idDetail = Number(row.id_detail);

  const idCoa = Number(row.id_coa);

  if (
    !Number.isFinite(idJurnal) ||
    !Number.isFinite(idDetail) ||
    !Number.isFinite(idCoa)
  ) {
    throw new Error(
      `Identitas jurnal, detail, atau COA tidak valid pada view ${source.view}.`,
    );
  }

  if (!row.kode_coa || !row.nama_coa) {
    throw new Error(
      `Data COA tidak lengkap pada jurnal ${idJurnal}, view ${source.view}.`,
    );
  }

  const idPeriode =
    row.id_periode === null || row.id_periode === undefined
      ? null
      : Number(row.id_periode);

  const tipeCoa = row.tipe_coa ?? row.tipe ?? null;

  return {
    id_jurnal: idJurnal,

    id_detail: idDetail,

    id_coa: idCoa,

    id_periode:
      idPeriode !== null && Number.isFinite(idPeriode) ? idPeriode : null,

    tanggal: row.tanggal,

    no_bukti: row.no_bukti ?? "",

    keterangan: row.keterangan,

    sumber: row.sumber,

    status: row.status ?? (row.is_posted === false ? "UNPOSTED" : "POSTED"),

    kelompok_buku_besar: row.kelompok_buku_besar ?? source.kelompok,

    kode_coa: row.kode_coa,

    nama_coa: row.nama_coa,

    tipe_coa: tipeCoa,

    normal_balance: row.normal_balance ?? null,

    debit: row.debit,

    kredit: row.kredit,

    saldo_berjalan: row.saldo_berjalan,
  };
}

/* ============================================================

   FETCH ONE VIEW

   Pagination agar data tidak terpotong oleh limit Supabase.

   Saldo berjalan tetap berasal dari SQL VIEW.

   ============================================================ */

async function fetchOneLedgerView(
  source: BukuBesarViewConfig,
): Promise<BukuBesarPerAkunRow[]> {
  let from = 0;

  const allRows: BukuBesarPerAkunRow[] = [];

  while (true) {
    const { data, error } = await db

      .from(source.view)

      .select("*")

      .order("tanggal", { ascending: true })

      .order("id_jurnal", { ascending: true })

      .order("id_detail", { ascending: true })

      .range(from, from + PAGE_SIZE - 1)

      .returns<BukuBesarViewRow[]>();

    if (error) {
      throw new Error(
        `Gagal mengambil data ${source.kelompok} dari ${source.view} pada baris ${from + 1}: ${error.message}`,
      );
    }

    const pageRows = data ?? [];

    for (const row of pageRows) {
      if (!isPostedRow(row)) {
        continue;
      }

      allRows.push(normalizeLedgerRow(row, source));
    }

    if (pageRows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}

/* ============================================================

   FETCH ALL 11 LEDGER VIEWS

   Tidak mengambil v_buku_besar_per_akun agar tidak duplikasi.

   ============================================================ */

async function fetchAllLedgerRows(
  sources: BukuBesarViewConfig[],
): Promise<BukuBesarPerAkunRow[]> {
  const allRows: BukuBesarPerAkunRow[] = [];

  for (const source of sources) {
    const rows = await fetchOneLedgerView(source);

    allRows.push(...rows);
  }

  allRows.sort((a, b) => {
    const dateCompare = a.tanggal.localeCompare(b.tanggal);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    if (a.id_jurnal !== b.id_jurnal) {
      return a.id_jurnal - b.id_jurnal;
    }

    return a.id_detail - b.id_detail;
  });

  return allRows;
}

/* ============================================================

   HITUNG ULANG SALDO BERJALAN PER COA

   Saldo awal tetap berasal dari jurnal POSTED yang sudah ada,
   misalnya JU-20260101-0084 pada tanggal 1 Januari 2026.
   Tidak membuat transaksi saldo awal baru dan tidak mengubah data DB.

   ============================================================ */

function recalculateRunningBalances(
  rows: BukuBesarPerAkunRow[],
): BukuBesarPerAkunRow[] {
  const balances = new Map<number, number>();

  return rows.map((row) => {
    const debit = toNumber(row.debit);
    const kredit = toNumber(row.kredit);
    const normalBalance = (row.normal_balance ?? "").trim().toUpperCase();
    const tipeCoa = (row.tipe_coa ?? "").trim().toUpperCase();

    const isCreditNormal =
      normalBalance === "KREDIT" ||
      (normalBalance !== "DEBIT" &&
        ["LIABILITAS", "KEWAJIBAN", "UTANG", "EKUITAS", "PENDAPATAN"].some(
          (keyword) => tipeCoa.includes(keyword),
        ));

    const movement = isCreditNormal ? kredit - debit : debit - kredit;
    const previousBalance = balances.get(row.id_coa) ?? 0;
    const runningBalance = previousBalance + movement;

    balances.set(row.id_coa, runningBalance);

    return {
      ...row,
      saldo_berjalan: runningBalance,
    };
  });
}

/* ============================================================

   GROUP COA

   ============================================================ */

function groupByAccount(rows: BukuBesarPerAkunRow[]): BukuBesarAccount[] {
  const grouped = new Map<number, BukuBesarAccount>();

  for (const row of rows) {
    let account = grouped.get(row.id_coa);

    if (!account) {
      account = {
        id_coa: row.id_coa,

        kode_coa: row.kode_coa,

        nama_coa: row.nama_coa,

        tipe_coa: toText(row.tipe_coa),

        normal_balance: toText(row.normal_balance),

        kelompok_buku_besar: row.kelompok_buku_besar,

        rows: [],
      };

      grouped.set(row.id_coa, account);
    } else {
      /*

       * Satu COA seharusnya hanya berasal dari satu kelompok view.

       * Jika metadata COA berbeda, jangan diam-diam menggabungkan

       * identitas akun yang tidak konsisten.

       */

      if (
        account.kode_coa !== row.kode_coa ||
        account.nama_coa !== row.nama_coa
      ) {
        throw new Error(
          `Identitas COA tidak konsisten untuk id_coa ${row.id_coa}.`,
        );
      }
    }

    account.rows.push(row);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const codeCompare = a.kode_coa.localeCompare(b.kode_coa);

    if (codeCompare !== 0) {
      return codeCompare;
    }

    return a.id_coa - b.id_coa;
  });
}

/* ============================================================

   TITLE

   ============================================================ */

function createTitle(
  sheet: ExcelJS.Worksheet,

  periode: string,

  printDate: string,
): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "BUKU BESAR PER AKUN";

  sheet.getCell("A1").font = { bold: true, size: 22 };

  sheet.getCell("A1").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:F2");

  sheet.getCell("A2").value = COMPANY_NAME;

  sheet.getCell("A2").font = { bold: true, size: 15 };

  sheet.getCell("A2").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.getRow(2).height = 24;

  sheet.mergeCells("A3:F3");

  sheet.getCell("A3").value = "JASA CUT & FILL DAN PENGURUGAN TANAH";

  sheet.getCell("A3").font = { bold: true, size: 12 };

  sheet.getCell("A3").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.mergeCells("A5:F5");

  sheet.getCell("A5").value = "DIVISI : CORPORATE";

  sheet.getCell("A5").font = { bold: true };

  sheet.mergeCells("A6:F6");

  sheet.getCell("A6").value = `PERIODE : ${periode}`;

  sheet.getCell("A6").font = { bold: true };

  sheet.mergeCells("A7:F7");

  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;

  sheet.getCell("A7").font = { bold: true };

  sheet.mergeCells("A8:F8");

  sheet.getCell("A8").value = "MATA UANG : Rupiah (IDR)";

  sheet.getCell("A8").font = { bold: true };

  sheet.mergeCells("A9:F9");

  sheet.getCell("A9").border = {
    bottom: { style: "double" },
  };

  sheet.views = [
    {
      state: "frozen",

      ySplit: 10,
    },
  ];
}

/* ============================================================

   SIGNATURE

   ============================================================ */

function createSignature(sheet: ExcelJS.Worksheet, startRow: number): void {
  const titleRow = startRow;

  const nameRow = startRow + 4;

  sheet.mergeCells(`A${titleRow}:B${titleRow}`);

  sheet.mergeCells(`C${titleRow}:D${titleRow}`);

  sheet.mergeCells(`E${titleRow}:F${titleRow}`);

  sheet.getCell(`A${titleRow}`).value = "Dibuat Oleh";

  sheet.getCell(`C${titleRow}`).value = "Diperiksa Oleh";

  sheet.getCell(`E${titleRow}`).value = "Disetujui Oleh";

  for (const address of [`A${titleRow}`, `C${titleRow}`, `E${titleRow}`]) {
    const cell = sheet.getCell(address);

    cell.font = {
      bold: true,
    };

    cell.alignment = {
      horizontal: "center",

      vertical: "middle",
    };
  }

  sheet.mergeCells(`A${nameRow}:B${nameRow}`);

  sheet.mergeCells(`C${nameRow}:D${nameRow}`);

  sheet.mergeCells(`E${nameRow}:F${nameRow}`);

  sheet.getCell(`A${nameRow}`).value =
    "(\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_)";

  sheet.getCell(`C${nameRow}`).value =
    "(\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_)";

  sheet.getCell(`E${nameRow}`).value =
    "(\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_)";

  for (const address of [`A${nameRow}`, `C${nameRow}`, `E${nameRow}`]) {
    sheet.getCell(address).alignment = {
      horizontal: "center",

      vertical: "middle",
    };
  }
}

/* ============================================================

   GET

   ============================================================ */

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const tipeParam = searchParams.get("tipe") ?? "all";

    const statusParam = searchParams.get("status") ?? "POSTED";

    const validFilterKeys = new Set<string>([
      "all",

      ...LEDGER_SOURCES.map((source) => source.filterKey),
    ]);

    const validStatuses = new Set<string>(["ALL", "POSTED"]);

    if (!validFilterKeys.has(tipeParam)) {
      return NextResponse.json(
        { message: "Filter tipe Buku Besar Per Akun tidak valid." },

        { status: 400 },
      );
    }

    if (!validStatuses.has(statusParam)) {
      return NextResponse.json(
        { message: "Filter status Buku Besar Per Akun tidak valid." },

        { status: 400 },
      );
    }

    const selectedSources =
      tipeParam === "all"
        ? LEDGER_SOURCES
        : LEDGER_SOURCES.filter((source) => source.filterKey === tipeParam);

    const selectedTypeLabel =
      tipeParam === "all"
        ? "Semua Tipe"
        : LEDGER_FILTER_LABELS[tipeParam as BukuBesarFilterKey];

    // Kedua opsi status menggunakan 11 view sumber yang memang khusus POSTED.

    const selectedStatusLabel =
      statusParam === "ALL" ? "Semua Status (data POSTED)" : "POSTED";

    /* ========================================================

       LOAD 11 DEDICATED LEDGER VIEWS

       ======================================================== */

    const fetchedLedgerData = await fetchAllLedgerRows(selectedSources);

    /*
     * Hitung saldo setelah seluruh transaksi POSTED terkumpul dan terurut.
     * Jurnal saldo awal tanggal 01/01/2026 tetap tampil sebagai transaksi
     * pertama akun; transaksi berikutnya mengubah saldo COA yang sama saja.
     */
    const ledgerData = recalculateRunningBalances(fetchedLedgerData);

    /* ========================================================

       VALIDATE DATA

       ======================================================== */

    for (const row of ledgerData) {
      if (
        !Number.isFinite(row.id_jurnal) ||
        !Number.isFinite(row.id_detail) ||
        !Number.isFinite(row.id_coa)
      ) {
        throw new Error(
          "Ditemukan identitas jurnal, detail, atau COA yang tidak valid.",
        );
      }

      if (!row.kode_coa || !row.nama_coa) {
        throw new Error(`Data COA tidak lengkap pada jurnal ${row.id_jurnal}.`);
      }
    }

    /* ========================================================

       GROUP BY ACCOUNT

       ======================================================== */

    const groupedAccounts = groupByAccount(ledgerData);

    /* ========================================================

       PERIOD INFORMATION

       ======================================================== */

    const periode = `Seluruh Periode - ${selectedTypeLabel} - ${selectedStatusLabel}`;

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",

      month: "long",

      year: "numeric",
    });

    /* ========================================================

       WORKBOOK

       ======================================================== */

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Haemes System App";

    workbook.created = new Date();

    workbook.subject = "Buku Besar Per Akun";

    workbook.title = "Buku Besar Per Akun";

    workbook.company = COMPANY_NAME;

    const sheet = workbook.addWorksheet(
      sanitizeSheetName("BUKU BESAR PER AKUN"),
    );

    createTitle(sheet, periode, printDate);

    sheet.columns = [
      { width: 15 },

      { width: 20 },

      { width: 42 },

      { width: 20 },

      { width: 20 },

      { width: 23 },
    ];

    /* ========================================================

       DATA START

       ======================================================== */

    let rowNumber = 12;

    /* ========================================================

       ACCOUNT DATA

       ======================================================== */

    for (const account of groupedAccounts) {
      if (account.rows.length === 0) {
        continue;
      }

      /* ACCOUNT HEADER */

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `${account.kode_coa} - ${account.nama_coa}`;

      sectionStyle(sheet.getCell(`A${rowNumber}`));

      rowNumber++;

      /* ACCOUNT CLASSIFICATION */

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `Kelompok: ${account.kelompok_buku_besar} | Tipe COA: ${
          account.tipe_coa || "-"
        } | Saldo Normal: ${account.normal_balance || "-"}`;

      sheet.getCell(`A${rowNumber}`).font = {
        italic: true,

        color: { argb: "FF666666" },
      };

      rowNumber++;

      /* TABLE HEADER */

      const headerRow = sheet.getRow(rowNumber);

      headerRow.values = [
        "Tanggal",

        "Voucher",

        "Keterangan",

        "Debit",

        "Kredit",

        "Saldo Berjalan",
      ];

      for (let col = 1; col <= 6; col++) {
        headerStyle(sheet.getCell(rowNumber, col));
      }

      rowNumber++;

      /* TRANSACTIONS */

      let totalDebit = 0;

      let totalKredit = 0;

      let saldoAkhir = 0;

      for (const row of account.rows) {
        const debit = toNumber(row.debit);

        const kredit = toNumber(row.kredit);

        const saldoBerjalan = toNumber(row.saldo_berjalan);

        totalDebit += debit;

        totalKredit += kredit;

        saldoAkhir = saldoBerjalan;

        const dateCell = sheet.getCell(`A${rowNumber}`);

        dateCell.value = parseDate(row.tanggal);

        dateCell.numFmt = "dd/mm/yyyy";

        const voucherCell = sheet.getCell(`B${rowNumber}`);

        voucherCell.value = String(row.no_bukti ?? "");

        voucherCell.numFmt = "@";

        voucherCell.alignment = {
          horizontal: "left",

          vertical: "middle",
        };

        voucherCell.font = {
          color: { argb: "FF000000" },
        };

        sheet.getCell(`C${rowNumber}`).value = toText(row.keterangan);

        sheet.getCell(`D${rowNumber}`).value = debit;

        sheet.getCell(`E${rowNumber}`).value = kredit;

        sheet.getCell(`F${rowNumber}`).value = saldoBerjalan;

        currency(sheet.getCell(`D${rowNumber}`));

        currency(sheet.getCell(`E${rowNumber}`));

        currency(sheet.getCell(`F${rowNumber}`));

        for (let col = 1; col <= 6; col++) {
          border(sheet.getCell(rowNumber, col));
        }

        rowNumber++;
      }

      /* ACCOUNT TOTAL */

      sheet.getCell(`A${rowNumber}`).value = "TOTAL AKUN";

      sheet.getCell(`D${rowNumber}`).value = totalDebit;

      sheet.getCell(`E${rowNumber}`).value = totalKredit;

      sheet.getCell(`F${rowNumber}`).value = saldoAkhir;

      for (const address of [
        `A${rowNumber}`,

        `D${rowNumber}`,

        `E${rowNumber}`,

        `F${rowNumber}`,
      ]) {
        totalStyle(sheet.getCell(address));
      }

      currency(sheet.getCell(`D${rowNumber}`));

      currency(sheet.getCell(`E${rowNumber}`));

      currency(sheet.getCell(`F${rowNumber}`));

      rowNumber += 2;
    }

    /* ========================================================

       GRAND TOTAL

       Debit dan kredit boleh dijumlahkan secara keseluruhan.

       Saldo akhir lintas akun tidak dijumlahkan karena

       normal balance akun debit dan kredit berbeda.

       ======================================================== */

    if (ledgerData.length > 0) {
      const grandTotalDebit = ledgerData.reduce(
        (sum, row) => sum + toNumber(row.debit),

        0,
      );

      const grandTotalKredit = ledgerData.reduce(
        (sum, row) => sum + toNumber(row.kredit),

        0,
      );

      const totalJurnal = new Set(ledgerData.map((row) => row.id_jurnal)).size;

      sheet.mergeCells(`A${rowNumber}:C${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `TOTAL KESELURUHAN (${totalJurnal} Jurnal / ${ledgerData.length} Detail)`;

      sheet.getCell(`D${rowNumber}`).value = grandTotalDebit;

      sheet.getCell(`E${rowNumber}`).value = grandTotalKredit;

      sheet.getCell(`F${rowNumber}`).value = "Saldo dihitung per akun";

      for (const address of [
        `A${rowNumber}`,

        `D${rowNumber}`,

        `E${rowNumber}`,

        `F${rowNumber}`,
      ]) {
        totalStyle(sheet.getCell(address));
      }

      currency(sheet.getCell(`D${rowNumber}`));

      currency(sheet.getCell(`E${rowNumber}`));

      rowNumber += 2;
    }

    /* ========================================================

       EMPTY DATA

       ======================================================== */

    if (ledgerData.length === 0) {
      sheet.mergeCells("A12:F12");

      sheet.getCell("A12").value =
        "Belum terdapat transaksi jurnal POSTED pada 11 kelompok buku besar.";

      sheet.getCell("A12").alignment = {
        horizontal: "center",

        vertical: "middle",
      };

      sheet.getCell("A12").font = {
        italic: true,

        color: { argb: "FF666666" },
      };

      rowNumber = 13;
    }

    /* ========================================================

       SIGNATURE

       ======================================================== */

    const signatureStartRow = rowNumber + 1;

    createSignature(sheet, signatureStartRow);

    /* ========================================================

       PAGE SETUP

       ======================================================== */

    sheet.pageSetup.orientation = "landscape";

    sheet.pageSetup.fitToPage = true;

    sheet.pageSetup.fitToWidth = 1;

    sheet.pageSetup.fitToHeight = 0;

    sheet.pageSetup.paperSize = 9;

    sheet.pageSetup.margins = {
      left: 0.25,

      right: 0.25,

      top: 0.5,

      bottom: 0.5,

      header: 0.2,

      footer: 0.2,
    };

    sheet.pageSetup.printArea = `A1:F${rowNumber + 6}`;

    sheet.properties.defaultRowHeight = 18;

    /* ========================================================

       AUTO WIDTH

       ======================================================== */

    sheet.columns.forEach((column): void => {
      let maxLength = 0;

      column.eachCell?.(
        {
          includeEmpty: true,
        },

        (cell): void => {
          const value = cell.value?.toString() ?? "";

          maxLength = Math.max(maxLength, value.length);
        },
      );

      column.width = Math.min(Math.max(maxLength + 3, 12), 60);
    });

    /* ========================================================

       QR CODE

       ======================================================== */

    const totalDebit = ledgerData.reduce(
      (sum, row) => sum + toNumber(row.debit),

      0,
    );

    const qrText = generateQRCodeValue({
      id: ledgerData[0]?.id_jurnal ?? 0,

      sumber_modul: "BUKU_BESAR_PER_AKUN",

      nilai_transaksi: totalDebit,

      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrText);

    const imageId = workbook.addImage({
      base64: qrImage,

      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 7,

        row: 0,
      },

      ext: {
        width: 90,

        height: 90,
      },
    });

    /* ========================================================

       EXPORT

       ======================================================== */

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="buku-besar-per-akun.xlsx"',

        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("BUKU BESAR PER AKUN ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },

      {
        status: 500,
      },
    );
  }
}
