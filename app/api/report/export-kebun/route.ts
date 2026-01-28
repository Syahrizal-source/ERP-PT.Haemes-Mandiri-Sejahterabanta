import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { exportExcelWithQR } from "@/lib/report/exportExcel";

import { queryNeraca } from "@/lib/report/queryNeraca";
import { queryLabaRugi } from "@/lib/report/queryLabaRugi";
import { queryCashFlow } from "@/lib/report/queryCashFlow";
import { queryCostControl } from "@/lib/report/queryCostControl";

export async function GET(req: NextRequest) {
  const periodeParam = req.nextUrl.searchParams.get("periode");
  const lokasi = req.nextUrl.searchParams.get("lokasi");

  if (!periodeParam) {
    return NextResponse.json({ error: "periode wajib diisi" }, { status: 400 });
  }

  const periode = Number(periodeParam);

  const neraca = await db.rpc("sql", {
    q: queryNeraca,
    args: [periode, lokasi],
  });

  const laba = await db.rpc("sql", {
    q: queryLabaRugi,
    args: [periode],
  });

  const cash = await db.rpc("sql", {
    q: queryCashFlow,
    args: [periode],
  });

  const cost = await db.rpc("sql", {
    q: queryCostControl,
    args: [periode],
  });

  const buffer = await exportExcelWithQR(
    "LAPORAN KEBUN SAWIT",
    [
      {
        name: "Neraca",
        headers: ["Kode", "Nama", "Saldo"],
        rows: ["kode", "nama", "saldo"],
        data: neraca.data ?? [],
      },
      {
        name: "Laba Rugi",
        headers: ["Kode", "Nama", "Total"],
        rows: ["kode", "nama", "total"],
        data: laba.data ?? [],
      },
      {
        name: "Cash Flow",
        headers: ["Kode", "Nama", "Arus Kas"],
        rows: ["kode", "nama", "arus"],
        data: cash.data ?? [],
      },
      {
        name: "Cost Control",
        headers: ["Transaksi", "Total Biaya"],
        rows: ["jenis_transaksi", "total_biaya"],
        data: cost.data ?? [],
      },
    ],
    {
      periode,
      lokasi,
      generated_at: new Date().toISOString(),
    },
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=laporan-kebun.xlsx",
    },
  });
}
