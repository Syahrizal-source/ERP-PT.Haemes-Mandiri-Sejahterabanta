import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { db } from "@/lib/supabase/server";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";

interface PiutangViewRow {
  id_jurnal: number | string;
  id_detail: number | string;
  id_periode?: number | string | null;
  id_coa: number | string;
  tanggal: string;
  no_bukti: string | null;
  keterangan: string | null;
  sumber?: string | null;
  status?: string | null;
  is_posted?: boolean | null;
  kelompok_buku_besar?: string | null;
  kode_coa: string;
  nama_coa: string;
  tipe_coa?: string | null;
  debit: number | string | null;
  kredit: number | string | null;
  saldo_berjalan: number | string | null;
}

interface PiutangLedgerRow {
  id_jurnal: number;
  id_detail: number;
  id_periode: number | null;
  id_coa: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: string;
  status: string;
  kelompok_buku_besar: string;
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  debit: number;
  kredit: number;
  saldo_berjalan: number;
}

interface PiutangAccount {
  id_coa: number;
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  rows: PiutangLedgerRow[];
}

const PAGE_SIZE = 1000;
const COMPANY_NAME = "PT. Haemes Mandiri Sejahterabanta";
const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]\\("Rp" #,##0)';

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
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

function sanitizeSheetName(name: string): string {
  const sanitized = name
    .split("")
    .filter((character) => !"\\/*?:[]".includes(character))
    .join("")
    .trim();

  return (sanitized || "BUKU BESAR PIUTANG").substring(0, 31);
}

function applyBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

function applyCurrency(cell: ExcelJS.Cell): void {
  cell.numFmt = ACCOUNTING_FORMAT;
}

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: "FF000000" } };
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
  applyBorder(cell);
}

function applySectionStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 12, color: { argb: "FF000000" } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
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

