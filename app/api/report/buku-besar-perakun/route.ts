import { NextResponse } from "next/server";

import ExcelJS from "exceljs";

import QRCode from "qrcode";

import { db } from "@/lib/supabase/server";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* ============================================================

   TYPES

   ============================================================ */

interface BukuBesarPerAkunRow {
  id_jurnal: number;

  id_detail: number;

  id_coa: number;

  tanggal: string;

  no_bukti: string;

  keterangan: string | null;

  sumber: string | null;

  status: string;

  kelompok_buku_besar: string;

  kode_coa: string;

  nama_coa: string;

  tipe_coa: string | null;

  debit: number | string | null;

  kredit: number | string | null;

  saldo_berjalan: number | string | null;
}

interface BukuBesarAccount {
  id_coa: number;

  kode_coa: string;

  nama_coa: string;

  tipe_coa: string;

  kelompok_buku_besar: string;

  rows: BukuBesarPerAkunRow[];
}

/* ============================================================

   CONSTANT

   ============================================================ */

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]\\("Rp" #,##0)';

const COMPANY_NAME = "PT. Haemes Mandiri Sejahterabanta";

/* ============================================================

   HELPERS

   ============================================================ */

function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: string | null): string {
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

    color: { argb: "FFFFFFFF" },
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "1F4E78" },
  };

  cell.alignment = {
    horizontal: "center",

    vertical: "middle",
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

    fgColor: { argb: "D9D9D9" },
  };

  border(cell);
}

function sectionStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,

    size: 12,
  };

  cell.alignment = {
    horizontal: "left",

    vertical: "middle",
  };
}

