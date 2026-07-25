import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { CellHyperlinkValue } from "exceljs";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";
import { getJournalDivision } from "@/lib/accounting/journalDivision";

/* =========================
   TYPES
========================= */
interface BukuBesarRow {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  kode_coa: string;
  nama_coa: string;
  debit: number;
  kredit: number;
  business_unit: string | null;
  region_name: string | null;
  estate_name: string | null;
  division_name: string | null;
  block_code: string | null;
}
interface GroupedCoa {
  kode: string;
  nama: string;
  rows: BukuBesarRow[];
}

interface DivisionGroup {
  division: string;
  accounts: GroupedCoa[];
}

/* =========================
   CONSTANT
========================= */

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

/* =========================
   STYLES
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
  cell.numFmt = ACCOUNTING_FORMAT;
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
   TITLE
========================= */

function createTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  divisionTitle: string,
  section: string,
  accountTitle: string,
  periode: string,
  printDate: string,
  region: string | null,
  estate: string | null,
  divisionName: string | null,
  blockCode: string | null,
): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "BUKU BESAR UMUM";

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

  sheet.getCell("A5").value = divisionTitle;

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
  };

  sheet.getCell("A6").alignment = {
    horizontal: "left",
  };

  if (region) {
    sheet.mergeCells("A7:F7");
    sheet.getCell("A7").value = `Wilayah : ${region}`;
  }

  if (estate) {
    sheet.mergeCells("A8:F8");
    sheet.getCell("A8").value = `Estate : ${estate}`;
  }

  if (divisionName) {
    sheet.mergeCells("A9:F9");
    sheet.getCell("A9").value = `Divisi : ${divisionName}`;
  }

  if (blockCode) {
    sheet.mergeCells("A10:F10");
    sheet.getCell("A10").value = `Block : ${blockCode}`;
  }

  sheet.mergeCells("A11:F11");

  sheet.getCell("A11").value = accountTitle;

  sheet.mergeCells("A12:F12");

  sheet.getCell("A12").value = `Periode : ${periode}`;

  sheet.mergeCells("A13:F13");

  sheet.getCell("A13").value = `Tanggal Cetak : ${printDate}`;

  sheet.getCell("A12").font = {
    bold: true,
  };

  sheet.getCell("A12").alignment = {
    horizontal: "left",
  };

  sheet.getCell("A8").font = {
    bold: true,
  };

  sheet.getCell("A8").alignment = {
    horizontal: "left",
  };

  sheet.getCell("A7").font = {
    bold: true,
  };

  sheet.getCell("A7").alignment = {
    horizontal: "left",
  };
}

