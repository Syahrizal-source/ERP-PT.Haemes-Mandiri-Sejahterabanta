import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS from "exceljs";

import * as QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";
import { getJournalDivision } from "@/lib/accounting/journalDivision";

/* =========================
   TYPES
========================= */
const ACCOUNTING_NUMBER_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

interface CashflowCorporateRow {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  kategori_cashflow: "OPERATING" | "INVESTING" | "FINANCING";

  kas_masuk: number;

  kas_keluar: number;

  arus_kas_bersih: number;
}

interface DivisionGroup {
  division: string;
  rows: CashflowCorporateRow[];
}

function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column): void => {
    let maxLength = 10;

    column.eachCell?.({ includeEmpty: true }, (cell): void => {
      const value = String(cell.value ?? "");

      maxLength = Math.max(maxLength, value.length + 2);
    });

    column.width = Math.min(maxLength, 50);
  });
}

/* =========================
   FORMAT SHEET
========================= */

function formatSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
}

/* =========================
   HEADER STYLE
========================= */

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,

    color: {
      argb: "FFFFFF",
    },

    size: 12,
  };

  cell.alignment = {
    horizontal: "center",

    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "1F4E78",
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
   TOTAL STYLE
========================= */

function applyTotalStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,

    color: {
      argb: "000000",
    },
  };

  cell.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "8DB4FF",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },

    bottom: {
      style: "double",
    },

    left: {
      style: "thin",
    },

    right: {
      style: "thin",
    },
  };
}

/* =========================
   NUMBER FORMAT
========================= */

function formatCurrencyCell(cell: ExcelJS.Cell): void {
  cell.numFmt = ACCOUNTING_NUMBER_FORMAT;
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
  sheet.mergeCells("A1:E1");

  sheet.getCell("A1").value = companyTitle;

  sheet.getCell("A1").font = {
    bold: true,

    color: {
      argb: "FFFFFF",
    },

    size: 16,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A1").fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "1F4E78",
    },
  };

  sheet.mergeCells("A2:E2");

  sheet.getCell("A2").value = reportTitle;

  sheet.getCell("A2").font = {
    bold: true,

    color: {
      argb: "FFFFFF",
    },

    size: 14,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A2").fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "1F4E78",
    },
  };

  sheet.mergeCells("A3:E3");

  sheet.getCell("A3").value = section;

  sheet.getCell("A3").font = {
    bold: true,

    color: {
      argb: "FFFFFF",
    },
  };

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A3").fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "1F4E78",
    },
  };

  sheet.getCell("A5").value = `DIVISI : ${division}`;
  sheet.getCell("A6").value = `PERIODE : ${periode}`;
  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;
}

/* =========================
   SIGNATURE
========================= */

