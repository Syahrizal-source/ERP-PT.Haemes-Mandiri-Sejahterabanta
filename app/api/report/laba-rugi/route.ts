import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import * as QRCode from "qrcode";

import { db } from "@/lib/supabase/server";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================
   TYPES
========================= */

interface LabaRugiRow {
  kode: string;
  nama: string;
  nilai: number;
  kategori_laporan?: string | null;
  sub_kategori?: string | null;
  is_header?: boolean | null;
}

interface LedgerDetailRow {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  kode_coa: string;
  debit: number;
  kredit: number;
  business_unit: string;
  region_name: string | null;
  estate_name: string | null;
  division_name: string | null;
  block_code: string | null;
}

/* =========================
   FORMAT SHEET NAME
========================= */

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
}

function formatSheetName(kode: string, nama: string): string {
  return sanitizeSheetName(`${kode}-${nama}`);
}

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

/* =========================
   HEADER STYLE
========================= */

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    color: {
      argb: "000000",
    },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "F4CCCC",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },
    left: {
      style: "thin",
    },
    bottom: {
      style: "thin",
    },
    right: {
      style: "thin",
    },
  };
}

/* =========================
   SECTION STYLE
========================= */

function applySectionStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "D9EAD3",
    },
  };
}

/* =========================
   TOTAL STYLE
========================= */

function applyTotalStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "D9D9D9",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },
    bottom: {
      style: "double",
    },
  };
}

/* =========================
   TITLE
========================= */

function createTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  division: string,
  section: string,
  reportTitle: string,
  periode: string,
  printDate: string,
): void {
  sheet.mergeCells("A1:I1");

  sheet.getCell("A1").value = reportTitle;

  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:I2");

  sheet.getCell("A2").value = companyTitle;

  sheet.getCell("A2").font = {
    bold: true,
    size: 15,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:I3");

  sheet.getCell("A3").value = section;

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A5").value = `DIVISI : ${division}`;
  sheet.getCell("A6").value = `PERIODE : ${periode}`;
  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;
  sheet.getCell("A8").value = "MATA UANG : Rupiah (IDR)";
  sheet.mergeCells("A9:I9");
  const divider = sheet.getCell("A9");

  divider.border = {
    bottom: {
      style: "medium",
    },
  };

  divider.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "EDEDED",
    },
  };
}

/* =========================
   SIGNATURE
========================= */

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  sheet.getCell(`B${row}`).value = "Direksi";

  sheet.getCell(`H${row}`).value = "Manager";

  sheet.getCell(`B${row}`).font = {
    bold: true,
  };

  sheet.getCell(`H${row}`).font = {
    bold: true,
  };

  sheet.getCell(`B${row + 4}`).value = "(_________________)";

  sheet.getCell(`H${row + 4}`).value = "(_________________)";

  sheet.getCell(`B${row + 5}`).value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell(`H${row + 5}`).value = "Finance Manager";
}

/* =========================
   SAFE HYPERLINK
========================= */

function setInternalHyperlink(
  cell: ExcelJS.Cell,
  text: string,
  targetSheet: string,
): void {
  const safeSheet = sanitizeSheetName(targetSheet);

  cell.value = {
    text,
    hyperlink: `#'${safeSheet}'!A1`,
  };

  cell.font = {
    color: {
      argb: "0000FF",
    },
    underline: true,
  };
}

/* =========================
   IS HEADER
========================= */

function isHeaderAccount(row: LabaRugiRow): boolean {
  return (
    row.is_header === true ||
    row.kode.endsWith("000") ||
    Number(row.nilai) === 0
  );
}

/* =========================
   CREATE DETAIL SHEET
========================= */

