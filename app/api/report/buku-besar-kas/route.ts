import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS, { CellHyperlinkValue } from "exceljs";

import QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

const PAGE_SIZE = 1000;

const JOURNAL_ID_BATCH_SIZE = 300;

const ROOT_CASH_COA_CODE = "10.101";

interface CoaIdRow {
  id_coa: number;
}

interface CoaRow {
  id_coa: number;

  kode: string;

  nama: string;

  parent_id: number | null;

  normal_balance: string | null;

  is_cash: boolean | null;

  is_header: boolean | null;
}

interface JournalRow {
  id_jurnal: number;

  tanggal: string;

  no_bukti: string | null;

  keterangan: string | null;

  is_posted: boolean;
}

interface JournalDetailRow {
  id_detail: number;

  id_jurnal: number;

  id_coa: number;

  debit: number | string | null;

  kredit: number | string | null;
}

interface BukuKasRow {
  id_jurnal: number;

  id_detail: number;

  id_coa: number;

  tanggal: string;

  no_bukti: string;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  debit: number;

  kredit: number;

  saldo_berjalan: number;
}

interface GroupedKas {
  coa: CoaRow;

  rows: BukuKasRow[];
}

function toNumber(value: number | string | null): number {
  if (value === null || value === "") return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function compareCoaKode(a: string, b: string): number {
  const partsA = a

    .trim()

    .split(".")

    .map((part) => Number(part));

  const partsB = b

    .trim()

    .split(".")

    .map((part) => Number(part));

  const length = Math.max(partsA.length, partsB.length);

  for (let index = 0; index < length; index += 1) {
    const valueA = partsA[index] ?? -1;

    const valueB = partsB[index] ?? -1;

    if (valueA !== valueB) return valueA - valueB;
  }

  return a.localeCompare(b, "id-ID");
}

function sortTransactions(rows: BukuKasRow[]): BukuKasRow[] {
  return [...rows].sort((a, b) => {
    const dateDifference = a.tanggal.localeCompare(b.tanggal);

    if (dateDifference !== 0) return dateDifference;

    if (a.id_jurnal !== b.id_jurnal) return a.id_jurnal - b.id_jurnal;

    return a.id_detail - b.id_detail;
  });
}

function buildHierarchyLines(
  coa: CoaRow,

  coaById: Map<number, CoaRow>,
): string[] {
  const chain: CoaRow[] = [];

  const visited = new Set<number>();

  let current: CoaRow | undefined = coa;

  while (current && !visited.has(current.id_coa)) {
    visited.add(current.id_coa);

    chain.unshift(current);

    current =
      current.parent_id === null ? undefined : coaById.get(current.parent_id);
  }

  return chain.map((item, index) => {
    const indent = "  ".repeat(index);

    return `${indent}${item.kode.trim()} - ${item.nama.trim()}`;
  });
}

function formatSheetName(kode: string, usedNames: Set<string>): string {
  const base =
    kode

      .replace(/[\\\\/\*?:\\[\\]]/g, "")

      .trim()

      .substring(0, 31) || "Akun Kas";

  let candidate = base;

  let suffix = 1;

  while (usedNames.has(candidate.toLowerCase())) {
    const ending = `_${suffix}`;

    candidate = `${base.substring(0, 31 - ending.length)}${ending}`;

    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());

  return candidate;
}

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: "FFFFFF" } };

  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "1F4E78" },
  };

  cell.border = {
    top: { style: "thin" },

    left: { style: "thin" },

    bottom: { style: "thin" },

    right: { style: "thin" },
  };
}

function applyTableBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: "thin" },

    left: { style: "thin" },

    bottom: { style: "thin" },

    right: { style: "thin" },
  };
}