/* =========================
   SANITIZE SHEET
========================= */
function createIndexTitle(sheet: ExcelJS.Worksheet): void {
  sheet.mergeCells("A1:B1");

  sheet.getCell("A1").value = "DAFTAR BUKU BESAR";

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
      .from("v_general_ledger_report")
      .select(
        `
tanggal,
no_bukti,
keterangan,
kode_coa,
nama_coa,
debit,
kredit,
business_unit,
region_name,
estate_name,
division_name,
block_code
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

    const rows: BukuBesarRow[] = (ledgerData ?? []).map(
      (item): BukuBesarRow => ({
        tanggal: String(item.tanggal),
        no_bukti: String(item.no_bukti),
        keterangan: String(item.keterangan ?? ""),
        kode_coa: String(item.kode_coa),
        nama_coa: String(item.nama_coa),
        debit: Number(item.debit ?? 0),
        kredit: Number(item.kredit ?? 0),
        business_unit: item.business_unit ? String(item.business_unit) : null,
        region_name: item.region_name ? String(item.region_name) : null,
        estate_name: item.estate_name ? String(item.estate_name) : null,
        division_name: item.division_name ? String(item.division_name) : null,
        block_code: item.block_code ? String(item.block_code) : null,
      }),
    );

    /* =========================
       REMOVE DUPLICATE
    ========================= */

    const unique = new Map<string, BukuBesarRow>();

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

    const grouped = new Map<string, GroupedCoa>();

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

    const divisionGroups = new Map<string, DivisionGroup>();
    for (const coaGroup of grouped.values()) {
      const division = getJournalDivision(coaGroup.kode);
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
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    /* =========================
   INDEX SHEET
========================= */

    const indexSheet = workbook.addWorksheet("INDEX");

    createIndexTitle(indexSheet);

    indexSheet.columns = [{ width: 6 }, { width: 40 }];

    headerStyle(indexSheet.getCell("A4"));

    headerStyle(indexSheet.getCell("B4"));

    indexSheet.getCell("A6").value = "No";

    indexSheet.getCell("B6").value = "Nama Sheet";

    let indexRow = 5;
    let sheetCounter = 1;

    for (const [, divisionGroup] of divisionGroups) {
      const totalCoa = divisionGroup.accounts.length;

      const activeCoa = divisionGroup.accounts.filter(
        (account) => account.rows.length > 0,
      ).length;

      const totalTransaksi = divisionGroup.accounts.reduce(
        (total, account) => total + account.rows.length,
        0,
      );

      const sheetLabel =
        divisionGroup.division === "KEBUN SAWIT"
          ? `KEBUN SAWIT ✓ (${activeCoa}/${totalCoa} COA • ${totalTransaksi} Transaksi)`
          : divisionGroup.division;

      const reportTitle =
        divisionGroup.division === "KEBUN SAWIT"
          ? "JASA PERKEBUNAN SAWIT"
          : "JASA CUT & FILL DAN PENGURUGAN TANAH";

      indexSheet.getCell(`A${indexRow}`).font = {
        bold: true,
        size: 13,
      };
      const sheet = workbook.addWorksheet(
        sanitizeSheetName(divisionGroup.division),
      );

      indexSheet.getCell(`A${indexRow}`).value = sheetCounter;

      border(indexSheet.getCell(`A${indexRow}`));

      indexSheet.getCell(`A${indexRow}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      const indexLink = indexSheet.getCell(`B${indexRow}`);

      const kebunRows: BukuBesarRow[] = divisionGroup.accounts.flatMap(
        (account): BukuBesarRow[] => account.rows,
      );

      const kebunInfo = kebunRows.find(
        (row) => row.business_unit === "KEBUN SAWIT",
      );

      const region = kebunInfo?.region_name ?? null;
      const estate = kebunInfo?.estate_name ?? null;
      const division = kebunInfo?.division_name ?? null;
      const block = kebunInfo?.block_code ?? null;

      border(indexLink);

      indexLink.alignment = {
        vertical: "middle",
      };

      createTitle(
        sheet,
        "PT. Haemes Mandiri Sejahterabanta",
        divisionGroup.division,
        reportTitle,
        "",
        periode?.nama_periode ?? "",
        printDate,
        region,
        estate,
        division,
        block,
      );

      sheet.columns = [
        { width: 15 },
        { width: 35 },
        { width: 60 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
      ];

      let rowNumber = 15;

      const backRow = rowNumber + 2;

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

      for (const coaGroup of divisionGroup.accounts) {
        if (coaGroup.rows.length === 0) {
          continue;
        }

        const sheetName = sanitizeSheetName(divisionGroup.division);

        sheet.mergeCells(`A${rowNumber}:F${rowNumber}`);

        sheet.getCell(`A${rowNumber}`).value =
          `${coaGroup.kode} - ${coaGroup.nama}`;

        sheet.getCell(`A${rowNumber}`).font = {
          bold: true,
          size: 12,
        };

        sheet.getCell(`A${rowNumber}`).alignment = {
          horizontal: "left",
        };

        rowNumber++;

        const headerRow = sheet.getRow(rowNumber);

        headerRow.values = [
          "Tanggal",
          "Voucher",
          "Keterangan",
          "Debit",
          "Kredit",
          "Saldo",
        ];

        /* =========================
           HEADER
        ========================= */

        for (let col = 1; col <= 6; col++) {
          headerStyle(sheet.getCell(rowNumber, col));
        }

        rowNumber++;

        /* =========================
     INDEX LINK
  ========================= */

        const hyperlinkValue: CellHyperlinkValue = {
          text: sheetLabel,
          hyperlink: `#'${sheetName}'!A1`,
        };
        indexLink.value = hyperlinkValue;

        indexLink.font = {
          color: {
            argb: "0000FF",
          },

          underline: true,
        };

        if (divisionGroup.division === "KEBUN SAWIT") {
          indexLink.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "E2F0D9",
            },
          };

          indexLink.font = {
            bold: true,
            color: {
              argb: "006100",
            },
            underline: true,
          };
        }
        indexRow++;

        /* =========================
           DATA
        ========================= */

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
            border(sheet.getCell(rowNumber, col));
          }

          rowNumber++;
        }

        /* =========================
     BACK TO INDEX
  ========================= */

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
           FOOTER
        ========================= */

        sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

        sheet.getCell(`A${rowNumber}`).value = "SALDO AKHIR";

        sheet.getCell(`F${rowNumber}`).value = saldo;

        totalStyle(sheet.getCell(`A${rowNumber}`));

        totalStyle(sheet.getCell(`F${rowNumber}`));

        currency(sheet.getCell(`F${rowNumber}`));
        rowNumber++;
      }
      sheetCounter++;
    }
    /* =========================
       AUTO WIDTH
    ========================= */

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

        column.width = Math.min(Math.max(maxLength + 3, 12), 60);
      });
    });

    /* =========================
   QR CODE
========================= */

    const qrText = generateQRCodeValue({
      id: cleanRows.length,

      sumber_modul: "BUKU_BESAR",

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
          col: 9,
          row: 11,
        },

        ext: {
          width: 90,
          height: 90,
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
