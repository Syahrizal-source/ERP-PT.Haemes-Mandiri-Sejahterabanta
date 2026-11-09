import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { db } from "@/lib/supabase/server";
import { getCorporateHierarchy } from "@/lib/accounting/corporateHierarchy";

/* =========================
   TYPES
========================= */

interface CoaDatabaseRow {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  parent_id: number | null;
  aktif: boolean;
  is_cash: boolean;
  saldo_awal_2026: number | string;
}

interface CoaExportRow extends CoaDatabaseRow {
  parent_kode: string;
  parent_nama: string;
  virtual_code: string;
  level: number;
  is_header: boolean;
}

/* =========================
   EXPORT CHART OF ACCOUNT
========================= */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("coa")
      .select(
        `
        id_coa,
        kode,
        nama,
        tipe,
        parent_id,
        aktif,
        is_cash,
        saldo_awal_2026
      `,
      )
      .order("id_coa", {
        ascending: true,
      });

    if (error) {
      console.error("GAGAL MENGAMBIL DATA COA:", error);

      return NextResponse.json(
        {
          message: "Gagal mengambil data COA",
          detail: error.message,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * MAP DATA COA
     * Saldo awal dibaca langsung dari public.coa.
     */

    const coaData: CoaDatabaseRow[] = (data ?? []).map((item) => {
      const saldoAwal = Number(item.saldo_awal_2026);

      if (!Number.isFinite(saldoAwal)) {
        throw new Error(`Saldo awal 2026 tidak valid untuk COA ${item.kode}.`);
      }

      return {
        id_coa: item.id_coa,
        kode: item.kode,
        nama: item.nama,
        tipe: item.tipe,
        parent_id: item.parent_id,
        aktif: item.aktif,
        is_cash: item.is_cash,
        saldo_awal_2026: saldoAwal,
      };
    });

    /*
     * MAP COA BERDASARKAN ID ASLI
     * Parent dicari menggunakan parent_id,
     * bukan berdasarkan tebakan kode akun.
     */

    const coaById = new Map<number, CoaDatabaseRow>(
      coaData.map((item) => [item.id_coa, item]),
    );

    /*
     * CORPORATE HIERARCHY + PARENT ASLI
     */

    const rows: CoaExportRow[] = coaData
      .map((item) => {
        const hierarchy = getCorporateHierarchy(item.kode, item.id_coa);

        const parent =
          item.parent_id === null ? undefined : coaById.get(item.parent_id);

        return {
          ...item,
          parent_kode: parent?.kode ?? "",
          parent_nama: parent?.nama ?? "",
          virtual_code: hierarchy.virtual_code,
          level: hierarchy.level,
          is_header: hierarchy.header,
        };
      })
      .sort((a, b) =>
        a.virtual_code.localeCompare(b.virtual_code, "id", {
          numeric: true,
          sensitivity: "base",
        }),
      );

    /*
     * WORKBOOK
     */

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "PT. Haemes Mandiri Sejahterabanta";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Chart Of Account");

    /*
     * TITLE
     */

    sheet.mergeCells("A1:H1");

    sheet.getCell("A1").value = "CHART OF ACCOUNT";

    sheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: {
        argb: "FF1F1F1F",
      },
    };

    sheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    sheet.getRow(1).height = 28;

    /*
     * COMPANY
     */

    sheet.mergeCells("A2:H2");

    sheet.getCell("A2").value = "PT. HAEMES MANDIRI SEJAHTERABANTA";

    sheet.getCell("A2").font = {
      bold: true,
      size: 12,
    };

    sheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    /*
     * HEADER
     */

    const headers = [
      "Kode",
      "Nama Akun",
      "Tipe",
      "Parent Kode",
      "Parent Nama",
      "Saldo Awal 2026",
      "Status",
      "Cash Account",
    ];

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
        argb: "FF1F4E78",
      },
    };

    sheet.getRow(4).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    /*
     * COLUMN WIDTH
     */

    sheet.columns = [
      { width: 20 },
      { width: 48 },
      { width: 20 },
      { width: 20 },
      { width: 40 },
      {
        width: 24,
        style: {
          numFmt: '"Rp" #,##0.00;[Red]("Rp" #,##0.00)',
        },
      },
      { width: 16 },
      { width: 18 },
    ];

    /*
     * DATA
     */

    let rowNumber = 5;

    for (const item of rows) {
      /*
       * KODE
       */

      sheet.getCell(`A${rowNumber}`).value = item.virtual_code;

      /*
       * NAMA AKUN
       */

      sheet.getCell(`B${rowNumber}`).value = item.nama;

      sheet.getCell(`B${rowNumber}`).alignment = {
        indent: item.level,
        vertical: "middle",
      };

      /*
       * TIPE
       */

      sheet.getCell(`C${rowNumber}`).value = item.tipe;

      /*
       * PARENT COA ASLI
       */

      sheet.getCell(`D${rowNumber}`).value = item.parent_kode;
      sheet.getCell(`E${rowNumber}`).value = item.parent_nama;

      /*
       * SALDO AWAL 2026
       */

      sheet.getCell(`F${rowNumber}`).value = Number(item.saldo_awal_2026);

      /*
       * STATUS
       */

      sheet.getCell(`G${rowNumber}`).value = item.aktif ? "AKTIF" : "NONAKTIF";

      /*
       * CASH ACCOUNT
       */

      sheet.getCell(`H${rowNumber}`).value = item.is_cash ? "YA" : "TIDAK";

      /*
       * CORPORATE HEADER STYLE
       */

      if (item.is_header) {
        for (let col = 1; col <= 8; col += 1) {
          sheet.getCell(rowNumber, col).font = {
            bold: true,
            color: {
              argb: "FF1F1F1F",
            },
          };

          sheet.getCell(rowNumber, col).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFE2EFDA",
            },
          };
        }
      }

      /*
       * BORDER
       */

      for (let col = 1; col <= 8; col += 1) {
        sheet.getCell(rowNumber, col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }

      rowNumber += 1;
    }

    /*
     * FREEZE HEADER
     */

    sheet.views = [
      {
        state: "frozen",
        ySplit: 4,
      },
    ];

    /*
     * AUTOFILTER
     */

    sheet.autoFilter = {
      from: "A4",
      to: "H4",
    };

    /*
     * EXPORT BUFFER
     */

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Chart-Of-Account.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("EXPORT COA ERROR:", error);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Export COA gagal",
      },
      {
        status: 500,
      },
    );
  }
}
