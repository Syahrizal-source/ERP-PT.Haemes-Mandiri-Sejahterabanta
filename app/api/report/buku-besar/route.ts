import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { CellHyperlinkValue } from "exceljs";
import QRCode from "qrcode";
import { db } from "@/lib/supabase/server";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* ============================================================
   TYPES
   ============================================================ */

interface GeneralLedgerRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string | null;
  sumber: string | null;
  id_coa: number;
  kode_coa: string;
  nama_coa: string;
  debit: number | string | null;
  kredit: number | string | null;
  id_periode: number;
  nama_periode: string;
  status_periode: string;
}

interface CoaMasterRow {
  kode: string;
  nama: string;
  aktif: boolean;
  urutan: number | null;
}

interface BukuBesarRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: string;
  kode_coa: string;
  nama_coa: string;
  debit: number;
  kredit: number;
}

interface GroupedCoa {
  kode: string;
  nama: string;
  urutan: number;
  rows: BukuBesarRow[];
}

/* ============================================================
   CONSTANT
   ============================================================ */

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

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

/* ============================================================
   STYLES
   ============================================================ */

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

/* ============================================================
   TITLE
   ============================================================ */

function createTitle(
  sheet: ExcelJS.Worksheet,
  periode: string,
  printDate: string,
): void {
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "BUKU BESAR UMUM";
  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";
  sheet.getCell("A2").font = {
    bold: true,
    size: 12,
  };
  sheet.getCell("A2").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.mergeCells("A4:F4");
  sheet.getCell("A4").value = "BUKU BESAR";
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
   SHEET NAME
   ============================================================ */

function sanitizeSheetName(name: string): string {
  const sanitized = name.replace(/[*?:/\\[\]]/g, "").trim();

  if (sanitized.length === 0) {
    return "BUKU BESAR";
  }

  return sanitized.substring(0, 31);
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

  for (const cellAddress of [`A${titleRow}`, `C${titleRow}`, `E${titleRow}`]) {
    const cell = sheet.getCell(cellAddress);
    cell.font = { bold: true };
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

  for (const cellAddress of [`A${nameRow}`, `C${nameRow}`, `E${nameRow}`]) {
    const cell = sheet.getCell(cellAddress);
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }
}

/* ============================================================
   GET
   ============================================================ */

export async function GET(): Promise<Response> {
  try {
    /* ========================================================
       LOAD GENERAL LEDGER

       public.v_general_ledger sudah menggunakan:
       - jurnal posted
       - periode OPEN
       - exclude CLS
       - exclude CLOSE
       - exclude OPEN
       - exclude REV

       Tidak menggunakan:
       - wilayah
       - estate
       - division
       - block
    ======================================================== */

    const { data: ledgerDataRaw, error: ledgerError } = await db
      .from("v_general_ledger")
      .select(
        `
          id_jurnal,
          tanggal,
          no_bukti,
          keterangan,
          sumber,
          id_coa,
          kode_coa,
          nama_coa,
          debit,
          kredit,
          id_periode,
          nama_periode,
          status_periode
        `,
      )
      .eq("status_periode", "OPEN")
      .order("tanggal", {
        ascending: true,
      })
      .order("id_jurnal", {
        ascending: true,
      });

    if (ledgerError) {
      throw ledgerError;
    }

    const ledgerData = (ledgerDataRaw ?? []) as GeneralLedgerRow[];

    /* ========================================================
       VALIDASI PERIODE
    ======================================================== */

    const openPeriods = new Set(
      ledgerData
        .filter((row) => row.status_periode === "OPEN")
        .map((row) => row.id_periode),
    );

    if (openPeriods.size > 1) {
      throw new Error(
        "Terdapat lebih dari satu periode OPEN. Buku Besar membutuhkan satu periode OPEN aktif.",
      );
    }

    /* ========================================================
       LOAD MASTER COA

       Urutan menggunakan field urutan database yang sudah
       diperbaiki sebelumnya.
    ======================================================== */

    const { data: coaDataRaw, error: coaError } = await db
      .from("coa")
      .select(
        `
          kode,
          nama,
          aktif,
          urutan
        `,
      )
      .eq("aktif", true)
      .order("urutan", {
        ascending: true,
        nullsFirst: false,
      })
      .order("kode", {
        ascending: true,
      });

    if (coaError) {
      throw coaError;
    }

    const coaData = (coaDataRaw ?? []) as CoaMasterRow[];

    /* ========================================================
       MAP GENERAL LEDGER ROW
    ======================================================== */

    const rows: BukuBesarRow[] = ledgerData.map(
      (item): BukuBesarRow => ({
        id_jurnal: Number(item.id_jurnal),
        tanggal: String(item.tanggal),
        no_bukti: String(item.no_bukti),
        keterangan: toText(item.keterangan),
        sumber: toText(item.sumber),
        kode_coa: String(item.kode_coa),
        nama_coa: String(item.nama_coa),
        debit: toNumber(item.debit),
        kredit: toNumber(item.kredit),
      }),
    );

    /* ========================================================
       SORT TRANSACTION

       Tidak melakukan deduplikasi.
       Setiap jurnal_detail tetap dipertahankan.
    ======================================================== */

    rows.sort((a, b) => {
      const dateDifference =
        new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      if (a.id_jurnal !== b.id_jurnal) {
        return a.id_jurnal - b.id_jurnal;
      }

      return a.kode_coa.localeCompare(b.kode_coa);
    });

    /* ========================================================
       GROUP COA
    ======================================================== */

    const grouped = new Map<string, GroupedCoa>();

    for (const coa of coaData) {
      const kode = coa.kode.trim();

      grouped.set(kode, {
        kode: coa.kode,
        nama: coa.nama,
        urutan: coa.urutan ?? Number.MAX_SAFE_INTEGER,
        rows: [],
      });
    }

    /* ========================================================
       INSERT TRANSACTION KE COA AKTIF

       Transaksi yang masih menggunakan COA nonaktif tidak
       dimasukkan ke workbook aktif.
    ======================================================== */

    for (const row of rows) {
      const key = row.kode_coa.trim();
      const account = grouped.get(key);

      if (!account) {
        continue;
      }

      account.rows.push(row);
    }

    /* ========================================================
       SORT COA BERDASARKAN URUTAN DATABASE
    ======================================================== */

    const groupedAccounts = Array.from(grouped.values()).sort((a, b) => {
      if (a.urutan !== b.urutan) {
        return a.urutan - b.urutan;
      }

      return a.kode.localeCompare(b.kode);
    });

    /* ========================================================
       LOAD ACTIVE PERIOD
    ======================================================== */

    const { data: periodeDataRaw, error: periodeError } = await db
      .from("periode")
      .select(
        `
          id_periode,
          nama_periode,
          status
        `,
      )
      .eq("status", "OPEN")
      .order("id_periode", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (periodeError) {
      throw periodeError;
    }

    const periodeData = periodeDataRaw as {
      id_periode: number;
      nama_periode: string;
      status: string;
    } | null;

    if (periodeData?.status !== "OPEN") {
      throw new Error("Tidak ditemukan periode OPEN aktif.");
    }

    const periode =
      periodeData.nama_periode ||
      (ledgerData.length > 0 ? ledgerData[0].nama_periode : "PERIODE OPEN");

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

    /* ========================================================
       SINGLE GENERAL LEDGER SHEET

       Tidak ada division sheet.
       Tidak ada wilayah / estate / division / block.
    ======================================================== */

    const sheetName = sanitizeSheetName("BUKU BESAR");
    const sheet = workbook.addWorksheet(sheetName);

    createTitle(sheet, periode, printDate);

    sheet.columns = [
      { width: 15 },
      { width: 35 },
      { width: 60 },
      { width: 18 },
      { width: 18 },
      { width: 22 },
    ];

    /* ========================================================
       DATA START
    ======================================================== */

    let rowNumber = 9;

    /* ========================================================
       ACCOUNT DATA
    ======================================================== */

    for (const coaGroup of groupedAccounts) {
      if (coaGroup.rows.length === 0) {
        continue;
      }

      /* ====================================================
         ACCOUNT HEADER
      ==================================================== */

      sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

      sheet.getCell(`A${rowNumber}`).value =
        `${coaGroup.kode} - ${coaGroup.nama}`;

      sheet.getCell(`A${rowNumber}`).font = {
        bold: true,
        size: 12,
      };

      sheet.getCell(`A${rowNumber}`).alignment = {
        horizontal: "left",
        vertical: "middle",
      };

      rowNumber++;

      /* ====================================================
         TABLE HEADER

         Format final:
         Tanggal | Voucher | Keterangan | Debit | Kredit | Saldo
      ==================================================== */

      const headerRow = sheet.getRow(rowNumber);

      headerRow.values = [
        "Tanggal",
        "Voucher",
        "Keterangan",
        "Debit",
        "Kredit",
        "Saldo",
      ];

      for (let col = 1; col <= 6; col++) {
        headerStyle(sheet.getCell(rowNumber, col));
      }

      rowNumber++;

      /* ====================================================
         TRANSACTION
      ==================================================== */

      let saldo = 0;

      for (const row of coaGroup.rows) {
        saldo += row.debit - row.kredit;

        const dateCell = sheet.getCell(`A${rowNumber}`);
        dateCell.value = new Date(row.tanggal);
        dateCell.numFmt = "dd/mm/yyyy";

        const voucherCell = sheet.getCell(`B${rowNumber}`);
        voucherCell.value = row.no_bukti;
        voucherCell.font = {
          color: { argb: "000000" },
        };

        sheet.getCell(`C${rowNumber}`).value = row.keterangan;
        sheet.getCell(`D${rowNumber}`).value = row.debit;
        sheet.getCell(`E${rowNumber}`).value = row.kredit;
        sheet.getCell(`F${rowNumber}`).value = saldo;

        currency(sheet.getCell(`D${rowNumber}`));
        currency(sheet.getCell(`E${rowNumber}`));
        currency(sheet.getCell(`F${rowNumber}`));

        for (let col = 1; col <= 6; col++) {
          border(sheet.getCell(rowNumber, col));
        }

        rowNumber++;
      }

      /* ====================================================
         ACCOUNT TOTAL
      ==================================================== */

      sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);
      sheet.getCell(`A${rowNumber}`).value = "SALDO AKHIR";
      sheet.getCell(`F${rowNumber}`).value = saldo;

      totalStyle(sheet.getCell(`A${rowNumber}`));
      totalStyle(sheet.getCell(`F${rowNumber}`));
      currency(sheet.getCell(`F${rowNumber}`));

      rowNumber += 2;
    }

    /* ========================================================
       SIGNATURE

       Diletakkan setelah seluruh Buku Besar.
       Mengikuti layout 6 kolom A:F.
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

    /*
     * Jangan menggunakan ExcelJS.PaperSize.A4 karena pada versi
     * ExcelJS yang digunakan project ini enum tersebut tidak
     * tersedia. Nilai 9 = A4.
     */
    sheet.pageSetup.paperSize = 9;

    sheet.views = [
      {
        state: "frozen",
        ySplit: 8,
      },
    ];

    /* ========================================================
       AUTO WIDTH

       Tetap menjaga 6 kolom final.
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

       Menggunakan periode OPEN aktif.
    ======================================================== */

    const qrText = generateQRCodeValue({
      id: periodeData.id_periode,
      sumber_modul: "BUKU_BESAR",
      nilai_transaksi: rows.reduce((sum, row) => sum + row.debit, 0),
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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="buku-besar-umum.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error("BUKU BESAR ERROR:", error);

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
