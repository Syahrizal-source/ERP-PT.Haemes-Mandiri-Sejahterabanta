import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS from "exceljs";

import * as QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================
   TYPES
========================= */

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

// const safeSheetName = (name: string): string => {
//   return name
//     .replace(/[:\\/?*\[\]]/g, "")
//     .trim()
//     .substring(0, 31);
// };

interface NeracaRow {
  kode: string;

  nama: string;

  saldo: number;
}

interface LedgerDetailRow {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  kode_coa: string;
  debit: number;
  kredit: number;
  business_unit: string | null;
  region_name: string | null;
  estate_name: string | null;
  division_name: string | null;
  block_code: string | null;
}

// interface IncomeSummary {
//   total_pendapatan: number;

//   total_beban: number;

//   laba_bersih: number;
// }

// interface PeriodeRow {
//   nama_periode: string;
// }

/* =========================
   FORMAT SHEET NAME
========================= */

function formatSheetName(kode: string, nama: string): string {
  const accountKey = `${kode}-${nama}`;

  const existing = accountSheetMap.get(accountKey);

  if (existing) {
    return existing;
  }

  const rawName = `${kode}-${nama}`.replace(/[:\\/?*\[\]]/g, "").trim();

  let safeName = rawName.substring(0, 31);

  let counter = 1;

  while (usedSheetNames.has(safeName)) {
    const suffix = `-${counter}`;

    safeName = rawName.substring(0, 31 - suffix.length) + suffix;

    counter++;
  }

  accountSheetMap.set(accountKey, safeName);

  usedSheetNames.add(safeName);

  return safeName;
}

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

    size: 12,
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

function calculateCorporateSaldo(
  kode: string,

  debit: number,

  kredit: number,
): number {
  if (
    kode.startsWith("1") ||
    kode.startsWith("5") ||
    kode.startsWith("6") ||
    kode.startsWith("7")
  ) {
    return debit - kredit;
  }

  return kredit - debit;
}

/* =========================
   TITLE
========================= */

function createTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  division: string,
  section: string,
  accountTitle: string,
  periode: string,
  printDate: string,
): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = accountTitle;

  sheet.getCell("A1").font = {
    bold: true,

    size: 22,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:F2");

  sheet.getCell("A2").value = companyTitle;

  sheet.getCell("A2").font = {
    bold: true,

    size: 15,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:F3");

  sheet.getCell("A3").value = section;

  sheet.getCell("A3").font = {
    bold: true,
    size: 12,
  };

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A5:F5");

  sheet.getCell("A5").value = `DIVISI : ${division}`;

  sheet.getCell("A5").font = {
    bold: true,
  };

  sheet.mergeCells("A6:F6");

  sheet.getCell("A6").value = `PERIODE : ${periode}`;

  sheet.getCell("A6").font = {
    bold: true,
  };

  sheet.mergeCells("A7:F7");

  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;

  sheet.getCell("A7").font = {
    bold: true,
  };

  sheet.mergeCells("A8:F8");

  sheet.getCell("A8").value = "MATA UANG : Rupiah (IDR)";

  sheet.getCell("A8").font = {
    bold: true,
  };

  sheet.mergeCells("A9:F9");

  sheet.getCell("A9").border = {
    bottom: {
      style: "double",
    },
  };

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.views = [
    {
      state: "frozen",
      ySplit: 10,
    },
  ];
}

/* =========================
   SIGNATURE
========================= */

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  sheet.getCell(`B${row}`).value = "Direksi";

  sheet.getCell(`E${row}`).value = "Manager";

  sheet.getCell(`B${row}`).font = {
    bold: true,
  };

  sheet.getCell(`E${row}`).font = {
    bold: true,
  };

  sheet.getCell(`B${row + 4}`).value = "(_________________)";

  sheet.getCell(`E${row + 4}`).value = "(_________________)";

  sheet.getCell(`B${row + 5}`).value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell(`E${row + 5}`).value = "Finance Manager";
}

/* =========================
   DETAIL SHEET
========================= */
const accountSheetMap = new Map<string, string>();
const usedSheetNames = new Set<string>();

