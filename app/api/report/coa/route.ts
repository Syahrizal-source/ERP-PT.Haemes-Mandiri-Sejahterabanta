import { NextResponse } from "next/server";

import ExcelJS from "exceljs";

import { db } from "@/lib/supabase/server";

import { getCorporateHierarchy } from "@/lib/accounting/corporateHierarchy";

/* =========================================
   EXPORT CHART OF ACCOUNT
========================================= */

export async function GET() {
  try {
    const { data, error } = await db
      .from("coa")
      .select(
        `
        id_coa,
        kode,
        nama,
        tipe,
        aktif,
        is_cash
      `,
      )
      .order("id_coa", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: 500,
        },
      );
    }

    /* =========================================
       CORPORATE HIERARCHY
    ========================================= */

    const rows = (data ?? [])
      .map((item) => {
        const hierarchy = getCorporateHierarchy(String(item.kode));

        return {
          ...item,

          virtual_code: hierarchy.virtual_code,

          level: hierarchy.level,

          is_header: hierarchy.header,

          division: hierarchy.division ?? "",

          section: hierarchy.section ?? "",
        };
      })

      .sort((a, b) => a.virtual_code.localeCompare(b.virtual_code));

    /* =========================================
       WORKBOOK
    ========================================= */

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "PT. Haemes Mandiri Sejahterabanta";

    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Chart Of Account");

    /* =========================================
       TITLE
    ========================================= */

    sheet.mergeCells("A1:E1");

    sheet.getCell("A1").value = "CHART OF ACCOUNT";

    sheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: {
        argb: "1F1F1F",
      },
    };

    sheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    sheet.getRow(1).height = 28;

    /* =========================================
       COMPANY
    ========================================= */

    sheet.mergeCells("A2:E2");

    sheet.getCell("A2").value = "PT. HAEMES MANDIRI SEJAHTERABANTA";

    sheet.getCell("A2").font = {
      bold: true,
      size: 12,
    };

    sheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    /* =========================================
       HEADER
    ========================================= */

    const headers = ["Kode", "Nama Akun", "Tipe", "Status", "Cash Account"];

    sheet.getRow(4).values = headers;

    sheet.getRow(4).font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    sheet.getRow(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "1F4E78",
      },
    };

    sheet.getRow(4).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    /* =========================================
       COLUMN WIDTH
    ========================================= */

    sheet.columns = [
      { width: 20 },
      { width: 48 },
      { width: 20 },
      { width: 16 },
      { width: 18 },
    ];

    /* =========================================
       DATA
    ========================================= */

    let rowNumber = 5;

    let currentDivision = "";
    let currentSection = "";

    for (const item of rows) {
      /* =========================================
   DIVISION HEADER
========================================= */

      if (item.division && item.division !== currentDivision) {
        sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

        sheet.getCell(`A${rowNumber}`).value = item.division;

        sheet.getCell(`A${rowNumber}`).alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        sheet.getCell(`A${rowNumber}`).font = {
          bold: true,
          size: 14,
          color: {
            argb: "1F1F1F",
          },
        };

        currentDivision = item.division;

        currentSection = "";

        rowNumber++;
      }

      /* =========================================
   SECTION HEADER
========================================= */

      if (item.section && item.section !== currentSection) {
        sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);

        sheet.getCell(`A${rowNumber}`).value = item.section;

        sheet.getCell(`A${rowNumber}`).alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        sheet.getCell(`A${rowNumber}`).font = {
          bold: true,
          size: 12,
          color: {
            argb: "1F1F1F",
          },
        };

        currentSection = item.section;

        rowNumber++;
      }
      /* =========================================
         KODE
      ========================================= */

      sheet.getCell(`A${rowNumber}`).value = item.virtual_code;

      /* =========================================
         NAMA AKUN
      ========================================= */

      sheet.getCell(`B${rowNumber}`).value = item.nama;

      sheet.getCell(`B${rowNumber}`).alignment = {
        indent: item.level,
        vertical: "middle",
      };

      /* =========================================
         TIPE
      ========================================= */

      sheet.getCell(`C${rowNumber}`).value = item.tipe;

      /* =========================================
         STATUS
      ========================================= */

      sheet.getCell(`D${rowNumber}`).value = item.aktif ? "AKTIF" : "NONAKTIF";

      /* =========================================
         CASH ACCOUNT
      ========================================= */

      sheet.getCell(`E${rowNumber}`).value = item.is_cash ? "YA" : "TIDAK";

      /* =========================================
         CORPORATE HEADER STYLE
      ========================================= */

      if (item.is_header) {
        for (let col = 1; col <= 5; col++) {
          sheet.getCell(rowNumber, col).font = {
            bold: true,
            color: {
              argb: "1F1F1F",
            },
          };

          sheet.getCell(rowNumber, col).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "E2EFDA",
            },
          };
        }
      }

      /* =========================================
         BORDER
      ========================================= */

      for (let col = 1; col <= 5; col++) {
        sheet.getCell(rowNumber, col).border = {
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

      rowNumber++;
    }

    /* =========================================
       FREEZE HEADER
    ========================================= */

    sheet.views = [
      {
        state: "frozen",
        ySplit: 4,
      },
    ];

    /* =========================================
       AUTOFILTER
    ========================================= */

    sheet.autoFilter = {
      from: "A4",
      to: "E4",
    };

    /* =========================================
       EXPORT BUFFER
    ========================================= */

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="Chart-Of-Account.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Export gagal",
      },
      {
        status: 500,
      },
    );
  }
}
