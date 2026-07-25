import { NextResponse } from "next/server";

import ExcelJS from "exceljs";

import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */

interface BukuKasRow {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  debit: number;

  kredit: number;

  kode_coa: string;

  nama_coa: string;

  kategori: "KAS_BESAR" | "KAS_KECIL";
}

const ACCOUNTING_FORMAT = "#,##0;(#,##0)";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/* =========================
   FORMAT
========================= */

function border(cell: ExcelJS.Cell): void {
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

function currency(cell: ExcelJS.Cell): void {
  cell.numFmt = "#,##0;[Red](#,##0)";
}

function headerStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "1F4E78",
    },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  border(cell);
}

function createTitle(sheet: ExcelJS.Worksheet, sheetName: string): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "BUKU KAS CORPORATE";

  sheet.getCell("A1").font = {
    bold: true,
    size: 20,
  };

  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.mergeCells("A3:F3");

  sheet.getCell("A3").value = sheetName;

  sheet.getCell("A3").font = {
    bold: true,
  };

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.views = [
    {
      state: "frozen",
      ySplit: 5,
    },
  ];
}

function totalStyle(cell: ExcelJS.Cell): void {
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

  border(cell);
}

/* =========================
   MONTH NAME
========================= */

function getMonthName(month: number): string {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  return months[month];
}

/* =========================
   GET
========================= */