async function buildDetailSheet(
  workbook: ExcelJS.Workbook,
  account: NeracaRow,
  ledgerRows: LedgerDetailRow[],
  periode: string,
  printDate: string,
): Promise<void> {
  const sheetName = formatSheetName(account.kode, account.nama);

  if (workbook.getWorksheet(sheetName)) {
    return;
  }

  const sheet = workbook.addWorksheet(sheetName);

  const details = ledgerRows
    .filter((item): boolean => item.kode_coa === account.kode)
    .sort((a, b): number => {
      const dateA = new Date(a.tanggal).getTime();

      const dateB = new Date(b.tanggal).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return a.no_bukti.localeCompare(b.no_bukti);
    });

  const firstRow = details[0];

  const division =
    firstRow?.business_unit === "KEBUN SAWIT"
      ? (firstRow.region_name ?? "KEBUN SAWIT")
      : "CORPORATE";

  const section =
    firstRow?.business_unit === "KEBUN SAWIT"
      ? "JASA PERKEBUNAN SAWIT"
      : "JASA CUT & FILL DAN PENGURUGAN TANAH";

  createTitle(
    sheet,
    "PT. Haemes Mandiri Sejahterabanta",
    division,
    section,
    "NERACA",
    periode,
    printDate,
  );

  sheet.columns = [
    {
      width: 15,
    },

    {
      width: 20,
    },

    {
      width: 40,
    },

    {
      width: 18,
    },

    {
      width: 18,
    },

    {
      width: 18,
    },
  ];

  const headerRow = 11;

  sheet.getRow(headerRow).values = [
    "Tanggal",
    "No Bukti",
    "Keterangan",
    "Debit",
    "Kredit",
    "Saldo",
  ];

  for (let col = 1; col <= 6; col++) {
    applyHeaderStyle(sheet.getCell(headerRow, col));
  }

  let rowNumber = headerRow + 1;

  let saldo = 0;

  for (const item of details) {
    saldo += calculateCorporateSaldo(
      account.kode,
      Number(item.debit),
      Number(item.kredit),
    );

    sheet.getCell(`A${rowNumber}`).value = new Date(
      item.tanggal,
    ).toLocaleDateString("id-ID");

    sheet.getCell(`B${rowNumber}`).value = item.no_bukti;

    sheet.getCell(`C${rowNumber}`).value = item.keterangan;

    sheet.getCell(`D${rowNumber}`).value =
      Number(item.debit) > 0 ? Number(item.debit) : "";

    sheet.getCell(`E${rowNumber}`).value =
      Number(item.kredit) > 0 ? Number(item.kredit) : "";

    sheet.getCell(`F${rowNumber}`).value =
      saldo < 0 ? `(${Math.abs(saldo).toLocaleString("id-ID")})` : saldo;

    for (let col = 4; col <= 6; col++) {
      sheet.getCell(rowNumber, col).numFmt = "#,##0;(#,##0)";
    }

    rowNumber++;
  }

  sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

  sheet.getCell(`A${rowNumber}`).value = "Saldo Akhir";

  sheet.getCell(`F${rowNumber}`).value =
    saldo < 0 ? `(${Math.abs(saldo).toLocaleString("id-ID")})` : saldo;

  applyTotalStyle(sheet.getCell(`A${rowNumber}`));

  applyTotalStyle(sheet.getCell(`F${rowNumber}`));

  sheet.getCell(`F${rowNumber}`).numFmt = ACCOUNTING_FORMAT;

  /* =========================
     BACK LINK
  ========================= */

  sheet.getCell("H2").value = {
    text: "Kembali ke Neraca",

    hyperlink: "#'Neraca'!A1",
  };

  sheet.getCell("H2").font = {
    color: {
      argb: "0000FF",
    },

    underline: true,

    bold: true,
  };

  /* =========================
     QR CODE
  ========================= */

  const qrValue = generateQRCodeValue({
    id: rowNumber,

    sumber_modul: "NERACA",

    nilai_transaksi: saldo,

    tanggal_transaksi: new Date().toISOString(),
  });

  const qrImage = await QRCode.toDataURL(String(qrValue));

  const imageId = workbook.addImage({
    base64: qrImage,

    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: {
      col: 7,
      row: 2,
    },

    ext: {
      width: 90,
      height: 90,
    },
  });

  addSignature(sheet, rowNumber + 5);
}

/* =========================
   GET
========================= */

