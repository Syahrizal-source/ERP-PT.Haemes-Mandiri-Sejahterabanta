import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS, { CellHyperlinkValue } from "exceljs";

import QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================
   TYPES
========================= */

interface LedgerRow {
  id_jurnal: number;

  tanggal: string;

  no_bukti: string;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  debit: number;

  kredit: number;
}

interface LedgerGroup {
  sheet: string;

  keywords: string[];
}

/* =========================
   FORMAT RUPIAH
========================= */

function formatCurrency(value: number): string {
  return value.toLocaleString("id-ID");
}

/* =========================
   GROUP SHEET
========================= */

const ledgerGroups: LedgerGroup[] = [
  {
    sheet: "Kas & Bank",

    keywords: ["Kas", "Bank", "Mandiri", "BCA", "Clearing"],
  },

  {
    sheet: "Piutang",

    keywords: ["Piutang"],
  },

  {
    sheet: "Persediaan",

    keywords: ["Persediaan"],
  },

  {
    sheet: "Aset",

    keywords: ["Aset", "Kendaraan", "Leasing"],
  },

  {
    sheet: "Hutang",

    keywords: ["Hutang"],
  },

  {
    sheet: "Ekuitas",

    keywords: ["Modal", "Ekuitas", "Retained", "Laba"],
  },

  {
    sheet: "Pendapatan",

    keywords: ["Pendapatan"],
  },

  {
    sheet: "Beban",

    keywords: ["Beban", "Biaya", "HPP"],
  },

  {
    sheet: "Suspense",

    keywords: ["Suspense"],
  },
];

/* =========================
   GET SHEET NAME
========================= */

