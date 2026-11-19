import { NextResponse } from "next/server";

import ExcelJS from "exceljs";

import { db } from "@/lib/supabase/server";

/* =========================================================

   REPORT BUKU BESAR PENDAPATAN USAHA

   Sumber tunggal:

   public.v_buku_besar_pendapatan_usaha_per_akun



   View tersebut sudah membatasi jurnal POSTED dan menghitung

   saldo berjalan sesuai normal_balance. Route ini hanya membaca.

   Tidak ada INSERT, UPDATE, DELETE, RPC mutasi, atau perubahan SQL.

========================================================= */

interface PeriodeRow {
  id_periode: number;

  nama_periode: string;

  status: string;

  tanggal_mulai: string;

  tanggal_selesai: string;

  is_closed: boolean;
}

interface PendapatanUsahaViewRow {
  id_jurnal: number | string;

  id_detail: number | string;

  tanggal: string;

  no_bukti: string | null;

  sumber: string | null;

  id_periode: number | string | null;

  keterangan: string | null;

  id_coa: number | string;

  kode_coa: string | null;

  nama_coa: string | null;

  tipe: string | null;

  normal_balance: string | null;

  debit: number | string | null;

  kredit: number | string | null;

  total_debit_berjalan: number | string | null;

  total_kredit_berjalan: number | string | null;

  saldo_berjalan: number | string | null;

  is_posted: boolean | null;

  status?: string | null;
}

interface PendapatanUsahaDetail {
  id_jurnal: number;

  id_detail: number;

  tanggal: string;

  no_bukti: string;

  sumber: string | null;

  id_periode: number | null;

  keterangan: string;

  debit: number;

  kredit: number;

  saldo_berjalan: number;

  status: "POSTED";
}

interface PendapatanUsahaAccount {
  id_coa: number;

  kode_coa: string;

  nama_coa: string;

  tipe: string;

  normal_balance: string;

  saldo_awal: number;

  total_debit: number;

  total_kredit: number;

  saldo_akhir: number;

  jumlah_detail: number;

  rows: PendapatanUsahaDetail[];
}

interface NormalizedRow {
  id_jurnal: number;

  id_detail: number;

  id_coa: number;

  tanggal: string;

  no_bukti: string;

  sumber: string | null;

  id_periode: number | null;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  tipe: string;

  normal_balance: string;

  debit: number;

  kredit: number;

  total_debit_berjalan: number;

  total_kredit_berjalan: number;

  saldo_berjalan: number;
}

const COMPANY_NAME = "PT. Haemes Mandiri Sejahterabanta";

const VIEW_NAME = "v_buku_besar_pendapatan_usaha_per_akun";