export async function GET() {
  try {
    /* =========================
       LOAD DETAIL
    ========================= */

    const { data: detailData, error: detailError } = await db.from(
      "jurnal_detail",
    ).select(`
        id_jurnal,
        id_coa,
        debit,
        kredit
      `);

    if (detailError) {
      throw detailError;
    }

    /* =========================
       LOAD JURNAL
    ========================= */

    const { data: jurnalData, error: jurnalError } = await db.from("jurnal")
      .select(`
        id_jurnal,
        tanggal,
        no_bukti,
        keterangan,
        is_posted
      `);

    if (jurnalError) {
      throw jurnalError;
    }

    /* =========================
       LOAD COA
    ========================= */

    const { data: coaData, error: coaError } = await db.from("coa").select(`
        id_coa,
        kode,
        nama,
        is_cash
      `);

    if (coaError) {
      throw coaError;
    }

    /* =========================
       NORMALIZE
    ========================= */

    const rows: BukuKasRow[] = [];

    for (const item of detailData ?? []) {
      const jurnal = jurnalData?.find(
        (jurnalItem): boolean => jurnalItem.id_jurnal === item.id_jurnal,
      );

      const coa = coaData?.find(
        (coaItem): boolean => coaItem.id_coa === item.id_coa,
      );

      if (!jurnal || !coa) {
        continue;
      }

      /* =========================
         POSTED ONLY
      ========================= */

      if (jurnal.is_posted !== true) {
        continue;
      }

      /* =========================
   KAS BESAR & KAS KECIL
========================= */

      const kodeCoa = coa.kode.trim();

      const kasBesarCodes: string[] = [
        "1010",
        "1011",
        "1012",
        "1013",
        "1014",
        "11002",
        "11003",
      ];

      const kasKecilCodes: string[] = [
        "11000",
        "11001",
        "11010",
        "11020",
        "11030",
        "11040",
      ];

      const isKasBesar = kasBesarCodes.includes(kodeCoa);

      const isKasKecil = kasKecilCodes.includes(kodeCoa);

      if (!isKasBesar && !isKasKecil) {
        continue;
      }

      const noBukti = jurnal.no_bukti.trim().toLowerCase();

      /* =========================
         FILTER TECHNICAL
      ========================= */

      if (
        noBukti.startsWith("cls-") ||
        noBukti.startsWith("close-") ||
        noBukti.startsWith("open-") ||
        noBukti.startsWith("rev-")
      ) {
        continue;
      }

      rows.push({
        tanggal: jurnal.tanggal,

        no_bukti: jurnal.no_bukti,

        keterangan: jurnal.keterangan,

        debit: Number(item.debit ?? 0),

        kredit: Number(item.kredit ?? 0),

        kode_coa: coa.kode,

        nama_coa: coa.nama,

        kategori: isKasBesar ? "KAS_BESAR" : "KAS_KECIL",
      });
    }

    /* =========================
       REMOVE DUPLICATE
    ========================= */

    const unique = new Map<string, BukuKasRow>();

    for (const row of rows) {
      const key = [
        row.tanggal,
        row.no_bukti,
        row.keterangan,
        row.debit,
        row.kredit,
      ].join("-");

      if (!unique.has(key)) {
        unique.set(key, row);
      }
    }

    const cleanRows = Array.from(unique.values());

    /* =========================
       SORT
    ========================= */

    cleanRows.sort((a, b) => {
      return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });

    /* =========================
   GROUP CATEGORY
========================= */

    const grouped = new Map<string, Map<string, BukuKasRow[]>>();

    for (const row of cleanRows) {
      const sheetGroup =
        row.kategori === "KAS_BESAR" ? "KAS BESAR" : "KAS KECIL";

      const coaSheet = `${row.kode_coa}-${row.nama_coa}`;

      if (!grouped.has(sheetGroup)) {
        grouped.set(sheetGroup, new Map<string, BukuKasRow[]>());
      }

      const coaMap = grouped.get(sheetGroup);

      if (!coaMap?.has(coaSheet)) {
        coaMap?.set(coaSheet, []);
      }

      coaMap?.get(coaSheet)?.push(row);
    }

    /* =========================
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    for (const [groupName, coaSheets] of grouped) {
      /* =========================
     INDEX SHEET
  ========================= */

      const indexSheet = workbook.addWorksheet(groupName);

      createTitle(indexSheet, groupName);

      indexSheet.columns = [{ width: 8 }, { width: 40 }];

      const indexHeader = indexSheet.getRow(6);

      indexHeader.values = ["No", "Nama Sheet"];

      headerStyle(indexSheet.getCell("A6"));

      headerStyle(indexSheet.getCell("B6"));

      let indexRow = 7;

      /* =========================
     DETAIL SHEET
  ========================= */
      const allKasBesar: string[] = [
        "1010-BNI",
        "1011-DANAMON",
        "1012-MANDIRI",
        "1013-ARTHA GRAHA",
        "1014-BNI - 1918768145",
        "11002-Bank",
        "11003-Giro",
        "11999-Clearing Bank",
      ];

      const allKasKecil: string[] = [
        "11000-Kas",
        "11001-Kas Kecil",
        "11010-Kas Armada",
        "11020-Kas Alat Berat",
        "11030-Kas Proyek",
        "11040-Kas Kebun Sawit",
      ];

      const allIndexSheets =
        groupName === "KAS BESAR" ? allKasBesar : allKasKecil;

      /* =========================
   REMOVE DUPLICATE INDEX
========================= */

      const uniqueSheets = [...new Set(allIndexSheets)];

      for (const coaSheetName of uniqueSheets) {
        const sheetRows = coaSheets.get(coaSheetName) ?? [];
        /* =========================
   PREVENT DUPLICATE DETAIL
========================= */

        if (workbook.getWorksheet(coaSheetName.substring(0, 31))) {
          continue;
        }

        const safeSheetName = coaSheetName.substring(0, 31);

        /* =========================
   INDEX LINK
========================= */

        indexSheet.getCell(`A${indexRow}`).value = indexRow - 6;

        if (sheetRows.length > 0) {
          indexSheet.getCell(`B${indexRow}`).value = {
            text: coaSheetName,

            hyperlink: `#'${coaSheetName.substring(0, 31)}'!A1`,
          };

          indexSheet.getCell(`B${indexRow}`).font = {
            color: {
              argb: "0000FF",
            },

            underline: true,
          };
        } else {
          indexSheet.getCell(`B${indexRow}`).value = coaSheetName;
        }

        border(indexSheet.getCell(`A${indexRow}`));

        border(indexSheet.getCell(`B${indexRow}`));

        indexRow++;

        /* =========================
   SKIP EMPTY DETAIL
========================= */

        if (sheetRows.length === 0) {
          continue;
        }

        const detailSheet = workbook.addWorksheet(safeSheetName);

        createTitle(detailSheet, coaSheetName);

        /* =========================
       INDEX LINK
    ========================= */

        indexSheet.getCell(`A${indexRow}`).value = indexRow - 6;

        indexSheet.getCell(`B${indexRow}`).value = {
          text: coaSheetName,

          hyperlink: `#'${safeSheetName}'!A1`,
        };

        indexSheet.getCell(`B${indexRow}`).font = {
          color: {
            argb: "0000FF",
          },

          underline: true,
        };

        border(indexSheet.getCell(`A${indexRow}`));

        border(indexSheet.getCell(`B${indexRow}`));

        indexRow++;

        /* =========================
       COLUMN
    ========================= */

        detailSheet.columns = [
          { width: 15 },
          { width: 30 },
          { width: 55 },
          { width: 18 },
          { width: 18 },
          { width: 22 },
        ];

        /* =========================
       HEADER
    ========================= */

        const header = detailSheet.getRow(6);

        header.values = ["Tanggal", "Voucher", "Uraian", "D", "K", "Saldo"];

        for (let col = 1; col <= 6; col++) {
          headerStyle(detailSheet.getCell(6, col));
        }

        /* =========================
       DATA
    ========================= */

        let rowNumber = 7;

        let saldo = 0;

        for (const row of sheetRows) {
          saldo += row.debit - row.kredit;

          detailSheet.getCell(`A${rowNumber}`).value = new Date(row.tanggal);

          detailSheet.getCell(`A${rowNumber}`).numFmt = "dd/mm/yyyy";

          /* =========================
         VOUCHER TANPA LINK
      ========================= */

          detailSheet.getCell(`B${rowNumber}`).value = row.no_bukti;

          detailSheet.getCell(`C${rowNumber}`).value = row.keterangan;

          detailSheet.getCell(`D${rowNumber}`).value = row.debit;

          detailSheet.getCell(`E${rowNumber}`).value = row.kredit;

          detailSheet.getCell(`F${rowNumber}`).value = saldo;

          currency(detailSheet.getCell(`D${rowNumber}`));

          currency(detailSheet.getCell(`E${rowNumber}`));

          currency(detailSheet.getCell(`F${rowNumber}`));

          for (let col = 1; col <= 6; col++) {
            border(detailSheet.getCell(rowNumber, col));
          }

          rowNumber++;
        }

        /* =========================
       FOOTER
    ========================= */

        detailSheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

        detailSheet.getCell(`A${rowNumber}`).value = "SALDO AKHIR";

        detailSheet.getCell(`F${rowNumber}`).value = saldo;

        totalStyle(detailSheet.getCell(`A${rowNumber}`));

        totalStyle(detailSheet.getCell(`F${rowNumber}`));

        currency(detailSheet.getCell(`F${rowNumber}`));

        for (let col = 1; col <= 6; col++) {
          border(detailSheet.getCell(rowNumber, col));
        }
      }
    }

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

    return new NextResponse(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="buku-kas-corporate.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error("BUKU KAS CORPORATE ERROR:", error);

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