function createIndexTitle(sheet: ExcelJS.Worksheet): void {
  sheet.mergeCells("A1:C1");

  sheet.getCell("A1").value = "BUKU BESAR KAS";

  sheet.getCell("A1").font = { bold: true, size: 18 };

  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A2:C2");

  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell("A2").font = { bold: true, size: 14 };

  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A3:C3");

  sheet.getCell("A3").value =
    "Daftar akun kas berdasarkan hierarki COA database";

  sheet.getCell("A3").font = {
    italic: true,

    size: 10,

    color: { argb: "666666" },
  };

  sheet.getCell("A3").alignment = { horizontal: "center" };
}

function createDetailTitle(
  sheet: ExcelJS.Worksheet,

  hierarchyLines: string[],
): number {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "BUKU BESAR KAS";

  sheet.getCell("A1").font = { bold: true, size: 18 };

  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:F2");

  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell("A2").font = { bold: true, size: 14 };

  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  sheet.getRow(2).height = 24;

  hierarchyLines.forEach((line, index) => {
    const rowNumber = index + 3;

    sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

    const cell = sheet.getCell(`A${rowNumber}`);

    cell.value = line;

    cell.font = {
      bold: index === hierarchyLines.length - 1,

      size: index === hierarchyLines.length - 1 ? 12 : 11,
    };

    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    sheet.getRow(rowNumber).height = line.length > 75 ? 30 : 22;
  });

  return hierarchyLines.length + 3;
}

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  const safeRow = row < 20 ? 20 : row;

  sheet.getCell(`B${safeRow}`).value = "Direksi";

  sheet.getCell(`E${safeRow}`).value = "Finance Manager";

  sheet.getCell(`B${safeRow}`).font = { bold: true };

  sheet.getCell(`E${safeRow}`).font = { bold: true };

  sheet.getCell(`B${safeRow + 4}`).value = "(___________________)";

  sheet.getCell(`E${safeRow + 4}`).value = "(___________________)";
}