function addSignature(
  sheet: ExcelJS.Worksheet,

  row: number,
): void {
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

async function buildDetailSheet(
  workbook: ExcelJS.Workbook,

  kategori: string,

  rows: CashflowCorporateRow[],
  periode: string,
  printDate: string,
): Promise<void> {
  const sheet = workbook.addWorksheet(formatSheetName(kategori));

  const uniqueRows = new Map<string, CashflowCorporateRow>();

  for (const row of rows) {
    const uniqueKey = [
      row.tanggal,
      row.no_bukti,
      row.keterangan.trim().toLowerCase(),
      Number(row.kas_masuk),
      Number(row.kas_keluar),
    ].join("|");

    if (!uniqueRows.has(uniqueKey)) {
      uniqueRows.set(uniqueKey, row);
    }
  }

  const detailRows = Array.from(uniqueRows.values());

  const firstRow = detailRows[0];

  const aktivitas = firstRow.kategori_cashflow;

  const divisi = getJournalDivision(firstRow.kode_coa);

  const keterangan = firstRow.keterangan;

  createTitle(
    sheet,
    "PT. Haemes Mandiri Sejahterabanta",
    divisi,
    "JASA CUT & FILL DAN PENGURUGAN TANAH",
    "DETAIL ARUS KAS",
    periode,
    printDate,
  );

  sheet.getCell("A8").value = `AKTIVITAS : ${aktivitas}`;

  sheet.getCell("A9").value = `KETERANGAN : ${keterangan}`;

  sheet.getCell("A10").value = "";
  sheet.views = [
    {
      state: "frozen",
      ySplit: 6,
    },
  ];

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

  sheet.getRow(14).values = [
    "Tanggal",
    "No Bukti",
    "Keterangan",
    "Kas Masuk",
    "Kas Keluar",
    "Saldo",
  ];
  sheet.autoFilter = {
    from: "A14",
    to: "F14",
  };

  for (let col = 1; col <= 6; col++) {
    applyHeaderStyle(sheet.getCell(14, col));
  }

  let rowNumber = 15;

  let saldo = 0;

  for (const item of detailRows) {
    saldo += Number(item.kas_masuk) - Number(item.kas_keluar);

    sheet.getCell(`A${rowNumber}`).value = new Date(
      item.tanggal,
    ).toLocaleDateString("id-ID");

    sheet.getCell(`B${rowNumber}`).value = item.no_bukti;

    sheet.getCell(`C${rowNumber}`).value = item.keterangan;

    sheet.getCell(`D${rowNumber}`).value = Number(item.kas_masuk);

    sheet.getCell(`E${rowNumber}`).value = Number(item.kas_keluar);

    sheet.getCell(`F${rowNumber}`).value = saldo;

    formatCurrencyCell(sheet.getCell(`D${rowNumber}`));

    formatCurrencyCell(sheet.getCell(`E${rowNumber}`));

    formatCurrencyCell(sheet.getCell(`F${rowNumber}`));

    rowNumber++;
  }

  sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

  sheet.getCell(`A${rowNumber}`).value = "SALDO AKHIR";

  sheet.getCell(`F${rowNumber}`).value = saldo;

  applyTotalStyle(sheet.getCell(`A${rowNumber}`));

  applyTotalStyle(sheet.getCell(`F${rowNumber}`));

  formatCurrencyCell(sheet.getCell(`F${rowNumber}`));

  sheet.getCell("A2").value = {
    text: "Kembali ke Cashflow",

    hyperlink: "#'Cashflow'!A1",
  };

  sheet.getCell("A2").font = {
    color: {
      argb: "1F4E78",
    },

    underline: true,

    bold: true,
  };

  const totalKategori = rows.reduce(
    (sum, item) => sum + Number(item.arus_kas_bersih),
    0,
  );

  const qrValue = generateQRCodeValue({
    id: rows.length,

    sumber_modul: kategori,

    nilai_transaksi: totalKategori,

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
    const { data, error } = await db
      .from("v_cashflow_corporate")
      .select("*")
      .order("tanggal", {
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

    const rows: CashflowCorporateRow[] = data ?? [];

    const cleanRows: CashflowCorporateRow[] = rows.filter((item): boolean => {
      const noBukti = item.no_bukti.toLowerCase();

      const keterangan = item.keterangan.toLowerCase();

      return (
        !noBukti.startsWith("rev-") &&
        !noBukti.startsWith("open-") &&
        !noBukti.startsWith("cls-") &&
        !keterangan.includes("opening") &&
        !keterangan.includes("reversal") &&
        !keterangan.includes("saldo awal")
      );
    });

    const validRows = cleanRows.filter(
      (item): boolean => Boolean(item.tanggal) && Boolean(item.keterangan),
    );

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

    const operating = validRows.filter(
      (item): boolean => item.kategori_cashflow === "OPERATING",
    );

    const investing = validRows.filter(
      (item): boolean => item.kategori_cashflow === "INVESTING",
    );

    const financing = validRows.filter(
      (item): boolean => item.kategori_cashflow === "FINANCING",
    );

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Cashflow");

    createTitle(
      sheet,
      "PT. Haemes Mandiri Sejahterabanta",
      "CORPORATE",
      "JASA CUT & FILL DAN PENGURUGAN TANAH",
      "LAPORAN ARUS KAS",
      periode?.nama_periode ?? "",
      printDate,
    );
    sheet.views = [
      {
        state: "frozen",
        ySplit: 12,
      },
    ];

    sheet.columns = [
      {
        width: 60,
      },

      {
        width: 25,
      },
    ];

    let currentRow = 12;

    function addSectionTitle(title: string): void {
      sheet.mergeCells(`A${currentRow}:B${currentRow}`);

      sheet.getCell(`A${currentRow}`).value = title;

      sheet.getCell(`A${currentRow}`).font = {
        bold: true,
      };

      currentRow++;
    }

    function groupCashflowRows(
      dataRows: CashflowCorporateRow[],
    ): CashflowCorporateRow[] {
      const groupedMap = new Map<string, CashflowCorporateRow>();

      for (const item of dataRows) {
        const division = getJournalDivision(item.kode_coa);

        const key = [
          item.kategori_cashflow,
          division,
          item.kode_coa,
          item.keterangan.trim(),
        ].join("-");

        const existing = groupedMap.get(key);

        const kasMasuk = Number(item.kas_masuk) || 0;

        const kasKeluar = Number(item.kas_keluar) || 0;

        const arusKas = Number(item.arus_kas_bersih) || 0;

        if (existing) {
          existing.kas_masuk = Number(existing.kas_masuk) + kasMasuk;

          existing.kas_keluar = Number(existing.kas_keluar) + kasKeluar;

          existing.arus_kas_bersih = Number(existing.arus_kas_bersih) + arusKas;
        } else {
          groupedMap.set(key, {
            ...item,

            kas_masuk: kasMasuk,

            kas_keluar: kasKeluar,

            arus_kas_bersih: arusKas,
          });
        }
      }

      return Array.from(groupedMap.values());
    }

    const createdSheets = new Set<string>();

    async function addSection(
      title: string,

      dataRows: CashflowCorporateRow[],
    ): Promise<number> {
      let total = 0;
      addSectionTitle(title);
      const divisionGroups = new Map<string, DivisionGroup>();
      for (const row of dataRows) {
        const division = getJournalDivision(row.kode_coa);

        const existing = divisionGroups.get(division);

        if (existing) {
          existing.rows.push(row);
        } else {
          divisionGroups.set(division, {
            division,
            rows: [row],
          });
        }
      }

      const divisionOrder = [
        "CORPORATE",
        "ACCOUNTING",
        "PAJAK",
        "ARMADA",
        "ALAT BERAT",
        "PROYEK",
        "KEBUN SAWIT",
      ];

      for (const division of divisionOrder) {
        const divisionGroup = divisionGroups.get(division);

        if (!divisionGroup) continue;

        sheet.mergeCells(`A${currentRow}:B${currentRow}`);

        sheet.getCell(`A${currentRow}`).value = divisionGroup.division;

        currentRow++;
        const groupedRows = groupCashflowRows(divisionGroup.rows);

        for (const item of groupedRows) {
          const normalizedTitle = item.keterangan.trim().toLowerCase();

          const detailSheetName = formatSheetName(
            `${title}-${normalizedTitle}`,
          );

          sheet.getCell(`A${currentRow}`).value = {
            text: item.keterangan,

            hyperlink: `#'${detailSheetName}'!A1`,
          };

          sheet.getCell(`A${currentRow}`).font = {
            color: {
              argb: "1F4E78",
            },

            underline: true,
          };

          const detailRows = dataRows.filter(
            (row): boolean =>
              row.keterangan.trim().toLowerCase() === normalizedTitle,
          );

          if (detailRows.length > 0 && !createdSheets.has(detailSheetName)) {
            createdSheets.add(detailSheetName);

            await buildDetailSheet(
              workbook,
              detailSheetName,
              detailRows,
              periode?.nama_periode ?? "",
              printDate,
            );
          }

          sheet.getCell(`A${currentRow}`).font = {
            color: {
              argb: "1F4E78",
            },

            underline: true,
          };

          const nilai = Number(item.kas_masuk) - Number(item.kas_keluar);

          sheet.getCell(`B${currentRow}`).value = nilai;

          formatCurrencyCell(sheet.getCell(`B${currentRow}`));

          total += nilai;

          currentRow++;
        }
      }

      sheet.getCell(`A${currentRow}`).value =
        `Arus kas bersih dari aktivitas ${title.toLowerCase()}`;

      sheet.getCell(`B${currentRow}`).value = total;

      applyTotalStyle(sheet.getCell(`A${currentRow}`));

      applyTotalStyle(sheet.getCell(`B${currentRow}`));

      formatCurrencyCell(sheet.getCell(`B${currentRow}`));

      currentRow += 2;

      return total;
    }

    const totalOperating = await addSection("OPERATING", operating);

    const totalInvesting = await addSection("INVESTING", investing);

    const totalFinancing = await addSection("FINANCING", financing);

    const totalCashflow = totalOperating + totalInvesting + totalFinancing;

    sheet.getCell(`A${currentRow}`).value = "ARUS KAS BERSIH";

    sheet.getCell(`B${currentRow}`).value = totalCashflow;

    applyTotalStyle(sheet.getCell(`A${currentRow}`));

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    formatCurrencyCell(sheet.getCell(`B${currentRow}`));

    const qrValue = generateQRCodeValue({
      id: rows.length,

      sumber_modul: "CASHFLOW",

      nilai_transaksi: totalCashflow,

      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(String(qrValue));

    const imageId = workbook.addImage({
      base64: qrImage,

      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 3,
        row: currentRow + 2,
      },

      ext: {
        width: 100,
        height: 100,
      },
    });

    addSignature(sheet, currentRow + 8);

    workbook.eachSheet((worksheet: ExcelJS.Worksheet): void => {
      autoFitColumns(worksheet);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="cashflow-corporate.xlsx"',
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