const PAGE_SIZE = 1000;

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]\("Rp" #,##0)';

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()

    .toUpperCase();
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function getNextDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Tanggal laporan tidak valid: ${value}`);
  }

  parsed.setUTCDate(parsed.getUTCDate() + 1);

  return parsed.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",

    month: "2-digit",

    year: "numeric",

    timeZone: "UTC",
  });
}

function normalizeViewRow(row: PendapatanUsahaViewRow): NormalizedRow | null {
  const idJurnal = Number(row.id_jurnal);

  const idDetail = Number(row.id_detail);

  const idCoa = Number(row.id_coa);

  if (
    !Number.isInteger(idJurnal) ||
    idJurnal <= 0 ||
    !Number.isInteger(idDetail) ||
    idDetail <= 0 ||
    !Number.isInteger(idCoa) ||
    idCoa <= 0 ||
    !row.kode_coa ||
    !row.nama_coa ||
    !isValidDate(String(row.tanggal).slice(0, 10))
  ) {
    return null;
  }

  // View SQL yang diberikan user memang hanya mengambil jurnal POSTED.

  // Tetap validasi flag/status jika kolom tersedia pada hasil view.

  if (row.is_posted === false) return null;

  if (
    typeof row.status === "string" &&
    row.status.trim() !== "" &&
    normalizeText(row.status) !== "POSTED"
  ) {
    return null;
  }

  return {
    id_jurnal: idJurnal,

    id_detail: idDetail,

    id_coa: idCoa,

    tanggal: String(row.tanggal).slice(0, 10),

    no_bukti: String(row.no_bukti ?? ""),

    sumber: row.sumber ?? null,

    id_periode: toNullableNumber(row.id_periode),

    keterangan: String(row.keterangan ?? ""),

    kode_coa: row.kode_coa,

    nama_coa: row.nama_coa,

    tipe: String(row.tipe ?? "PENDAPATAN"),

    normal_balance: String(row.normal_balance ?? "KREDIT"),

    debit: toNumber(row.debit),

    kredit: toNumber(row.kredit),

    total_debit_berjalan: toNumber(row.total_debit_berjalan),

    total_kredit_berjalan: toNumber(row.total_kredit_berjalan),

    saldo_berjalan: toNumber(row.saldo_berjalan),
  };
}

async function fetchPendapatanUsahaRows(
  tanggalSelesai: string,
): Promise<NormalizedRow[]> {
  const result: NormalizedRow[] = [];

  let offset = 0;

  while (true) {
    const { data, error } = await db

      .from(VIEW_NAME)

      .select(
        `

        id_jurnal,

        id_detail,

        tanggal,

        no_bukti,

        sumber,

        id_periode,

        keterangan,

        id_coa,

        kode_coa,

        nama_coa,

        tipe,

        normal_balance,

        debit,

        kredit,

        total_debit_berjalan,

        total_kredit_berjalan,

        saldo_berjalan,

        is_posted

      `,
      )

      .lte("tanggal", tanggalSelesai)

      .order("tanggal", { ascending: true })

      .order("id_jurnal", { ascending: true })

      .order("id_detail", { ascending: true })

      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Gagal mengambil ${VIEW_NAME}: ${error.message}`);
    }

    const page = (data ?? []) as PendapatanUsahaViewRow[];

    for (const sourceRow of page) {
      const row = normalizeViewRow(sourceRow);

      if (row) result.push(row);
    }

    if (page.length < PAGE_SIZE) break;

    offset += PAGE_SIZE;
  }

  return result;
}

function buildAccounts(
  allRowsThroughEndDate: NormalizedRow[],

  tanggalMulai: string,
): PendapatanUsahaAccount[] {
  const map = new Map<
    number,
    {
      latestBeforeStart: NormalizedRow | null;

      latestThroughEnd: NormalizedRow | null;

      periodRows: NormalizedRow[];

      metadata: NormalizedRow;
    }
  >();

  for (const row of allRowsThroughEndDate) {
    const current = map.get(row.id_coa);

    if (!current) {
      map.set(row.id_coa, {
        latestBeforeStart: row.tanggal < tanggalMulai ? row : null,

        latestThroughEnd: row,

        periodRows: row.tanggal >= tanggalMulai ? [row] : [],

        metadata: row,
      });

      continue;
    }

    current.latestThroughEnd = row;

    current.metadata = row;

    if (row.tanggal < tanggalMulai) {
      current.latestBeforeStart = row;
    } else {
      current.periodRows.push(row);
    }
  }

  const accounts: PendapatanUsahaAccount[] = [];

  for (const [idCoa, item] of map) {
    const openingBalance = item.latestBeforeStart
      ? item.latestBeforeStart.saldo_berjalan
      : 0;

    const endingBalance = item.latestThroughEnd
      ? item.latestThroughEnd.saldo_berjalan
      : openingBalance;

    const rows: PendapatanUsahaDetail[] = item.periodRows.map((row) => ({
      id_jurnal: row.id_jurnal,

      id_detail: row.id_detail,

      tanggal: row.tanggal,

      no_bukti: row.no_bukti,

      sumber: row.sumber,

      id_periode: row.id_periode,

      keterangan: row.keterangan,

      debit: row.debit,

      kredit: row.kredit,

      saldo_berjalan: row.saldo_berjalan,

      status: "POSTED",
    }));

    accounts.push({
      id_coa: idCoa,

      kode_coa: item.metadata.kode_coa,

      nama_coa: item.metadata.nama_coa,

      tipe: item.metadata.tipe,

      normal_balance: item.metadata.normal_balance,

      saldo_awal: openingBalance,

      total_debit: rows.reduce((total, row) => total + row.debit, 0),

      total_kredit: rows.reduce((total, row) => total + row.kredit, 0),

      saldo_akhir: endingBalance,

      jumlah_detail: rows.length,

      rows,
    });
  }

  return accounts.sort((a, b) =>
    a.kode_coa.localeCompare(b.kode_coa, "id", { numeric: true }),
  );
}