function formatDateForExcel(value: string): Date | string {
  const parsed = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

async function fetchAllCoa(): Promise<CoaRow[]> {
  const rows: CoaRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db

      .from("coa")

      .select("id_coa,kode,nama,parent_id,normal_balance,is_cash,is_header")

      .order("id_coa", { ascending: true })

      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as CoaRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchAllowedCashCoaIds(): Promise<number[]> {
  const ids: number[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("v_coa_buku_besar_kas")
      .select("id_coa")
      .order("id_coa", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as CoaIdRow[];
    ids.push(...page.map((row) => row.id_coa));

    if (page.length < PAGE_SIZE) break;
  }

  return ids;
}

async function fetchAllPostedJournals(): Promise<JournalRow[]> {
  const rows: JournalRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db

      .from("jurnal")

      .select("id_jurnal,tanggal,no_bukti,keterangan,is_posted")

      .eq("is_posted", true)

      .order("tanggal", { ascending: true })

      .order("id_jurnal", { ascending: true })

      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as JournalRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchPostedJournalDetails(
  journalIds: number[],

  coaIds: number[],
): Promise<JournalDetailRow[]> {
  const rows: JournalDetailRow[] = [];

  if (journalIds.length === 0 || coaIds.length === 0) return rows;

  for (
    let batchStart = 0;
    batchStart < journalIds.length;
    batchStart += JOURNAL_ID_BATCH_SIZE
  ) {
    const journalBatch = journalIds.slice(
      batchStart,

      batchStart + JOURNAL_ID_BATCH_SIZE,
    );

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await db

        .from("jurnal_detail")

        .select("id_detail,id_jurnal,id_coa,debit,kredit")

        .in("id_jurnal", journalBatch)

        .in("id_coa", coaIds)

        .order("id_jurnal", { ascending: true })

        .order("id_detail", { ascending: true })

        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const page = (data ?? []) as unknown as JournalDetailRow[];

      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
    }
  }

  return rows;
}

function buildLedgerRows(
  coaById: Map<number, CoaRow>,

  journals: JournalRow[],

  details: JournalDetailRow[],
): BukuKasRow[] {
  const journalById = new Map<number, JournalRow>();

  for (const journal of journals) journalById.set(journal.id_jurnal, journal);

  const rows: BukuKasRow[] = [];

  for (const detail of details) {
    const journal = journalById.get(detail.id_jurnal);

    const coa = coaById.get(detail.id_coa);

    if (!journal || !journal.is_posted || !coa) continue;

    rows.push({
      id_jurnal: journal.id_jurnal,

      id_detail: detail.id_detail,

      id_coa: detail.id_coa,

      tanggal: String(journal.tanggal),

      no_bukti: journal.no_bukti ?? "",

      keterangan: journal.keterangan ?? "",

      kode_coa: coa.kode,

      nama_coa: coa.nama,

      debit: toNumber(detail.debit),

      kredit: toNumber(detail.kredit),

      saldo_berjalan: 0,
    });
  }

  return sortTransactions(rows);
}

function buildAccountGroups(
  coaRows: CoaRow[],
  ledgerRows: BukuKasRow[],
): GroupedKas[] {
  const rootPrefix = `${ROOT_CASH_COA_CODE}.`;
  const includedCoa = coaRows
    .filter(
      (coa) =>
        coa.kode.trim() === ROOT_CASH_COA_CODE ||
        coa.kode.trim().startsWith(rootPrefix),
    )
    .sort((a, b) => compareCoaKode(a.kode, b.kode));

  return includedCoa.map((coa) => {
    const accountPrefix = `${coa.kode.trim()}.`;
    const accountIds = new Set(
      coaRows
        .filter(
          (candidate) =>
            candidate.kode.trim() === coa.kode.trim() ||
            candidate.kode.trim().startsWith(accountPrefix),
        )
        .map((candidate) => candidate.id_coa),
    );

    const accountRows = sortTransactions(
      ledgerRows.filter((row) => accountIds.has(row.id_coa)),
    );

    const isCreditNormal =
      (coa.normal_balance ?? "DEBIT").toUpperCase() === "KREDIT";
    let runningBalance = 0;

    const rowsWithBalance = accountRows.map((row) => {
      runningBalance += isCreditNormal
        ? row.kredit - row.debit
        : row.debit - row.kredit;

      return { ...row, saldo_berjalan: runningBalance };
    });

    return { coa, rows: rowsWithBalance };
  });
}

export async function GET(): Promise<Response> {
  try {
    // View Supabase menjadi whitelist resmi akun Buku Besar Kas.
    // Tabel coa hanya dibaca untuk metadata dan nama rantai induk pada judul Excel.
    const [allCoaRows, allowedCashCoaIds] = await Promise.all([
      fetchAllCoa(),
      fetchAllowedCashCoaIds(),
    ]);

    const allowedCashCoaIdSet = new Set(allowedCashCoaIds);
    const coaRows = allCoaRows.filter((coa) =>
      allowedCashCoaIdSet.has(coa.id_coa),
    );

    const coaById = new Map<number, CoaRow>(
      allCoaRows.map((coa) => [coa.id_coa, coa]),
    );

    const rootCoa = coaRows.find(
      (coa) => coa.kode.trim() === ROOT_CASH_COA_CODE,
    );

    if (!rootCoa) {
      return NextResponse.json(
        {
          error: `COA induk Kas ${ROOT_CASH_COA_CODE} tidak ditemukan pada v_coa_buku_besar_kas.`,
        },
        { status: 404 },
      );
    }

    // Hanya ID COA yang diizinkan oleh view yang dipakai untuk membaca detail.
    // Jurnal tetap dibatasi ke status Posted; tidak ada penambahan saldo_awal_2026.
    const cashCoaIds = coaRows.map((coa) => coa.id_coa);

    const postedJournals = await fetchAllPostedJournals();

    const postedJournalIds = postedJournals.map((journal) => journal.id_jurnal);

    const journalDetails = await fetchPostedJournalDetails(
      postedJournalIds,

      cashCoaIds,
    );

    const ledgerRows = buildLedgerRows(coaById, postedJournals, journalDetails);

    // Setiap akun menampilkan transaksi akun itu beserta seluruh turunannya.

    // Karena jurnal saldo awal sudah posted, saldo_awal_2026 tidak ditambahkan lagi.

    const groupedAccounts = buildAccountGroups(coaRows, ledgerRows);

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Accounting System";

    workbook.subject = "Buku Besar Kas";

    workbook.title = "Buku Besar Kas";

    workbook.created = new Date();

    const indexSheet = workbook.addWorksheet("Buku Besar Kas");

    createIndexTitle(indexSheet);

    indexSheet.columns = [{ width: 8 }, { width: 24 }, { width: 65 }];

    const indexHeaderRow = 5;

    indexSheet.getRow(indexHeaderRow).values = [
      "No",

      "Kode COA",

      "Nama Akun / Buku Besar",
    ];

    for (let column = 1; column <= 3; column += 1) {
      applyHeaderStyle(indexSheet.getCell(indexHeaderRow, column));
    }

    indexSheet.views = [{ state: "frozen", ySplit: indexHeaderRow }];

    const usedSheetNames = new Set<string>(["buku besar kas"]);

    const sheetNameByCoaId = new Map<number, string>();

    for (const group of groupedAccounts) {
      sheetNameByCoaId.set(
        group.coa.id_coa,

        formatSheetName(group.coa.kode, usedSheetNames),
      );
    }

    let indexRow = indexHeaderRow + 1;

    for (const group of groupedAccounts) {
      const sheetName = sheetNameByCoaId.get(group.coa.id_coa);

      if (!sheetName) continue;

      const level = buildHierarchyLines(group.coa, coaById).length - 1;

      indexSheet.getCell(`A${indexRow}`).value = indexRow - indexHeaderRow;

      indexSheet.getCell(`B${indexRow}`).value = group.coa.kode;

      const linkCell = indexSheet.getCell(`C${indexRow}`);

      const hyperlinkValue: CellHyperlinkValue = {
        text: group.coa.nama,

        hyperlink: `#'${sheetName}'!A1`,
      };

      linkCell.value = hyperlinkValue;

      linkCell.alignment = { vertical: "middle", indent: Math.min(level, 15) };

      linkCell.font = {
        color: { argb: "0000FF" },

        underline: true,

        bold: level <= 1,
      };

      indexSheet.getCell(`B${indexRow}`).alignment = {
        vertical: "middle",

        indent: Math.min(level, 15),
      };

      if (group.coa.id_coa === rootCoa.id_coa || level <= 1) {
        for (let column = 1; column <= 3; column += 1) {
          const cell = indexSheet.getCell(indexRow, column);

          cell.fill = {
            type: "pattern",

            pattern: "solid",

            fgColor: {
              argb: group.coa.id_coa === rootCoa.id_coa ? "D9EAF7" : "EAF2F8",
            },
          };

          cell.font = { ...cell.font, bold: true };
        }
      }

      indexSheet.getRow(indexRow).height = 22;

      indexRow += 1;
    }

    indexSheet.autoFilter = {
      from: `A${indexHeaderRow}`,

      to: `C${Math.max(indexHeaderRow, indexRow - 1)}`,
    };

    // Buat satu worksheet per akun. Sheet akun induk berisi transaksi seluruh turunannya.

    for (const group of groupedAccounts) {
      const sheetName = sheetNameByCoaId.get(group.coa.id_coa);

      if (!sheetName) continue;

      const detailSheet = workbook.addWorksheet(sheetName);

      const hierarchyLines = buildHierarchyLines(group.coa, coaById);

      const tableHeaderRow = createDetailTitle(detailSheet, hierarchyLines);

      detailSheet.columns = [
        { width: 15 },

        { width: 25 },

        { width: 58 },

        { width: 18 },

        { width: 18 },

        { width: 20 },
      ];

      const headerRowNumber = tableHeaderRow + 1;

      detailSheet.getRow(headerRowNumber).values = [
        "Tanggal",

        "Voucher",

        "Keterangan",

        "Debit",

        "Kredit",

        "Saldo",
      ];

      for (let column = 1; column <= 6; column += 1) {
        applyHeaderStyle(detailSheet.getCell(headerRowNumber, column));
      }

      detailSheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

      let detailRow = headerRowNumber + 1;

      let totalDebit = 0;

      let totalKredit = 0;

      let saldoAkhir = 0;

      for (const transaction of group.rows) {
        saldoAkhir = transaction.saldo_berjalan;

        totalDebit += transaction.debit;

        totalKredit += transaction.kredit;

        const dateCell = detailSheet.getCell(`A${detailRow}`);

        dateCell.value = formatDateForExcel(transaction.tanggal);

        if (dateCell.value instanceof Date) dateCell.numFmt = "dd/mm/yyyy";

        detailSheet.getCell(`B${detailRow}`).value = transaction.no_bukti;

        detailSheet.getCell(`C${detailRow}`).value = transaction.keterangan;

        detailSheet.getCell(`D${detailRow}`).value =
          transaction.debit > 0 ? transaction.debit : "";

        detailSheet.getCell(`E${detailRow}`).value =
          transaction.kredit > 0 ? transaction.kredit : "";

        detailSheet.getCell(`F${detailRow}`).value = transaction.saldo_berjalan;

        for (let column = 4; column <= 6; column += 1) {
          const cell = detailSheet.getCell(detailRow, column);

          cell.numFmt = "#,##0;[Red]\(#,##0);-";

          cell.alignment = { horizontal: "right", vertical: "middle" };
        }

        for (let column = 1; column <= 6; column += 1) {
          applyTableBorder(detailSheet.getCell(detailRow, column));
        }

        detailRow += 1;
      }

      detailSheet.mergeCells(`A${detailRow}:C${detailRow}`);

      detailSheet.getCell(`A${detailRow}`).value = "SALDO AKHIR";

      detailSheet.getCell(`A${detailRow}`).font = { bold: true };

      detailSheet.getCell(`D${detailRow}`).value = totalDebit;

      detailSheet.getCell(`E${detailRow}`).value = totalKredit;

      detailSheet.getCell(`F${detailRow}`).value = saldoAkhir;

      for (let column = 1; column <= 6; column += 1) {
        const cell = detailSheet.getCell(detailRow, column);

        cell.font = { bold: true };

        cell.fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "D9EAF7" },
        };

        applyTableBorder(cell);
      }

      for (let column = 4; column <= 6; column += 1) {
        const cell = detailSheet.getCell(detailRow, column);

        cell.numFmt = "#,##0;[Red]\(#,##0);-";

        cell.alignment = { horizontal: "right" };
      }

      const backRow = detailRow + 3;

      const backCell = detailSheet.getCell(`A${backRow}`);

      const backLink: CellHyperlinkValue = {
        text: "Kembali ke INDEX",

        hyperlink: "#'Buku Besar Kas'!A1",
      };

      backCell.value = backLink;

      backCell.font = {
        color: { argb: "0000FF" },

        underline: true,

        bold: true,
      };

      const qrValue = generateQRCodeValue({
        id: Number(group.coa.kode.replace(/\D/g, "") || group.coa.id_coa),

        sumber_modul: "BUKU_BESAR_KAS",

        nilai_transaksi: saldoAkhir,

        tanggal_transaksi: new Date().toISOString(),
      });

      const qrImage = await QRCode.toDataURL(qrValue);

      const imageId = workbook.addImage({ base64: qrImage, extension: "png" });

      detailSheet.addImage(imageId, {
        tl: { col: 5, row: 0 },

        ext: { width: 90, height: 90 },
      });

      addSignature(detailSheet, backRow + 5);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="buku-besar-kas.xlsx"',

        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat membuat Buku Besar Kas.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
