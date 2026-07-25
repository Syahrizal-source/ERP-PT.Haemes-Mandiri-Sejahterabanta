import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Armada = {
  no_polisi: string;
  rit: number;
  tagihan: number;
  uang_jalan: number;
  belanja: number;
  tambal_ban: number;
  inap_um: number;
  sparepart: number;
  koordinasi: number;
  adm: number;
  stnk_kir: number;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db.from("armada").select("*");

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal ambil data" },
        { status: 500 },
      );
    }

    const rows = data as Armada[];

    /* =========================
       GROUPING
    ========================= */
    const grouped: Record<
      string,
      {
        total_rit: number;
        total_tagihan: number;
        total_biaya: number;
        total_omset: number;
      }
    > = {};

    rows.forEach((item) => {
      const biaya =
        item.uang_jalan +
        item.belanja +
        item.tambal_ban +
        item.inap_um +
        item.sparepart +
        item.koordinasi +
        item.adm +
        item.stnk_kir;

      const omset = item.tagihan - biaya;

      if (!grouped[item.no_polisi]) {
        grouped[item.no_polisi] = {
          total_rit: 0,
          total_tagihan: 0,
          total_biaya: 0,
          total_omset: 0,
        };
      }

      grouped[item.no_polisi].total_rit += item.rit;
      grouped[item.no_polisi].total_tagihan += item.tagihan;
      grouped[item.no_polisi].total_biaya += biaya;
      grouped[item.no_polisi].total_omset += omset;
    });

    /* =========================
       EXCEL
    ========================= */
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Per Unit");

    sheet.columns = [
      { header: "No Polisi", key: "nopol", width: 20 },
      { header: "Total Rit", key: "rit", width: 15 },
      { header: "Total Tagihan", key: "tagihan", width: 20 },
      { header: "Total Biaya", key: "biaya", width: 20 },
      { header: "Total Omset", key: "omset", width: 20 },
    ];

    Object.entries(grouped).forEach(([nopol, val]) => {
      sheet.addRow({
        nopol,
        rit: val.total_rit,
        tagihan: val.total_tagihan,
        biaya: val.total_biaya,
        omset: val.total_omset,
      });
    });

    /* FORMAT */
    sheet.eachRow((row, i) => {
      if (i === 1) return;
      row.getCell(3).numFmt = "#,##0";
      row.getCell(4).numFmt = "#,##0";
      row.getCell(5).numFmt = "#,##0";
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=laporan-armada-per-unit.xlsx",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
