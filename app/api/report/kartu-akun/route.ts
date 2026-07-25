import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { CellHyperlinkValue } from "exceljs";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";
import { getJournalDivision } from "@/lib/accounting/journalDivision";
import { getCorporateHierarchy } from "@/lib/accounting/corporateHierarchy";

interface KartuAkunRow {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  kode_coa: string;
  nama_coa: string;
  debit: number;
  kredit: number;
}

interface GroupedAccount {
  kode: string;
  nama: string;
  rows: KartuAkunRow[];
}

/* =========================
   CONSTANT
========================= */

const ACCOUNTING_FORMAT = "#,##0;[Red](#,##0)";

function currency(cell: ExcelJS.Cell): void {
  cell.numFmt = ACCOUNTING_FORMAT;
}

function separator(cell: ExcelJS.Cell): void {
  cell.border = {
    bottom: {
      style: "thin",
    },
  };
}

function titleStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    size: 11,
    name: "Calibri",
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

function totalStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    name: "Courier New",
    size: 10,
  };

  cell.border = {
    top: {
      style: "thin",
    },
  };
}

function createCardTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  division: string,
  section: string,
  accountTitle: string,
): void {
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "KARTU AKUN";
  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";
  sheet.getCell("A2").font = {
    bold: true,
    size: 12,
  };
  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A4:F4");
  sheet.getCell("A4").value = companyTitle;
  sheet.getCell("A4").font = {
    bold: true,
    size: 14,
  };
  sheet.getCell("A4").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A5:F5");
  sheet.getCell("A5").value = division;
  sheet.getCell("A5").font = {
    bold: true,
    size: 12,
  };
  sheet.getCell("A5").alignment = {
    horizontal: "left",
  };

  sheet.mergeCells("A6:F6");
  sheet.getCell("A6").value = section;
  sheet.getCell("A6").font = {
    bold: true,
    size: 11,
  };
  sheet.getCell("A6").alignment = {
    horizontal: "left",
  };

  sheet.mergeCells("A7:F7");
  sheet.getCell("A7").value = accountTitle;
  sheet.getCell("A7").font = {
    bold: true,
    size: 11,
  };
  sheet.getCell("A7").alignment = {
    horizontal: "left",
  };
}

function createKartuAkunIndexTitle(sheet: ExcelJS.Worksheet): void {
  sheet.mergeCells("A1:B1");

  sheet.getCell("A1").value = "DAFTAR KARTU AKUN";

  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:B2");

  sheet.getCell("A2").value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell("A2").font = {
    bold: true,
    size: 12,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[*?:/\\[\]]/g, "").substring(0, 31);
}