export async function GET(): Promise<Response> {
  try {
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
    /* =========================
       GET NERACA
    ========================= */

    const { data, error } = await db
      .from("v_neraca")
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

    const rows: NeracaRow[] = data ?? [];

    /* =========================
       GET LEDGER
    ========================= */

    const {
      data: ledgerData,

      error: ledgerError,
    } = await db
      .from("v_general_ledger_report")
      .select(
        `
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
`,
      )
      .order("tanggal", {
        ascending: true,
      });

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
       GROUPING
    ========================= */

    const asetLancar = rows.filter(
      (item): boolean =>
        item.kode.startsWith("1") &&
        !item.kode.startsWith("15") &&
        (item.nama.includes("Kas") ||
          item.nama.includes("Bank") ||
          item.nama.includes("Piutang") ||
          item.nama.includes("Persediaan") ||
          item.nama.includes("PPN") ||
          item.nama.includes("Uang Muka")),
    );

    const asetTetap = rows.filter(
      (item): boolean =>
        item.kode.startsWith("15") ||
        item.nama.includes("Aset") ||
        item.nama.includes("Mesin") ||
        item.nama.includes("Bangunan") ||
        item.nama.includes("Kendaraan") ||
        item.nama.includes("Akumulasi"),
    );

    const aset = rows.filter(
      (item): boolean => item.kode.startsWith("1") && item.kode !== "10000",
    );

    const kewajiban = rows.filter((item): boolean => item.kode.startsWith("2"));

    const ekuitas = rows.filter((item): boolean => item.kode.startsWith("3"));

    const totalAset: number = aset.reduce(
      (sum: number, item): number => sum + Math.abs(Number(item.saldo ?? 0)),
      0,
    );

    const totalKewajiban: number = kewajiban.reduce(
      (sum: number, item): number => sum + Math.abs(Number(item.saldo ?? 0)),
      0,
    );

    const pendapatan: number = rows
      .filter((item): boolean => item.kode.startsWith("4"))
      .reduce(
        (sum: number, item): number => sum + Math.abs(Number(item.saldo ?? 0)),
        0,
      );
    const beban: number = rows
      .filter(
        (item): boolean =>
          item.kode.startsWith("5") ||
          item.kode.startsWith("6") ||
          item.kode.startsWith("7"),
      )
      .reduce(
        (sum: number, item): number => sum + Math.abs(Number(item.saldo ?? 0)),
        0,
      );

    const labaBersih: number = pendapatan - beban;

    const totalEkuitas: number =
      ekuitas.reduce(
        (sum: number, item): number => sum + Math.abs(Number(item.saldo ?? 0)),
        0,
      ) + Number(labaBersih);

    const totalPasiva: number =
      Math.abs(totalKewajiban) + Math.abs(totalEkuitas);

    /* =========================
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Neraca");

    createTitle(
      sheet,
      "PT. Haemes Mandiri Sejahterabanta",
      "CORPORATE",
      "JASA CUT & FILL DAN PENGURUGAN TANAH",
      "NERACA",
      periode?.nama_periode ?? "-",
      printDate,
    );

    sheet.columns = [
      {
        width: 15,
      },

      {
        width: 45,
      },

      {
        width: 25,
      },
    ];

    let currentRow = 12;

    /* =========================
       BUILDER
    ========================= */

    async function addSection(
      title: string,

      dataRows: NeracaRow[],
    ): Promise<void> {
      sheet.mergeCells(`A${currentRow}:C${currentRow}`);

      sheet.getCell(`A${currentRow}`).value = title;

      applySectionStyle(sheet.getCell(`A${currentRow}`));

      currentRow++;

      for (const row of dataRows) {
        const sheetName = formatSheetName(row.kode, row.nama);

        const linkCell = sheet.getCell(`B${currentRow}`);

        linkCell.value = {
          text: row.nama,

          hyperlink: `#'${sheetName}'!A1`,
        };

        linkCell.font = {
          color: {
            argb: "0000FF",
          },

          underline: true,
        };

        const corporateSaldo =
          Number(row.saldo) < 0
            ? Math.abs(Number(row.saldo))
            : Number(row.saldo);

        sheet.getCell(`C${currentRow}`).value = corporateSaldo;

        sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

        await buildDetailSheet(
          workbook,
          row,
          ledgerRows,
          periode?.nama_periode ?? "-",
          printDate,
        );

        currentRow++;
      }

      currentRow++;
    }

    /* =========================
       ASET
    ========================= */

    await addSection("ASET LANCAR", asetLancar);

    await addSection("ASET TETAP", asetTetap);

    sheet.getCell(`B${currentRow}`).value = "TOTAL ASET";

    sheet.getCell(`C${currentRow}`).value = totalAset;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       KEWAJIBAN
    ========================= */

    await addSection("KEWAJIBAN", kewajiban);

    sheet.getCell(`B${currentRow}`).value = "TOTAL KEWAJIBAN";

    sheet.getCell(`C${currentRow}`).value = totalKewajiban;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow += 2;

    /* =========================
       EKUITAS
    ========================= */

    await addSection("EKUITAS", ekuitas);

    sheet.getCell(`B${currentRow}`).value = "TOTAL EKUITAS";

    sheet.getCell(`C${currentRow}`).value = totalEkuitas;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow++;

    /* =========================
       TOTAL PASIVA
    ========================= */

    sheet.getCell(`B${currentRow}`).value = "TOTAL PASIVA";

    sheet.getCell(`C${currentRow}`).value = totalPasiva;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    /* =========================
       QR CODE
    ========================= */

    const qrValue = generateQRCodeValue({
      id: rows.length,

      sumber_modul: "NERACA",

      nilai_transaksi: totalPasiva,

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

    workbook.eachSheet((worksheet): void => {
      worksheet.columns.forEach((column): void => {
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

        column.width = Math.min(Math.max(maxLength + 3, 12), 45);
      });
    });

    /* =========================
       EXPORT
    ========================= */

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="neraca.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}
