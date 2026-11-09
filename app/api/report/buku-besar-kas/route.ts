import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS, { CellHyperlinkValue } from "exceljs";

import QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================

   TYPES

========================= */

interface BukuKasRow {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  debit: number;

  kredit: number;
}

interface GroupedKas {
  kode: string;

  nama: string;

  rows: BukuKasRow[];
}

interface LedgerQueryRow {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  kode_coa: string;

  nama_coa: string;

  debit: number | null;

  kredit: number | null;
}

interface CoaRow {
  kode: string;

  nama: string;
}

/* =========================

   FORMAT SHEET NAME

========================= */

function formatSheetName(kode: string, nama: string): string {
  return `${kode}-${nama}`.replace(/[\\/*?:\[\]]/g, "").substring(0, 31);
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

   CREATE TITLE

========================= */

function createTitle(sheet: ExcelJS.Worksheet, title: string): void {
  sheet.mergeCells("A1:F1");

  sheet.getCell("A1").value = "BUKU BESAR KAS";

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

    size: 14,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:F3");

  sheet.getCell("A3").value = title;

  sheet.getCell("A3").font = {
    bold: true,

    size: 12,
  };

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };
}

/* =========================

   SIGNATURE

========================= */

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  const safeRow = row < 20 ? 20 : row;

  sheet.getCell(`B${safeRow}`).value = "Direksi";

  sheet.getCell(`E${safeRow}`).value = "Finance Manager";

  sheet.getCell(`B${safeRow}`).font = {
    bold: true,
  };

  sheet.getCell(`E${safeRow}`).font = {
    bold: true,
  };

  sheet.getCell(`B${safeRow + 4}`).value = "(__________________)";

  sheet.getCell(`E${safeRow + 4}`).value = "(__________________)";
}

/* =========================

   GET

========================= */

export async function GET(): Promise<Response> {
  try {
    /* =========================

       LOAD GENERAL LEDGER

    ========================= */

    const {
      data: ledgerData,

      error: ledgerError,
    } = await db

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

      .order("tanggal", {
        ascending: true,
      });

    if (ledgerError) {
      throw ledgerError;
    }

    /* =========================

       LOAD MASTER COA KAS

    ========================= */

    const {
      data: coaData,

      error: coaError,
    } = await db

      .from("coa")

      .select(
        `

        kode,

        nama

      `,
      )

      .or(
        [
          "kode.like.10.101%",
          "kode.like.101%",

          "kode.like.11000%",

          "kode.like.11001%",

          "kode.like.11002%",

          "kode.like.11003%",

          "kode.like.11010%",

          "kode.like.11020%",

          "kode.like.11030%",

          "kode.like.11040%",
        ].join(","),
      )

      .order("kode", {
        ascending: true,
      });

    if (coaError) {
      throw coaError;
    }

    /* =========================

       NORMALIZE

    ========================= */

    const rows: BukuKasRow[] = ((ledgerData ?? []) as LedgerQueryRow[])

      .filter(
        (item): boolean =>
          item.kode_coa.trim().startsWith("10.101") ||
          item.kode_coa.trim().startsWith("101") ||
          item.kode_coa.startsWith("11000") ||
          item.kode_coa.trim().startsWith("11001") ||
          item.kode_coa.trim().startsWith("11002") ||
          item.kode_coa.trim().startsWith("11003") ||
          item.kode_coa.trim().startsWith("11010") ||
          item.kode_coa.trim().startsWith("11020") ||
          item.kode_coa.trim().startsWith("11030") ||
          item.kode_coa.trim().startsWith("11040"),
      )

      .map(
        (item): BukuKasRow => ({
          tanggal: String(item.tanggal),

          no_bukti: String(item.no_bukti),

          keterangan: String(item.keterangan ?? ""),

          kode_coa: String(item.kode_coa),

          nama_coa: String(item.nama_coa),

          debit: Number(item.debit ?? 0),

          kredit: Number(item.kredit ?? 0),
        }),
      );

    /* =========================

       REMOVE DUPLICATE

    ========================= */

    const unique = new Map<string, BukuKasRow>();

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

       GROUP ALL COA

    ========================= */

    const grouped = new Map<string, GroupedKas>();

    for (const coa of (coaData ?? []) as CoaRow[]) {
      grouped.set(coa.kode.trim(), {
        kode: coa.kode,

        nama: coa.nama,

        rows: [],
      });
    }

    for (const row of cleanRows) {
      grouped.get(row.kode_coa.trim())?.rows.push(row);
    }

    /* =========================

       WORKBOOK

    ========================= */

    const workbook = new ExcelJS.Workbook();

    /* =========================

       INDEX SHEET

    ========================= */

    const indexSheet = workbook.addWorksheet("Buku Besar Kas");

    createTitle(indexSheet, "INDEX KAS");

    indexSheet.columns = [
      {
        width: 10,
      },

      {
        width: 45,
      },
    ];

    indexSheet.getRow(6).values = ["No", "Nama Sheet"];

    applyHeaderStyle(indexSheet.getCell("A6"));

    applyHeaderStyle(indexSheet.getCell("B6"));

    let indexRow = 7;

    /* =========================

       CREATE DETAIL SHEET

    ========================= */

    for (const [, coaGroup] of grouped) {
      const sheetName = formatSheetName(coaGroup.kode, coaGroup.nama);

      /* =========================

         INDEX LINK

      ========================= */

      indexSheet.getCell(`A${indexRow}`).value = indexRow - 6;

      const linkCell = indexSheet.getCell(`B${indexRow}`);

      const hyperlinkValue: CellHyperlinkValue = {
        text: `${coaGroup.kode}-${coaGroup.nama}`,

        hyperlink: `#'${sheetName}'!A1`,
      };

      linkCell.value = hyperlinkValue;

      linkCell.font = {
        color: {
          argb: "0000FF",
        },

        underline: true,
      };

      /* =========================

         DETAIL SHEET

      ========================= */

      const detailSheet = workbook.addWorksheet(sheetName);

      createTitle(detailSheet, `${coaGroup.kode} - ${coaGroup.nama}`);

      detailSheet.columns = [
        {
          width: 15,
        },

        {
          width: 25,
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

      detailSheet.getRow(6).values = [
        "Tanggal",

        "Voucher",

        "Keterangan",

        "Debit",

        "Kredit",

        "Saldo",
      ];

      for (let col = 1; col <= 6; col++) {
        applyHeaderStyle(detailSheet.getCell(6, col));
      }

      /* =========================

         SORT TRANSACTION

      ========================= */

      const transactions = coaGroup.rows.sort((a, b): number => {
        const dateA = new Date(a.tanggal).getTime();

        const dateB = new Date(b.tanggal).getTime();

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return a.no_bukti.localeCompare(b.no_bukti);
      });

      /* =========================

         DETAIL ROW

      ========================= */

      let detailRow = 7;

      let saldo = 0;

      for (const trx of transactions) {
        saldo = saldo + trx.debit - trx.kredit;

        detailSheet.getCell(`A${detailRow}`).value = new Date(
          trx.tanggal,
        ).toLocaleDateString("id-ID");

        detailSheet.getCell(`B${detailRow}`).value = trx.no_bukti;

        detailSheet.getCell(`C${detailRow}`).value = trx.keterangan;

        detailSheet.getCell(`D${detailRow}`).value =
          trx.debit > 0 ? trx.debit : "";

        detailSheet.getCell(`E${detailRow}`).value =
          trx.kredit > 0 ? trx.kredit : "";

        detailSheet.getCell(`F${detailRow}`).value = saldo;

        for (let col = 4; col <= 6; col++) {
          detailSheet.getCell(detailRow, col).numFmt = "#,##0";
        }

        for (let col = 1; col <= 6; col++) {
          detailSheet.getCell(detailRow, col).border = {
            top: {
              style: "thin",
            },

            bottom: {
              style: "thin",
            },

            left: {
              style: "thin",
            },

            right: {
              style: "thin",
            },
          };
        }

        detailRow++;
      }

      /* =========================

         SALDO AKHIR

      ========================= */

      detailSheet.mergeCells(`A${detailRow}:E${detailRow}`);

      detailSheet.getCell(`A${detailRow}`).value = "SALDO AKHIR";

      detailSheet.getCell(`A${detailRow}`).font = {
        bold: true,
      };

      detailSheet.getCell(`F${detailRow}`).value = saldo;

      detailSheet.getCell(`F${detailRow}`).font = {
        bold: true,
      };

      detailSheet.getCell(`F${detailRow}`).numFmt = "#,##0";

      /* =========================

         BACK LINK

      ========================= */

      const backRow = detailRow + 3;

      const backCell = detailSheet.getCell(`A${backRow}`);

      const backLink: CellHyperlinkValue = {
        text: "Kembali ke INDEX",

        hyperlink: "#'Buku Besar Kas'!A1",
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

         QR CODE

      ========================= */

      const qrValue = generateQRCodeValue({
        id: Number(coaGroup.kode.replace(/\D/g, "") || 0),

        sumber_modul: "BUKU_BESAR_KAS",

        nilai_transaksi: saldo,

        tanggal_transaksi: new Date().toISOString(),
      });

      const qrImage = await QRCode.toDataURL(qrValue);

      const imageId = workbook.addImage({
        base64: qrImage,

        extension: "png",
      });

      detailSheet.addImage(imageId, {
        tl: {
          col: 5,

          row: 1,
        },

        ext: {
          width: 90,

          height: 90,
        },
      });

      /* =========================

         SIGNATURE

      ========================= */

      addSignature(detailSheet, backRow + 5);

      indexRow++;
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

        "Content-Disposition": 'attachment; filename="buku-besar-kas.xlsx"',
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