/* =========================
   GET
========================= */
export async function GET() {
  try {
    /* =========================
   LOAD GENERAL LEDGER
========================= */

    const { data: ledgerData, error: ledgerError } = await db
      .from("v_general_ledger")
      .select(
        `
    tanggal,
    no_bukti,
    keterangan,
    kode_coa,
    nama_coa,
    debit,
    kredit
  `,
      )
      .not("no_bukti", "like", "CLS-SUSPENSE-%")
      .order("tanggal", {
        ascending: true,
      });

    if (ledgerError) {
      throw ledgerError;
    }

    /* =========================
   LOAD MASTER COA
========================= */

    const { data: coaData, error: coaError } = await db
      .from("coa")
      .select(
        `
    kode,
    nama
  `,
      )
      .order("kode", {
        ascending: true,
      });

    if (coaError) {
      throw coaError;
    }
    const rows: KartuAkunRow[] = (ledgerData ?? []).map((item) => ({
      tanggal: String(item.tanggal),
      no_bukti: String(item.no_bukti),
      keterangan: String(item.keterangan ?? ""),
      kode_coa: String(item.kode_coa),
      nama_coa: String(item.nama_coa),
      debit: Number(item.debit ?? 0),
      kredit: Number(item.kredit ?? 0),
    }));

    const unique = new Map<string, KartuAkunRow>();

    for (const row of rows) {
      const key = [
        row.tanggal,
        row.no_bukti,
        row.kode_coa,
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
           GROUP COA
        ========================= */

    /* =========================
       GROUP ALL COA
    ========================= */

    const grouped = new Map<string, GroupedAccount>();

    /* =========================
       CREATE ALL COA
    ========================= */

    for (const coa of coaData ?? []) {
      const key = coa.kode.trim();

      grouped.set(key, {
        kode: coa.kode,

        nama: coa.nama,

        rows: [],
      });
    }

    /* =========================
       INSERT TRANSACTION
    ========================= */

    for (const row of cleanRows) {
      const key = row.kode_coa.trim();
      grouped.get(key)?.rows.push(row);
    }

    interface DivisionGroup {
      division: string;

      accounts: GroupedAccount[];
    }
    const divisionGroups = new Map<string, DivisionGroup>();
    for (const coaGroup of grouped.values()) {
      const division = getJournalDivision(coaGroup.kode);
      if (division === "KEBUN SAWIT") {
        continue;
      }
      const existing = divisionGroups.get(division);
      if (existing) {
        existing.accounts.push(coaGroup);
      } else {
        divisionGroups.set(division, {
          division,
          accounts: [coaGroup],
        });
      }
    }

    /* =========================
           WORKBOOK
        ========================= */

    const workbook = new ExcelJS.Workbook();

    /* =========================
       INDEX SHEET
    ========================= */
    const indexSheet = workbook.addWorksheet("INDEX");

    createKartuAkunIndexTitle(indexSheet);

    indexSheet.columns = [{ width: 10 }, { width: 45 }];

    indexSheet.getCell("A6").value = "No";
    indexSheet.getCell("B6").value = "Nama Sheet";

    titleStyle(indexSheet.getCell("A6"));
    titleStyle(indexSheet.getCell("B6"));

    let indexRow = 8;
    let sheetCounter = 1;

    for (const [, divisionGroup] of divisionGroups) {
      indexSheet.mergeCells(`A${indexRow}:B${indexRow}`);

      indexSheet.getCell(`A${indexRow}`).value = divisionGroup.division;

      indexSheet.getCell(`A${indexRow}`).font = {
        bold: true,
        size: 13,
      };

      indexRow++;

      for (const coaGroup of divisionGroup.accounts) {
        if (coaGroup.rows.length === 0) {
          continue;
        }
        const title = `${coaGroup.kode} - ${coaGroup.nama}`;
        const sheetName = sanitizeSheetName(
          `${coaGroup.kode}-${coaGroup.nama}`,
        );
        const sheet = workbook.addWorksheet(sheetName);

        /* =========================
         INDEX LINK
      ========================= */

        indexSheet.getCell(`A${indexRow}`).value = sheetCounter;

        const indexLink = indexSheet.getCell(`B${indexRow}`);

        const hyperlinkValue: CellHyperlinkValue = {
          text: sheetName,

          hyperlink: `#'${sheetName}'!A1`,
        };
        indexLink.value = hyperlinkValue;

        indexLink.font = {
          color: {
            argb: "0000FF",
          },

          underline: true,
        };

        sheetCounter++;

        const hierarchy = getCorporateHierarchy(coaGroup.kode);

        createCardTitle(
          sheet,
          "JASA CUT & FILL DAN PENGURUGAN TANAH",
          hierarchy.division ?? "",
          hierarchy.section ?? "",
          title,
        );

        sheet.columns = [
          { width: 15 },
          { width: 35 },
          { width: 60 },
          { width: 18 },
          { width: 18 },
          { width: 22 },
        ];

        /* =========================
               HEADER
            ========================= */

        const header = sheet.getRow(9);

        header.values = [
          "Tanggal",
          "Voucher",
          "Keterangan",
          "Debit",
          "Kredit",
          "Saldo",
        ];

        for (let col = 1; col <= 6; col++) {
          titleStyle(sheet.getCell(9, col));
        }

        /* =========================
               DATA
            ========================= */

        let rowNumber = 10;

        let saldo = 0;

        for (const row of coaGroup.rows) {
          saldo += row.debit - row.kredit;

          sheet.getCell(`A${rowNumber}`).value = new Date(row.tanggal);

          sheet.getCell(`A${rowNumber}`).numFmt = "dd/mm/yyyy";

          /* =========================
                 HYPERLINK
              ========================= */

          sheet.getCell(`B${rowNumber}`).value = row.no_bukti;

          sheet.getCell(`B${rowNumber}`).font = {
            color: {
              argb: "000000",
            },
          };

          sheet.getCell(`C${rowNumber}`).value = row.keterangan;

          sheet.getCell(`D${rowNumber}`).value = row.debit;

          sheet.getCell(`E${rowNumber}`).value = row.kredit;

          sheet.getCell(`F${rowNumber}`).value = saldo;

          currency(sheet.getCell(`D${rowNumber}`));

          currency(sheet.getCell(`E${rowNumber}`));

          currency(sheet.getCell(`F${rowNumber}`));

          for (let col = 1; col <= 6; col++) {
            separator(sheet.getCell(rowNumber, col));
          }

          rowNumber++;
        }

        /* =========================
         BACK TO INDEX
      ========================= */

        const backRow = rowNumber + 3;

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

        sheet.getCell(`E${signRow}`).value = "Finance Manager";

        sheet.getCell(`B${signRow}`).font = {
          bold: true,
        };

        sheet.getCell(`E${signRow}`).font = {
          bold: true,
        };

        sheet.getCell(`B${signRow + 4}`).value = "(_________________)";

        sheet.getCell(`E${signRow + 4}`).value = "(_________________)";

        /* =========================
               FOOTER
            ========================= */

        sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

        sheet.getCell(`A${rowNumber}`).value = "SALDO AKHIR";

        sheet.getCell(`F${rowNumber}`).value = saldo;

        totalStyle(sheet.getCell(`A${rowNumber}`));

        totalStyle(sheet.getCell(`F${rowNumber}`));

        currency(sheet.getCell(`F${rowNumber}`));
      }
    }

    /* =========================
       AUTO WIDTH
    ========================= */
    workbook.eachSheet((worksheet): void => {
      worksheet.columns.forEach((column): void => {
        let maxLength = 12;

        column.eachCell?.(
          {
            includeEmpty: true,
          },
          (cell): void => {
            if (typeof cell.value === "string") {
              maxLength = Math.max(maxLength, cell.value.length);
            } else if (
              typeof cell.value === "number" ||
              typeof cell.value === "boolean"
            ) {
              maxLength = Math.max(maxLength, String(cell.value).length);
            }
          },
        );

        column.width = Math.min(maxLength + 3, 60);
      });
    });

    /* =========================
   QR CODE
========================= */
    const qrText = generateQRCodeValue({
      id: cleanRows.length,

      sumber_modul: "KARTU_AKUN",

      nilai_transaksi: cleanRows.reduce(
        (sum, row) => sum + Number(row.debit),
        0,
      ),

      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrText);

    const imageId = workbook.addImage({
      base64: qrImage,

      extension: "png",
    });

    workbook.eachSheet((sheet): void => {
      if (sheet.name === "INDEX") {
        return;
      }

      sheet.addImage(imageId, {
        tl: {
          col: 7,
          row: 1,
        },

        ext: {
          width: 80,
          height: 80,
        },
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

        "Content-Disposition": 'attachment; filename="kartu-akun.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error("KARTU AKUN ERROR:", error);

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
