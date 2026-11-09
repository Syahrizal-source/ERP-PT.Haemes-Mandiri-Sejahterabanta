import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import * as QRCode from "qrcode";

import { db } from "@/lib/supabase/server";

type CoaParent = {
  kode: string;
  nama: string;
};

type CoaQueryRow = {
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  saldo_awal_2026: number | string;
  parent: CoaParent | CoaParent[] | null;
};

type CoaExcelRow = {
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  saldo_awal_2026: number;
  parent_kode: string | null;
  parent_nama: string | null;
};

/* ===============================
   GET EXPORT COA EXCEL + QR
================================ */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("coa")
      .select(
        `
        kode,
        nama,
        tipe,
        aktif,
        is_cash,
        saldo_awal_2026,
        parent:coa!coa_parent_id_fkey (
          kode,
          nama
        )
      `,
      )
      .order("kode", { ascending: true });

    if (error) {
      throw error;
    }

    const queryRows = (data ?? []) as unknown as CoaQueryRow[];

    const rows: CoaExcelRow[] = queryRows.map((row) => {
      const parent = Array.isArray(row.parent)
        ? (row.parent[0] ?? null)
        : row.parent;

      const saldoAwal = Number(row.saldo_awal_2026);

      if (!Number.isFinite(saldoAwal)) {
        throw new Error(`Saldo awal 2026 tidak valid untuk COA ${row.kode}.`);
      }

      return {
        kode: row.kode,
        nama: row.nama,
        tipe: row.tipe,
        aktif: row.aktif,
        is_cash: row.is_cash,
        saldo_awal_2026: saldoAwal,
        parent_kode: parent?.kode ?? null,
        parent_nama: parent?.nama ?? null,
      };
    });

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Haemes Mandiri Sejahtera";
    workbook.subject = "Chart of Account";
    workbook.title = "Export COA";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("COA", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    /* ===== HEADER ===== */

    sheet.columns = [
      {
        header: "Kode",
        key: "kode",
        width: 15,
      },
      {
        header: "Nama Akun",
        key: "nama",
        width: 35,
      },
      {
        header: "Tipe",
        key: "tipe",
        width: 18,
      },
      {
        header: "Parent Kode",
        key: "parent_kode",
        width: 15,
      },
      {
        header: "Parent Nama",
        key: "parent_nama",
        width: 35,
      },
      {
        header: "Saldo Awal 2026",
        key: "saldo_awal_2026",
        width: 22,
        style: {
          numFmt: '"Rp" #,##0.00;[Red]("Rp" #,##0.00)',
        },
      },
      {
        header: "Aktif",
        key: "aktif",
        width: 10,
      },
      {
        header: "Kas",
        key: "is_cash",
        width: 10,
      },
    ];

    const headerRow = sheet.getRow(1);

    headerRow.font = {
      bold: true,
    };

    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    headerRow.height = 22;

    /* ===== DATA ===== */

    rows.forEach((row) => {
      sheet.addRow({
        kode: row.kode,
        nama: row.nama,
        tipe: row.tipe,
        parent_kode: row.parent_kode ?? "",
        parent_nama: row.parent_nama ?? "",
        saldo_awal_2026: row.saldo_awal_2026,
        aktif: row.aktif ? "YA" : "TIDAK",
        is_cash: row.is_cash ? "YA" : "TIDAK",
      });
    });

    /* ===== AUTOFILTER ===== */

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(sheet.rowCount, 1), column: sheet.columnCount },
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: "top",
        };
      }
    });

    /* ===== QR CODE ===== */

    const qrText =
      "Chart of Account (COA) - Accounting System - Haemes Mandiri Sejahtera";

    const qrBase64 = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 1,
    });

    const imageId = workbook.addImage({
      base64: qrBase64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 9,
        row: 1,
      },
      ext: {
        width: 150,
        height: 150,
      },
    });

    /* ===== RESPONSE ===== */

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="coa.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("EXPORT COA ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal export COA",
        detail:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat export COA.",
      },
      {
        status: 500,
      },
    );
  }
}