function applyTotalStyle(cell: ExcelJS.Cell): void {
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

function createTitle(sheet: ExcelJS.Worksheet, printDate: string): void {
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "BUKU BESAR PIUTANG PER AKUN";
  sheet.getCell("A1").font = { bold: true, size: 22 };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = COMPANY_NAME;
  sheet.getCell("A2").font = { bold: true, size: 15 };
  sheet.getCell("A2").alignment = { horizontal: "center" };
  sheet.getRow(2).height = 24;

  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value = "BUKU BESAR PIUTANG - JURNAL POSTED";
  sheet.getCell("A3").font = { bold: true, size: 12 };
  sheet.getCell("A3").alignment = { horizontal: "center" };

  sheet.mergeCells("A5:F5");
  sheet.getCell("A5").value = "DIVISI : CORPORATE";
  sheet.getCell("A5").font = { bold: true };

  sheet.mergeCells("A6:F6");
  sheet.getCell("A6").value = "PERIODE : SELURUH PERIODE";
  sheet.getCell("A6").font = { bold: true };

  sheet.mergeCells("A7:F7");
  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;
  sheet.getCell("A7").font = { bold: true };

  sheet.mergeCells("A8:F8");
  sheet.getCell("A8").value = "MATA UANG : Rupiah (IDR)";
  sheet.getCell("A8").font = { bold: true };

  sheet.mergeCells("A9:F9");
  sheet.getCell("A9").border = { bottom: { style: "double" } };
  sheet.views = [{ state: "frozen", ySplit: 11 }];
}

function createSignature(sheet: ExcelJS.Worksheet, startRow: number): void {
  const nameRow = startRow + 4;

  sheet.mergeCells(`A${startRow}:B${startRow}`);
  sheet.mergeCells(`C${startRow}:D${startRow}`);
  sheet.mergeCells(`E${startRow}:F${startRow}`);

  sheet.getCell(`A${startRow}`).value = "Dibuat Oleh";
  sheet.getCell(`C${startRow}`).value = "Diperiksa Oleh";
  sheet.getCell(`E${startRow}`).value = "Disetujui Oleh";

  for (const address of [`A${startRow}`, `C${startRow}`, `E${startRow}`]) {
    const cell = sheet.getCell(address);
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  sheet.mergeCells(`A${nameRow}:B${nameRow}`);
  sheet.mergeCells(`C${nameRow}:D${nameRow}`);
  sheet.mergeCells(`E${nameRow}:F${nameRow}`);

  for (const address of [`A${nameRow}`, `C${nameRow}`, `E${nameRow}`]) {
    sheet.getCell(address).value = "(____________________)";
    sheet.getCell(address).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }
}

function isPostedRow(row: PiutangViewRow): boolean {
  if (typeof row.is_posted === "boolean") return row.is_posted;

  if (typeof row.status === "string" && row.status.trim() !== "") {
    return row.status.trim().toUpperCase() === "POSTED";
  }

  // View ini secara SQL memang hanya mengambil jurnal dengan is_posted = true.
  return true;
}

function normalizeRow(row: PiutangViewRow): PiutangLedgerRow {
  const idJurnal = Number(row.id_jurnal);
  const idDetail = Number(row.id_detail);
  const idCoa = Number(row.id_coa);

  if (
    !Number.isFinite(idJurnal) ||
    !Number.isFinite(idDetail) ||
    !Number.isFinite(idCoa)
  ) {
    throw new Error(
      "Identitas jurnal, detail, atau COA tidak valid pada view piutang.",
    );
  }

  if (!row.kode_coa || !row.nama_coa) {
    throw new Error(
      `Data COA tidak lengkap pada jurnal ${idJurnal}, detail ${idDetail}.`,
    );
  }

  const idPeriode =
    row.id_periode === null || row.id_periode === undefined
      ? null
      : Number(row.id_periode);

  return {
    id_jurnal: idJurnal,
    id_detail: idDetail,
    id_periode:
      idPeriode !== null && Number.isFinite(idPeriode) ? idPeriode : null,
    id_coa: idCoa,
    tanggal: row.tanggal,
    no_bukti: row.no_bukti ?? "",
    keterangan: row.keterangan ?? "",
    sumber: row.sumber ?? "",
    status: row.status ?? "POSTED",
    kelompok_buku_besar: row.kelompok_buku_besar ?? "Piutang",
    kode_coa: row.kode_coa,
    nama_coa: row.nama_coa,
    tipe_coa: row.tipe_coa ?? "ASET",
    debit: toNumber(row.debit),
    kredit: toNumber(row.kredit),
    saldo_berjalan: toNumber(row.saldo_berjalan),
  };
}

async function fetchPiutangRows(): Promise<PiutangLedgerRow[]> {
  let from = 0;
  const allRows: PiutangLedgerRow[] = [];

  while (true) {
    const { data, error } = await db
      .from("v_buku_besar_piutang_per_akun")
      .select("*")
      .order("tanggal", { ascending: true })
      .order("id_jurnal", { ascending: true })
      .order("id_detail", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<PiutangViewRow[]>();

    if (error) {
      throw new Error(
        `Gagal mengambil Buku Besar Piutang dari v_buku_besar_piutang_per_akun pada baris ${from + 1}: ${error.message}`,
      );
    }

    const pageRows = data ?? [];
    for (const row of pageRows) {
      if (!isPostedRow(row)) continue;
      allRows.push(normalizeRow(row));
    }

    if (pageRows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  allRows.sort((a, b) => {
    const dateCompare = a.tanggal.localeCompare(b.tanggal);
    if (dateCompare !== 0) return dateCompare;
    if (a.id_jurnal !== b.id_jurnal) {
      return a.id_jurnal - b.id_jurnal;
    }
    return a.id_detail - b.id_detail;
  });

  return allRows;
}

function recalculateRunningBalances(
  rows: PiutangLedgerRow[],
): PiutangLedgerRow[] {
  const balances = new Map<number, number>();

  return rows.map((row) => {
    // Seluruh akun yang lolos view piutang merupakan akun aset/piutang
    // dengan saldo normal debit: debit dikurangi kredit.
    const movement = row.debit - row.kredit;
    const previousBalance = balances.get(row.id_coa) ?? 0;
    const runningBalance = previousBalance + movement;
    balances.set(row.id_coa, runningBalance);

    return { ...row, saldo_berjalan: runningBalance };
  });
}

function groupByAccount(rows: PiutangLedgerRow[]): PiutangAccount[] {
  const grouped = new Map<number, PiutangAccount>();

  for (const row of rows) {
    let account = grouped.get(row.id_coa);

    if (!account) {
      account = {
        id_coa: row.id_coa,
        kode_coa: row.kode_coa,
        nama_coa: row.nama_coa,
        tipe_coa: row.tipe_coa,
        rows: [],
      };
      grouped.set(row.id_coa, account);
    } else if (
      account.kode_coa !== row.kode_coa ||
      account.nama_coa !== row.nama_coa
    ) {
      throw new Error(
        `Identitas COA tidak konsisten untuk id_coa ${row.id_coa}.`,
      );
    }

    account.rows.push(row);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const codeCompare = a.kode_coa.localeCompare(b.kode_coa);
    return codeCompare !== 0 ? codeCompare : a.id_coa - b.id_coa;
  });
}

export async function GET(): Promise<Response> {
  try {
    const fetchedRows = await fetchPiutangRows();
    const ledgerRows = recalculateRunningBalances(fetchedRows);
    const groupedAccounts = groupByAccount(ledgerRows);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Haemes System App";
    workbook.created = new Date();
    workbook.subject = "Buku Besar Piutang Per Akun";
    workbook.title = "Buku Besar Piutang Per Akun";
    workbook.company = COMPANY_NAME;

    const sheet = workbook.addWorksheet(
      sanitizeSheetName("BUKU BESAR PIUTANG"),
    );

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    createTitle(sheet, printDate);

    sheet.columns = [
      { width: 15 },
      { width: 22 },
      { width: 45 },
      { width: 20 },
      { width: 20 },
      { width: 24 },
    ];

    let rowNumber = 11;

    for (const account of groupedAccounts) {
      if (account.rows.length === 0) continue;

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);
      sheet.getCell(`A${rowNumber}`).value =
        `${account.kode_coa} - ${account.nama_coa}`;
      applySectionStyle(sheet.getCell(`A${rowNumber}`));
      rowNumber += 1;

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);
      sheet.getCell(`A${rowNumber}`).value =
        `Kelompok: PIUTANG | Tipe COA: ${account.tipe_coa || "ASET"} | Saldo Normal: DEBIT`;
      sheet.getCell(`A${rowNumber}`).font = {
        italic: true,
        color: { argb: "FF666666" },
      };
      rowNumber += 1;

      const headerRow = sheet.getRow(rowNumber);
      headerRow.values = [
        "Tanggal",
        "Voucher",
        "Keterangan",
        "Debit",
        "Kredit",
        "Saldo Berjalan",
      ];

      for (let column = 1; column <= 6; column += 1) {
        applyHeaderStyle(sheet.getCell(rowNumber, column));
      }
      rowNumber += 1;

      let totalDebit = 0;
      let totalKredit = 0;
      let endingBalance = 0;

      for (const row of account.rows) {
        const debit = row.debit;
        const kredit = row.kredit;

        totalDebit += debit;
        totalKredit += kredit;
        endingBalance = row.saldo_berjalan;

        const dateCell = sheet.getCell(`A${rowNumber}`);
        dateCell.value = parseDate(row.tanggal);
        dateCell.numFmt = "dd/mm/yyyy";

        const voucherCell = sheet.getCell(`B${rowNumber}`);
        voucherCell.value = row.no_bukti;
        voucherCell.numFmt = "@";

        sheet.getCell(`C${rowNumber}`).value = row.keterangan;
        sheet.getCell(`D${rowNumber}`).value = debit;
        sheet.getCell(`E${rowNumber}`).value = kredit;
        sheet.getCell(`F${rowNumber}`).value = row.saldo_berjalan;

        applyCurrency(sheet.getCell(`D${rowNumber}`));
        applyCurrency(sheet.getCell(`E${rowNumber}`));
        applyCurrency(sheet.getCell(`F${rowNumber}`));

        for (let column = 1; column <= 6; column += 1) {
          applyBorder(sheet.getCell(rowNumber, column));
        }

        rowNumber += 1;
      }

      sheet.getCell(`A${rowNumber}`).value = "TOTAL AKUN";
      sheet.getCell(`D${rowNumber}`).value = totalDebit;
      sheet.getCell(`E${rowNumber}`).value = totalKredit;
      sheet.getCell(`F${rowNumber}`).value = endingBalance;

      for (const address of [
        `A${rowNumber}`,
        `D${rowNumber}`,
        `E${rowNumber}`,
        `F${rowNumber}`,
      ]) {
        applyTotalStyle(sheet.getCell(address));
      }

      applyCurrency(sheet.getCell(`D${rowNumber}`));
      applyCurrency(sheet.getCell(`E${rowNumber}`));
      applyCurrency(sheet.getCell(`F${rowNumber}`));
      rowNumber += 2;
    }

    if (ledgerRows.length > 0) {
      const grandTotalDebit = ledgerRows.reduce(
        (sum, row) => sum + row.debit,
        0,
      );
      const grandTotalKredit = ledgerRows.reduce(
        (sum, row) => sum + row.kredit,
        0,
      );
      const totalJurnal = new Set(ledgerRows.map((row) => row.id_jurnal)).size;

      sheet.mergeCells(`A${rowNumber}:C${rowNumber}`);
      sheet.getCell(`A${rowNumber}`).value =
        `TOTAL KESELURUHAN (${totalJurnal} Jurnal / ${ledgerRows.length} Detail)`;
      sheet.getCell(`D${rowNumber}`).value = grandTotalDebit;
      sheet.getCell(`E${rowNumber}`).value = grandTotalKredit;
      sheet.getCell(`F${rowNumber}`).value = "Saldo dihitung per akun";

      for (const address of [
        `A${rowNumber}`,
        `D${rowNumber}`,
        `E${rowNumber}`,
        `F${rowNumber}`,
      ]) {
        applyTotalStyle(sheet.getCell(address));
      }

      applyCurrency(sheet.getCell(`D${rowNumber}`));
      applyCurrency(sheet.getCell(`E${rowNumber}`));
      rowNumber += 2;
    } else {
      sheet.mergeCells("A11:F11");
      sheet.getCell("A11").value =
        "Belum terdapat transaksi jurnal POSTED pada Buku Besar Piutang.";
      sheet.getCell("A11").alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      sheet.getCell("A11").font = {
        italic: true,
        color: { argb: "FF666666" },
      };
      rowNumber = 12;
    }

    createSignature(sheet, rowNumber + 1);

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

    const totalDebitForQr = ledgerRows.reduce((sum, row) => sum + row.debit, 0);

    const qrText = generateQRCodeValue({
      id: ledgerRows[0]?.id_jurnal ?? 0,
      sumber_modul: "BUKU_BESAR_PIUTANG",
      nilai_transaksi: totalDebitForQr,
      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrText);
    const imageId = workbook.addImage({
      base64: qrImage,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 7, row: 0 },
      ext: { width: 90, height: 90 },
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="buku-besar-piutang-per-akun.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("BUKU BESAR PIUTANG ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