function getSheetName(coaName: string): string {
  for (const group of ledgerGroups) {
    const found = group.keywords.some((keyword): boolean =>
      coaName.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (found) {
      return group.sheet;
    }
  }

  return "Lainnya";
}

/* =========================
   CREATE HEADER
========================= */

function createSheetHeader(sheet: ExcelJS.Worksheet, title: string): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:F2");

  sheet.getCell("A2").value = title;

  sheet.getCell("A2").font = {
    bold: true,
    size: 15,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:F3");

  sheet.getCell("A3").value = new Date().toLocaleDateString("id-ID", {
    month: "long",

    year: "numeric",
  });

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };
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
      .from("v_general_ledger")
      .select("*")
      .order("kode_coa", {
        ascending: true,
      })
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

    const rows: LedgerRow[] = data ?? [];

    /* =========================
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    /* =========================
       INDEX SHEET
    ========================= */

    const indexSheet = workbook.addWorksheet("INDEX");

    createSheetHeader(indexSheet, "Daftar Buku Besar");

    indexSheet.columns = [
      {
        width: 10,
      },

      {
        width: 40,
      },
    ];

    indexSheet.getCell("A6").value = "No";

    indexSheet.getCell("B6").value = "Nama Sheet";

    let indexRow = 7;

    const usedSheets = new Set<string>();

    for (const row of rows) {
      const sheetName = getSheetName(row.nama_coa);

      if (usedSheets.has(sheetName)) {
        continue;
      }

      usedSheets.add(sheetName);

      indexSheet.getCell(`A${indexRow}`).value = indexRow - 6;

      const linkCell = indexSheet.getCell(`B${indexRow}`);

      const hyperlinkValue: CellHyperlinkValue = {
        text: sheetName,

        hyperlink: `#'${sheetName}'!A1`,
      };

      linkCell.value = hyperlinkValue;

      linkCell.font = {
        color: {
          argb: "0000FF",
        },

        underline: true,
      };

      indexRow++;
    }

    /* =========================
       SHEET MAP
    ========================= */

    const sheetMap = new Map<string, ExcelJS.Worksheet>();

    /* =========================
       CREATE SHEET
    ========================= */

    for (const row of rows) {
      const sheetName = getSheetName(row.nama_coa);

      if (!sheetMap.has(sheetName)) {
        const sheet = workbook.addWorksheet(sheetName);

        createSheetHeader(sheet, `General Ledger - ${sheetName}`);

        sheet.columns = [
          {
            width: 18,
          },

          {
            width: 45,
          },

          {
            width: 25,
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

        const headerRow = sheet.getRow(6);

        headerRow.values = [
          "Tanggal",
          "Keterangan",
          "No Bukti",
          "Debit",
          "Kredit",
          "Saldo",
        ];

        headerRow.font = {
          bold: true,
        };

        headerRow.alignment = {
          horizontal: "center",
        };

        sheetMap.set(sheetName, sheet);
      }
    }

    /* =========================
       SALDO MAP
    ========================= */

    const saldoMap = new Map<string, number>();

    const rowMap = new Map<string, number>();

    const coaLastRowMap = new Map<string, number>();

    /* =========================
       INSERT DATA
    ========================= */

    /* =========================
   INSERT DATA
========================= */

    const sortedRows = [...rows].sort((a, b) => {
      if (a.kode_coa !== b.kode_coa) {
        return a.kode_coa.localeCompare(b.kode_coa);
      }

      return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });

    for (const row of sortedRows) {
      const sheetName = getSheetName(row.nama_coa);

      const sheet = sheetMap.get(sheetName);

      if (!sheet) {
        continue;
      }

      const coaKey = `${row.kode_coa}-${row.nama_coa}`;

      let currentRow = rowMap.get(coaKey);

      if (!currentRow) {
        currentRow = sheet.rowCount + 2;

        sheet.mergeCells(`A${currentRow}:F${currentRow}`);

        const coaCell = sheet.getCell(`A${currentRow}`);

        coaCell.value = `Akun ${row.kode_coa}: ${row.nama_coa}`;

        coaCell.font = {
          bold: true,
          size: 13,
        };

        coaCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "F4B183",
          },
        };

        currentRow += 1;

        const headerRow = sheet.getRow(currentRow);

        headerRow.values = [
          "Tanggal",
          "No Bukti",
          "Keterangan",
          "Debit",
          "Kredit",
          "Saldo",
        ];

        headerRow.font = {
          bold: true,
        };

        headerRow.alignment = {
          horizontal: "center",
        };

        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "F4CCCC",
          },
        };

        currentRow += 1;
      }

      const saldoKey = coaKey;

      const previousSaldo = saldoMap.get(saldoKey) ?? 0;

      const debit = Number(row.debit ?? 0);

      const kredit = Number(row.kredit ?? 0);

      const saldo = previousSaldo + debit - kredit;

      saldoMap.set(saldoKey, saldo);

      sheet.getCell(`A${currentRow}`).value = new Date(
        row.tanggal,
      ).toLocaleDateString("id-ID");

      sheet.getCell(`B${currentRow}`).value = row.no_bukti;

      sheet.getCell(`C${currentRow}`).value = row.keterangan;

      sheet.getCell(`D${currentRow}`).value = debit > 0 ? debit : "";

      sheet.getCell(`E${currentRow}`).value = kredit > 0 ? kredit : "";

      sheet.getCell(`F${currentRow}`).value = saldo;

      sheet.getCell(`D${currentRow}`).numFmt = "#,##0";

      sheet.getCell(`E${currentRow}`).numFmt = "#,##0";

      sheet.getCell(`F${currentRow}`).numFmt = "#,##0";

      rowMap.set(coaKey, currentRow + 1);

      coaLastRowMap.set(coaKey, currentRow);
    }

    for (const [coaKey, lastRow] of coaLastRowMap.entries()) {
      let currentCoaKey = "";

      let currentSheet: ExcelJS.Worksheet | null = null;

      let currentRow = 0;

      let runningSaldo = 0;

      let totalDebit = 0;

      let totalKredit = 0;

      for (let index = 0; index < sortedRows.length; index++) {
        const row = sortedRows[index];

        const nextRow = sortedRows[index + 1];

        const sheetName = getSheetName(row.nama_coa);

        const sheet = sheetMap.get(sheetName);

        if (!sheet) {
          continue;
        }

        const coaKey = `${row.kode_coa}-${row.nama_coa}`;

        /* =========================
     GANTI AKUN
  ========================= */

        if (currentCoaKey !== coaKey) {
          currentCoaKey = coaKey;

          currentSheet = sheet;

          currentRow = sheet.rowCount + 2;

          runningSaldo = 0;

          totalDebit = 0;

          totalKredit = 0;

          sheet.mergeCells(`A${currentRow}:F${currentRow}`);

          const coaCell = sheet.getCell(`A${currentRow}`);

          coaCell.value = `Akun ${row.kode_coa}: ${row.nama_coa}`;

          coaCell.font = {
            bold: true,
            size: 13,
          };

          coaCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "F4B183",
            },
          };

          currentRow++;

          const headerRow = sheet.getRow(currentRow);

          headerRow.values = [
            "Tanggal",
            "No Bukti",
            "Keterangan",
            "Debit",
            "Kredit",
            "Saldo",
          ];

          headerRow.font = {
            bold: true,
          };

          headerRow.alignment = {
            horizontal: "center",
          };

          headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "F4CCCC",
            },
          };

          currentRow++;
        }

        /* =========================
     NILAI
  ========================= */

        const debit = Number(row.debit ?? 0);

        const kredit = Number(row.kredit ?? 0);

        runningSaldo += debit - kredit;

        totalDebit += debit;

        totalKredit += kredit;

        /* =========================
     DETAIL ROW
  ========================= */

        sheet.getCell(`A${currentRow}`).value = new Date(
          row.tanggal,
        ).toLocaleDateString("id-ID");

        sheet.getCell(`B${currentRow}`).value = row.no_bukti;

        sheet.getCell(`C${currentRow}`).value = row.keterangan;

        sheet.getCell(`D${currentRow}`).value = debit > 0 ? debit : "";

        sheet.getCell(`E${currentRow}`).value = kredit > 0 ? kredit : "";

        sheet.getCell(`F${currentRow}`).value = runningSaldo;

        sheet.getCell(`D${currentRow}`).numFmt = "#,##0";

        sheet.getCell(`E${currentRow}`).numFmt = "#,##0";

        sheet.getCell(`F${currentRow}`).numFmt = "#,##0";

        currentRow++;

        /* =========================
     AKHIR AKUN
  ========================= */

        const isLastRow =
          !nextRow || `${nextRow.kode_coa}-${nextRow.nama_coa}` !== coaKey;

        if (isLastRow) {
          currentRow += 1;

          /* =========================
       TOTAL DEBIT
    ========================= */

          sheet.getCell(`A${currentRow}`).value = "TOTAL DEBIT";

          sheet.getCell(`D${currentRow}`).value = totalDebit;

          /* =========================
       TOTAL KREDIT
    ========================= */

          sheet.getCell(`A${currentRow + 1}`).value = "TOTAL KREDIT";

          sheet.getCell(`E${currentRow + 1}`).value = totalKredit;

          /* =========================
       SALDO AKHIR
    ========================= */

          sheet.getCell(`A${currentRow + 2}`).value = "SALDO AKHIR";

          sheet.getCell(`F${currentRow + 2}`).value = runningSaldo;

          /* =========================
       STYLE SUMMARY
    ========================= */

          [currentRow, currentRow + 1, currentRow + 2].forEach((rowNumber) => {
            const summaryRow = sheet.getRow(rowNumber);

            summaryRow.font = {
              bold: true,
            };

            summaryRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "FFF2CC",
              },
            };

            summaryRow.eachCell((cell) => {
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
            });
          });

          sheet.getCell(`D${currentRow}`).numFmt = "#,##0";

          sheet.getCell(`E${currentRow + 1}`).numFmt = "#,##0";

          sheet.getCell(`F${currentRow + 2}`).numFmt = "#,##0";

          currentRow += 4;
        }
      }
    }

    /* =========================
       QR CODE
    ========================= */

    const qrText = generateQRCodeValue({
      id: rows.length,

      sumber_modul: "GENERAL_LEDGER",

      nilai_transaksi: rows.reduce((sum, row) => sum + Number(row.debit), 0),

      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrText);

    const imageId = workbook.addImage({
      base64: qrImage,

      extension: "png",
    });

    for (const sheet of sheetMap.values()) {
      sheet.addImage(imageId, {
        tl: {
          col: 7,
          row: 2,
        },

        ext: {
          width: 80,
          height: 80,
        },
      });

      /* =========================
     BACK TO INDEX
  ========================= */

      const backRow = sheet.rowCount + 3;

      const backCell = sheet.getCell(`A${backRow}`);

      const backLink: CellHyperlinkValue = {
        text: "Kembali ke INDEX",

        hyperlink: "#'INDEX'!A1",
      };

      backCell.value = backLink;

      backCell.font = {
        color: {
          argb: "0000FF",
        },

        underline: true,

        bold: true,
      };

      /* =========================
     SIGNATURE
  ========================= */

      const signRow = backRow + 4;

      sheet.getCell(`B${signRow}`).value = "Direksi";

      sheet.getCell(`E${signRow}`).value = "Manager";

      sheet.getCell(`B${signRow}`).font = {
        bold: true,
      };

      sheet.getCell(`E${signRow}`).font = {
        bold: true,
      };

      sheet.getCell(`B${signRow + 4}`).value = "(_________________)";

      sheet.getCell(`E${signRow + 4}`).value = "(_________________)";

      sheet.getCell(`B${signRow + 5}`).value =
        "PT. Haemes Mandiri Sejahterabanta";

      sheet.getCell(`E${signRow + 5}`).value = "Finance Manager";
    }

    /* =========================
       EXPORT
    ========================= */

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="general-ledger.xlsx"',
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