function getTotals(accounts: PendapatanUsahaAccount[]) {
  return {
    jumlah_akun: accounts.length,

    jumlah_detail: accounts.reduce(
      (sum, account) => sum + account.jumlah_detail,

      0,
    ),

    jumlah_jurnal: new Set(
      accounts.flatMap((account) => account.rows.map((row) => row.id_jurnal)),
    ).size,

    total_saldo_awal: accounts.reduce(
      (sum, account) => sum + account.saldo_awal,

      0,
    ),

    total_debit_periode: accounts.reduce(
      (sum, account) => sum + account.total_debit,

      0,
    ),

    total_kredit_periode: accounts.reduce(
      (sum, account) => sum + account.total_kredit,

      0,
    ),

    // Saldo akhir lintas akun tidak dijumlahkan sebagai angka akuntansi

    // karena masing-masing akun dapat memiliki normal balance berbeda.
  };
}

function border(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: "thin" },

    left: { style: "thin" },

    bottom: { style: "thin" },

    right: { style: "thin" },
  };
}

function styleHeader(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: "FF000000" } };

  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FFF4CCCC" },
  };

  border(cell);
}

function styleSection(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 12 };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FFD9EAD3" },
  };

  border(cell);
}

function styleTotal(cell: ExcelJS.Cell): void {
  cell.font = { bold: true };

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

function createWorkbook(
  accounts: PendapatanUsahaAccount[],

  tanggalMulai: string,

  tanggalSelesai: string,

  periodeName: string,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Haemes System App";

  workbook.company = COMPANY_NAME;

  workbook.subject = "Laporan Buku Besar Pendapatan Usaha";

  workbook.title = "Laporan Buku Besar Pendapatan Usaha";

  workbook.created = new Date();

  const summary = workbook.addWorksheet("Ringkasan Pendapatan Usaha");

  summary.columns = [
    { width: 18 },

    { width: 38 },

    { width: 18 },

    { width: 20 },

    { width: 20 },

    { width: 22 },

    { width: 16 },
  ];

  summary.mergeCells("A1:G1");

  summary.getCell("A1").value = "LAPORAN BUKU BESAR PENDAPATAN USAHA";

  summary.getCell("A1").font = { bold: true, size: 18 };

  summary.getCell("A1").alignment = { horizontal: "center" };

  summary.mergeCells("A2:G2");

  summary.getCell("A2").value = COMPANY_NAME;

  summary.getCell("A2").font = { bold: true, size: 14 };

  summary.getCell("A2").alignment = { horizontal: "center" };

  summary.getCell("A4").value = `Periode: ${periodeName}`;

  summary.getCell("A5").value =
    `Rentang transaksi: ${formatDate(tanggalMulai)} s/d ${formatDate(tanggalSelesai)}`;

  summary.getCell("A6").value =
    `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`;

  summary.getCell("A7").value =
    "Sumber: public.v_buku_besar_pendapatan_usaha_per_akun (jurnal POSTED)";

  const headers = [
    "Kode COA",

    "Nama Akun",

    "Saldo Normal",

    "Saldo Awal",

    "Total Debit",

    "Total Kredit",

    "Saldo Akhir",
  ];

  summary.getRow(9).values = headers;

  for (let col = 1; col <= headers.length; col++)
    styleHeader(summary.getCell(9, col));

  let rowIndex = 10;

  for (const account of accounts) {
    const row = summary.getRow(rowIndex);

    row.values = [
      account.kode_coa,

      account.nama_coa,

      account.normal_balance,

      account.saldo_awal,

      account.total_debit,

      account.total_kredit,

      account.saldo_akhir,
    ];

    for (let col = 4; col <= 7; col++) {
      summary.getCell(rowIndex, col).numFmt = ACCOUNTING_FORMAT;

      border(summary.getCell(rowIndex, col));
    }

    for (let col = 1; col <= 3; col++) border(summary.getCell(rowIndex, col));

    rowIndex++;
  }

  if (accounts.length > 0) {
    summary.getCell(rowIndex, 1).value = "TOTAL MUTASI PERIODE";

    summary.getCell(rowIndex, 5).value = accounts.reduce(
      (sum, account) => sum + account.total_debit,

      0,
    );

    summary.getCell(rowIndex, 6).value = accounts.reduce(
      (sum, account) => sum + account.total_kredit,

      0,
    );

    for (const col of [1, 5, 6]) styleTotal(summary.getCell(rowIndex, col));

    summary.getCell(rowIndex, 5).numFmt = ACCOUNTING_FORMAT;

    summary.getCell(rowIndex, 6).numFmt = ACCOUNTING_FORMAT;
  }

  summary.views = [{ state: "frozen", ySplit: 9 }];

  summary.autoFilter = { from: "A9", to: "G9" };

  for (const account of accounts) {
    const safeName =
      `${account.kode_coa}-${account.nama_coa}`

        .replace(/[\\\/*?:[\\]]/g, "")

        .trim()

        .slice(0, 31) || `COA-${account.id_coa}`;

    const sheetName = safeName.slice(0, 31);

    const detail = workbook.addWorksheet(
      workbook.getWorksheet(sheetName)
        ? `${sheetName.slice(0, 25)}-${account.id_coa}`
        : sheetName,
    );

    detail.columns = [
      { width: 15 },

      { width: 22 },

      { width: 44 },

      { width: 20 },

      { width: 20 },

      { width: 23 },
    ];

    detail.mergeCells("A1:F1");

    detail.getCell("A1").value = `${account.kode_coa} - ${account.nama_coa}`;

    detail.getCell("A1").font = { bold: true, size: 16 };

    detail.mergeCells("A2:F2");

    detail.getCell("A2").value = COMPANY_NAME;

    detail.getCell("A2").font = { bold: true, size: 12 };

    detail.getCell("A4").value = `Periode: ${periodeName}`;

    detail.getCell("A5").value =
      `Rentang: ${formatDate(tanggalMulai)} s/d ${formatDate(tanggalSelesai)}`;

    detail.getCell("A6").value = `Saldo awal: ${account.saldo_awal}`;

    detail.getCell("A6").numFmt = ACCOUNTING_FORMAT;

    detail.getCell("A7").value = `Saldo akhir: ${account.saldo_akhir}`;

    detail.getCell("A7").numFmt = ACCOUNTING_FORMAT;

    const detailHeaders = [
      "Tanggal",

      "Voucher",

      "Keterangan",

      "Debit",

      "Kredit",

      "Saldo Berjalan",
    ];

    detail.getRow(9).values = detailHeaders;

    for (let col = 1; col <= detailHeaders.length; col++) {
      styleHeader(detail.getCell(9, col));
    }

    let detailRow = 10;

    for (const item of account.rows) {
      const dateCell = detail.getCell(detailRow, 1);

      dateCell.value = new Date(`${item.tanggal}T00:00:00.000Z`);

      dateCell.numFmt = "dd/mm/yyyy";

      detail.getCell(detailRow, 2).value = item.no_bukti;

      detail.getCell(detailRow, 3).value = item.keterangan;

      detail.getCell(detailRow, 4).value = item.debit;

      detail.getCell(detailRow, 5).value = item.kredit;

      detail.getCell(detailRow, 6).value = item.saldo_berjalan;

      for (let col = 1; col <= 6; col++) border(detail.getCell(detailRow, col));

      for (const col of [4, 5, 6]) {
        detail.getCell(detailRow, col).numFmt = ACCOUNTING_FORMAT;
      }

      detailRow++;
    }

    detail.getCell(detailRow, 1).value = "TOTAL AKUN";

    detail.getCell(detailRow, 4).value = account.total_debit;

    detail.getCell(detailRow, 5).value = account.total_kredit;

    detail.getCell(detailRow, 6).value = account.saldo_akhir;

    for (const col of [1, 4, 5, 6]) styleTotal(detail.getCell(detailRow, col));

    for (const col of [4, 5, 6])
      detail.getCell(detailRow, col).numFmt = ACCOUNTING_FORMAT;

    detail.views = [{ state: "frozen", ySplit: 9 }];
  }

  return workbook;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    const { data: periodData, error: periodError } = await db

      .from("periode")

      .select(
        `

        id_periode,

        nama_periode,

        status,

        tanggal_mulai,

        tanggal_selesai,

        is_closed

      `,
      )

      .eq("status", "OPEN")

      .eq("is_closed", false)

      .order("tanggal_mulai", { ascending: false })

      .limit(1);

    if (periodError) {
      return NextResponse.json(
        { error: `Gagal mengambil periode OPEN: ${periodError.message}` },

        { status: 500 },
      );
    }

    const periods = (periodData ?? []) as PeriodeRow[];

    const openPeriod = periods[0];

    if (!openPeriod) {
      return NextResponse.json(
        {
          error:
            "Periode OPEN tidak ditemukan untuk menentukan rentang laporan.",
        },

        { status: 409 },
      );
    }

    if (
      !isValidDate(openPeriod.tanggal_mulai) ||
      !isValidDate(openPeriod.tanggal_selesai)
    ) {
      return NextResponse.json(
        { error: `Tanggal periode ${openPeriod.nama_periode} tidak valid.` },

        { status: 422 },
      );
    }

    const startParam = url.searchParams.get("tanggal_mulai")?.trim();

    const endParam = url.searchParams.get("tanggal_selesai")?.trim();

    const tanggalMulai =
      startParam && isValidDate(startParam)
        ? startParam
        : openPeriod.tanggal_mulai;

    const tanggalSelesai =
      endParam && isValidDate(endParam) ? endParam : openPeriod.tanggal_selesai;

    if (tanggalMulai > tanggalSelesai) {
      return NextResponse.json(
        {
          error: "Tanggal mulai tidak boleh lebih besar dari tanggal selesai.",
        },

        { status: 400 },
      );
    }

    const allRows = await fetchPendapatanUsahaRows(tanggalSelesai);

    const accounts = buildAccounts(allRows, tanggalMulai);

    const totals = getTotals(accounts);

    const mode = normalizeText(url.searchParams.get("mode"));

    if (mode === "VIEW" || mode === "PREVIEW" || mode === "JSON") {
      return NextResponse.json(
        {
          success: true,

          report: "BUKU_BESAR_PENDAPATAN_USAHA",

          company: COMPANY_NAME,

          periode: {
            id_periode: openPeriod.id_periode,

            nama_periode: openPeriod.nama_periode,

            status: openPeriod.status,

            tanggal_mulai: tanggalMulai,

            tanggal_selesai: tanggalSelesai,
          },

          generated_at: new Date().toISOString(),

          currency: "IDR",

          totals,

          accounts,

          metadata: {
            sumber_data: VIEW_NAME,

            status_jurnal: "POSTED",

            jumlah_baris_sumber_sampai_tanggal_akhir: allRows.length,

            jumlah_akun: accounts.length,

            jumlah_detail_periode: totals.jumlah_detail,

            catatan_saldo:
              "Saldo awal diambil dari saldo_berjalan terakhir sebelum tanggal mulai; saldo akhir mengikuti saldo_berjalan terakhir sampai tanggal selesai dari view database.",
          },
        },

        {
          status: 200,

          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    const workbook = createWorkbook(
      accounts,

      tanggalMulai,

      tanggalSelesai,

      openPeriod.nama_periode,
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="laporan-buku-besar-pendapatan-usaha.xlsx"',

        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("REPORT BUKU BESAR PENDAPATAN USAHA API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat laporan buku besar pendapatan usaha.",
      },

      { status: 500 },
    );
  }
}