async function createDetailSheet(
  workbook: ExcelJS.Workbook,
  row: LabaRugiRow,
  ledgerRows: LedgerDetailRow[],
  periode: string,
  printDate: string,
): Promise<void> {
  const detailSheetName = formatSheetName(row.kode, row.nama);

  const detailSheet = workbook.addWorksheet(detailSheetName);

  const accountDetails = ledgerRows
    .filter(
      (item): boolean =>
        String(item.kode_coa).trim() === String(row.kode).trim(),
    )
    .sort((a, b): number => {
      const dateA = new Date(a.tanggal).getTime();

      const dateB = new Date(b.tanggal).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return String(a.no_bukti).localeCompare(String(b.no_bukti));
    });

  const firstRow = accountDetails[0];

  const division =
    firstRow?.business_unit === "KEBUN SAWIT"
      ? (firstRow.region_name ?? "KEBUN SAWIT")
      : "CORPORATE";

  const section =
    firstRow?.business_unit === "KEBUN SAWIT"
      ? "JASA PERKEBUNAN SAWIT"
      : "JASA CUT & FILL DAN PENGURUGAN TANAH";

  createTitle(
    detailSheet,
    "PT. Haemes Mandiri Sejahterabanta",
    division,
    section,
    "LABA RUGI",
    periode,
    printDate,
  );

  detailSheet.columns = [
    { width: 15 }, // tanggal
    { width: 25 }, // voucher
    { width: 18 }, // wilayah
    { width: 20 }, // estate
    { width: 20 }, // divisi
    { width: 18 }, // block
    { width: 45 }, // keterangan
    { width: 18 }, // debit
    { width: 18 }, // kredit
    { width: 18 }, // saldo
  ];

  setInternalHyperlink(
    detailSheet.getCell("A10"),
    "Kembali ke Laba Rugi",
    "Laba Rugi",
  );

  detailSheet.getRow(11).values = [
    "Tanggal",
    "Voucher",
    "Wilayah",
    "Estate",
    "Divisi",
    "Block",
    "Keterangan",
    "Debit",
    "Kredit",
    "Saldo",
  ];

  for (let col = 1; col <= 9; col++) {
    applyHeaderStyle(detailSheet.getCell(11, col));
  }

  let detailRow = 12;
  let saldo = 0;

  const isPendapatan = row.kode.startsWith("4");
  const isHpp = row.kode.startsWith("5");
  const isBeban = row.kode.startsWith("6");

  for (const item of accountDetails) {
    if (isPendapatan) {
      saldo += Number(item.kredit) - Number(item.debit);
    } else if (isHpp || isBeban) {
      saldo += Number(item.debit) - Number(item.kredit);
    }

    detailSheet.getCell(`A${detailRow}`).value = new Date(
      item.tanggal,
    ).toLocaleDateString("id-ID");

    detailSheet.getCell(`B${detailRow}`).value = item.no_bukti;

    detailSheet.getCell(`C${detailRow}`).value = item.region_name ?? "-";

    detailSheet.getCell(`D${detailRow}`).value = item.estate_name ?? "-";

    detailSheet.getCell(`E${detailRow}`).value = item.block_code ?? "-";

    detailSheet.getCell(`F${detailRow}`).value = item.keterangan;

    detailSheet.getCell(`G${detailRow}`).value =
      Number(item.debit) > 0 ? Number(item.debit) : "";

    detailSheet.getCell(`H${detailRow}`).value =
      Number(item.kredit) > 0 ? Number(item.kredit) : "";

    detailSheet.getCell(`I${detailRow}`).value = saldo;

    for (let col = 7; col <= 9; col++) {
      detailSheet.getCell(detailRow, col).numFmt = ACCOUNTING_FORMAT;
    }

    detailRow++;
  }

  detailSheet.mergeCells(`A${detailRow}:H${detailRow}`);

  detailSheet.getCell(`A${detailRow}`).value = "Saldo Akhir";

  detailSheet.getCell(`I${detailRow}`).value = saldo;

  detailSheet.getCell(`I${detailRow}`).numFmt = ACCOUNTING_FORMAT;

  applyTotalStyle(detailSheet.getCell(`A${detailRow}`));

  applyTotalStyle(detailSheet.getCell(`I${detailRow}`));

  const qrValue = generateQRCodeValue({
    id: detailRow,
    sumber_modul: "LABA_RUGI",
    nilai_transaksi: Number(row.nilai),
    tanggal_transaksi: new Date().toISOString(),
  });

  const qrImage = await QRCode.toDataURL(String(qrValue));

  const imageId = workbook.addImage({
    base64: qrImage,
    extension: "png",
  });

  detailSheet.addImage(imageId, {
    tl: {
      col: 9,
      row: 11,
    },
    ext: {
      width: 90,
      height: 90,
    },
  });

  addSignature(detailSheet, detailRow + 4);
}

/* =========================
   GET
========================= */

