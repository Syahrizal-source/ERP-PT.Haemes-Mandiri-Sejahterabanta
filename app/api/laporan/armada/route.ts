import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Armada = {
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  no_pintu: string;
  supir: string;
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
   GET EXPORT EXCEL
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    /* =========================
       GET DATA
    ========================= */
    const { data, error } = await db
      .from("armada")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal ambil data" },
        { status: 500 },
      );
    }

    const rows = data as Armada[];

    /* =========================
       EXCEL SETUP
    ========================= */
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Armada");

    worksheet.columns = [
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Kode", key: "kode", width: 20 },
      { header: "No Polisi", key: "nopol", width: 15 },
      { header: "No Pintu", key: "pintu", width: 10 },
      { header: "Supir", key: "supir", width: 20 },
      { header: "Rit", key: "rit", width: 10 },
      { header: "Tagihan", key: "tagihan", width: 18 },
      { header: "Uang Jalan", key: "uang_jalan", width: 18 },
      { header: "Belanja", key: "belanja", width: 18 },
      { header: "Total Biaya", key: "biaya", width: 18 },
      { header: "Omset", key: "omset", width: 18 },
    ];

    /* =========================
       LOOP DATA + HITUNG
    ========================= */
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

      worksheet.addRow({
        tanggal: item.tanggal,
        kode: item.kode_transaksi,
        nopol: item.no_polisi,
        pintu: item.no_pintu,
        supir: item.supir,
        rit: item.rit,
        tagihan: item.tagihan,
        uang_jalan: item.uang_jalan,
        belanja: item.belanja,
        biaya,
        omset,
      });
    });

    /* =========================
       FORMAT NUMBER
    ========================= */
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      row.getCell(7).numFmt = "#,##0";
      row.getCell(8).numFmt = "#,##0";
      row.getCell(9).numFmt = "#,##0";
      row.getCell(10).numFmt = "#,##0";
      row.getCell(11).numFmt = "#,##0";
    });

    /* =========================
       EXPORT BUFFER
    ========================= */
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=laporan-armada.xlsx",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