function sanitizeSheetName(name: string): string {
  const sanitized = name
    .split("")
    .filter((character) => !"\\\\/*?:[]".includes(character))
    .join("")
    .trim();

  if (sanitized.length === 0) {
    return "BUKU BESAR";
  }

  return sanitized.substring(0, 31);
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

  sheet.getCell("A1").font = {
    bold: true,

    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.mergeCells("A2:F2");

  sheet.getCell("A2").value = COMPANY_NAME;

  sheet.getCell("A2").font = {
    bold: true,

    size: 12,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.mergeCells("A4:F4");

  sheet.getCell("A4").value = "BUKU BESAR PER AKUN";

  sheet.getCell("A4").font = {
    bold: true,

    size: 14,
  };

  sheet.getCell("A4").alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  sheet.mergeCells("A5:F5");

  sheet.getCell("A5").value = `Periode : ${periode}`;

  sheet.getCell("A5").font = {
    bold: true,
  };

  sheet.getCell("A5").alignment = {
    horizontal: "left",

    vertical: "middle",
  };

  sheet.mergeCells("A6:F6");

  sheet.getCell("A6").value = `Tanggal Cetak : ${printDate}`;

  sheet.getCell("A6").alignment = {
    horizontal: "left",

    vertical: "middle",
  };
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

  sheet.getCell(`A${nameRow}`).value = "(____________________)";

  sheet.getCell(`C${nameRow}`).value = "(____________________)";

  sheet.getCell(`E${nameRow}`).value = "(____________________)";

  for (const address of [`A${nameRow}`, `C${nameRow}`, `E${nameRow}`]) {
    sheet.getCell(address).alignment = {
      horizontal: "center",

      vertical: "middle",
    };
  }
}

/* ============================================================

   FETCH ALL LEDGER ROWS

   Supabase dapat membatasi hasil query per request.
   Ambil data per halaman agar laporan tidak terpotong.
   Urutan id_detail menjadi pengunci urutan yang konsisten.

   ============================================================ */

async function fetchAllLedgerRows(): Promise<BukuBesarPerAkunRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: BukuBesarPerAkunRow[] = [];

  while (true) {
    const { data, error } = await db
      .from("v_buku_besar_per_akun")
      .select(
        `
          id_jurnal,
          id_detail,
          id_coa,
          tanggal,
          no_bukti,
          keterangan,
          sumber,
          status,
          kelompok_buku_besar,
          kode_coa,
          nama_coa,
          tipe_coa,
          debit,
          kredit,
          saldo_berjalan
        `,
      )
      .order("tanggal", { ascending: true })
      .order("id_jurnal", { ascending: true })
      .order("id_detail", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<BukuBesarPerAkunRow[]>();

    if (error) {
      throw new Error(
        `Gagal mengambil Buku Besar Per Akun (baris ${from + 1}): ${error.message}`,
      );
    }

    const pageRows = data ?? [];
    allRows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
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

        kelompok_buku_besar: row.kelompok_buku_besar,

        rows: [],
      };

      grouped.set(row.id_coa, account);
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

   GET

   ============================================================ */

export async function GET(): Promise<Response> {
  try {
    /* ========================================================

       LOAD POSTED GENERAL LEDGER

       Sumber:

       public.v_buku_besar_per_akun

       Menggunakan:

       - jurnal posted

       - jurnal_detail

       - COA

       - klasifikasi hierarki COA

       - saldo_berjalan dari database view

       Tidak menghitung ulang saldo berjalan.

       Tidak melakukan deduplikasi jurnal_detail.

       ======================================================== */

    const ledgerData = await fetchAllLedgerRows();

    /* ========================================================

       VALIDATE DATA

       ======================================================== */

    for (const row of ledgerData) {
      if (
        !Number.isFinite(Number(row.id_jurnal)) ||
        !Number.isFinite(Number(row.id_detail)) ||
        !Number.isFinite(Number(row.id_coa))
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

       View yang diberikan tidak menyediakan id_periode

       maupun nama_periode.

       Karena itu laporan mengikuti seluruh jurnal POSTED

       yang tersedia dalam view, bukan mengaku hanya periode

       OPEN atau periode tertentu.

       ======================================================== */

    const periode = "Seluruh Periode - Jurnal Posted";

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

      { width: 28 },

      { width: 55 },

      { width: 20 },

      { width: 20 },

      { width: 23 },
    ];

    /* ========================================================

       DATA START

       ======================================================== */

    let rowNumber = 9;

    /* ========================================================

       ACCOUNT DATA

       ======================================================== */

    for (const account of groupedAccounts) {
      if (account.rows.length === 0) {
        continue;
      }

      /* ======================================================

         ACCOUNT HEADER

         ====================================================== */

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `${account.kode_coa} - ${account.nama_coa}`;

      sectionStyle(sheet.getCell(`A${rowNumber}`));

      rowNumber++;

      /* ======================================================

         ACCOUNT CLASSIFICATION

         ====================================================== */

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `Kelompok: ${account.kelompok_buku_besar} | Tipe COA: ${
          account.tipe_coa || "-"
        }`;

      sheet.getCell(`A${rowNumber}`).font = {
        italic: true,

        color: { argb: "666666" },
      };

      rowNumber++;

      /* ======================================================

         TABLE HEADER

         ====================================================== */

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

      /* ======================================================

         TRANSACTIONS

         saldo_berjalan langsung dari SQL VIEW.

         Tidak menggunakan saldo debit-kredit hasil hitung

         ulang di API.

         ====================================================== */

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

        // Simpan nomor bukti sebagai teks agar format dan angka nol tetap utuh.

        voucherCell.value = String(row.no_bukti ?? "");

        voucherCell.numFmt = "@";

        voucherCell.alignment = {
          horizontal: "left",

          vertical: "middle",
        };

        voucherCell.font = {
          color: { argb: "000000" },
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

      /* ======================================================

         ACCOUNT TOTAL

         ====================================================== */

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

       GRAND TOTAL - SELURUH JURNAL POSTED

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
      sheet.getCell(`F${rowNumber}`).value = grandTotalDebit - grandTotalKredit;

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

       EMPTY DATA

       ======================================================== */

    if (ledgerData.length === 0) {
      sheet.mergeCells("A9:F9");

      sheet.getCell("A9").value = "Belum terdapat transaksi jurnal POSTED.";

      sheet.getCell("A9").alignment = {
        horizontal: "center",

        vertical: "middle",
      };

      sheet.getCell("A9").font = {
        italic: true,

        color: { argb: "666666" },
      };

      rowNumber = 11;
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

    sheet.views = [
      {
        state: "frozen",

        ySplit: 8,
      },
    ];

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