export async function GET(): Promise<Response> {
  try {
    /* =========================
       GET DATA
    ========================= */

    const { data, error } = await db
      .from("v_laba_rugi")
      .select("*")
      .order("kode", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: LabaRugiRow[] = (data ?? []) as LabaRugiRow[];

    const { data: periode } = await db
      .from("periode")
      .select("nama_periode")
      .eq("status", "OPEN")
      .single();

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const { data: ledgerData, error: ledgerError } = await db.from(
      "v_general_ledger_report",
    ).select(`
    tanggal,
    no_bukti,
    keterangan,
    kode_coa,
    debit,
    kredit,
    business_unit,
    region_name,
    estate_name,
    division_name,
    block_code
`);

    if (ledgerError) {
      return NextResponse.json(
        {
          error: ledgerError.message,
        },
        {
          status: 500,
        },
      );
    }

    const ledgerRows: LedgerDetailRow[] = (ledgerData ??
      []) as LedgerDetailRow[];

    /* =========================
       FILTER CLEAN
    ========================= */

    const cleanRows = rows.filter(
      (row, index, self): boolean =>
        index === self.findIndex((x): boolean => x.kode === row.kode),
    );

    /* =========================
       GROUPING
    ========================= */

    const pendapatan = cleanRows.filter(
      (item): boolean => item.kode.startsWith("4") && !isHeaderAccount(item),
    );

    const hpp = cleanRows.filter(
      (item): boolean => item.kode.startsWith("5") && !isHeaderAccount(item),
    );

    const beban = cleanRows.filter(
      (item): boolean => item.kode.startsWith("6") && !isHeaderAccount(item),
    );

    /* =========================
       TOTAL
    ========================= */

    const totalPendapatan = pendapatan.reduce(
      (sum, item): number => sum + Number(item.nilai),
      0,
    );

    const totalHpp = hpp.reduce(
      (sum, item): number => sum + Math.abs(Number(item.nilai)),
      0,
    );

    const labaKotor = totalPendapatan - totalHpp;

    const totalBeban = beban.reduce(
      (sum, item): number => sum + Math.abs(Number(item.nilai)),
      0,
    );

    const labaBersih = labaKotor - totalBeban;

    /* =========================
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Laba Rugi");

    createTitle(
      sheet,
      "PT. Haemes Mandiri Sejahterabanta",
      "CORPORATE",
      "JASA CUT & FILL DAN PENGURUGAN TANAH",
      "LABA RUGI",
      periode?.nama_periode ?? "-",
      printDate,
    );

    sheet.columns = [{ width: 15 }, { width: 45 }, { width: 25 }];

    let currentRow = 11;

    /* =========================
       PENDAPATAN
    ========================= */

    sheet.mergeCells(`A${currentRow}:C${currentRow}`);

    sheet.getCell(`A${currentRow}`).value = "Pendapatan";

    applySectionStyle(sheet.getCell(`A${currentRow}`));

    currentRow++;

    for (const row of pendapatan) {
      const detailSheetName = formatSheetName(row.kode, row.nama);

      setInternalHyperlink(
        sheet.getCell(`B${currentRow}`),
        row.nama,
        detailSheetName,
      );

      sheet.getCell(`C${currentRow}`).value = Number(row.nilai);

      sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

      await createDetailSheet(
        workbook,
        row,
        ledgerRows,
        periode?.nama_periode ?? "-",
        printDate,
      );

      currentRow++;
    }

    /* =========================
       TOTAL PENDAPATAN
    ========================= */

    sheet.getCell(`B${currentRow}`).value = "Total Pendapatan";

    sheet.getCell(`C${currentRow}`).value = totalPendapatan;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       HPP
    ========================= */

    sheet.mergeCells(`A${currentRow}:C${currentRow}`);

    sheet.getCell(`A${currentRow}`).value = "Harga Pokok Penjualan";

    applySectionStyle(sheet.getCell(`A${currentRow}`));

    currentRow++;

    for (const row of hpp) {
      const detailSheetName = formatSheetName(row.kode, row.nama);

      setInternalHyperlink(
        sheet.getCell(`B${currentRow}`),
        row.nama,
        detailSheetName,
      );

      sheet.getCell(`C${currentRow}`).value = Math.abs(Number(row.nilai));

      sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

      await createDetailSheet(
        workbook,
        row,
        ledgerRows,
        periode?.nama_periode ?? "-",
        printDate,
      );

      currentRow++;
    }

    sheet.getCell(`B${currentRow}`).value = "Total Harga Pokok Penjualan";

    sheet.getCell(`C${currentRow}`).value = totalHpp;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       LABA KOTOR
    ========================= */

    sheet.getCell(`B${currentRow}`).value = "TOTAL LABA KOTOR";

    sheet.getCell(`C${currentRow}`).value = labaKotor;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       BEBAN
    ========================= */

    sheet.mergeCells(`A${currentRow}:C${currentRow}`);

    sheet.getCell(`A${currentRow}`).value = "Beban Operasional";

    applySectionStyle(sheet.getCell(`A${currentRow}`));

    currentRow++;

    for (const row of beban) {
      const detailSheetName = formatSheetName(row.kode, row.nama);

      setInternalHyperlink(
        sheet.getCell(`B${currentRow}`),
        row.nama,
        detailSheetName,
      );

      sheet.getCell(`C${currentRow}`).value = Math.abs(Number(row.nilai));

      sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

      await createDetailSheet(
        workbook,
        row,
        ledgerRows,
        periode?.nama_periode ?? "-",
        printDate,
      );

      currentRow++;
    }

    sheet.getCell(`B${currentRow}`).value = "Total Beban Operasional";

    sheet.getCell(`C${currentRow}`).value = totalBeban;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       LABA BERSIH
    ========================= */

    sheet.getCell(`B${currentRow}`).value = "LABA/(RUGI) BERSIH";

    sheet.getCell(`C${currentRow}`).value = labaBersih;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    /* =========================
       MAIN QR
    ========================= */

    const qrValue = generateQRCodeValue({
      id: cleanRows.length,
      sumber_modul: "LABA_RUGI",
      nilai_transaksi: labaBersih,
      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(String(qrValue));

    const imageId = workbook.addImage({
      base64: qrImage,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 4,
        row: currentRow + 2,
      },
      ext: {
        width: 100,
        height: 100,
      },
    });

    /* =========================
       SIGNATURE
    ========================= */

    addSignature(sheet, currentRow + 8);

    /* =========================
       EXPORT
    ========================= */

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="laba-rugi.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
