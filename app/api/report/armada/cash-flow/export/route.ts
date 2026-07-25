import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildCashFlowExcelWithQR } from "@/lib/export/cashflow-export";

interface JurnalRow {
  id_jurnal: number;
  tanggal: string;
}

interface JurnalDetailRow {
  id_coa: number;
  debit: string;
  kredit: string;
}

interface CoaRow {
  id_coa: number;
  is_cash: boolean;
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let jurnalQuery = db
    .from("jurnal")
    .select("id_jurnal, tanggal")
    .eq("sumber", "ARMADA");

  if (start && end) {
    jurnalQuery = jurnalQuery.gte("tanggal", start).lte("tanggal", end);
  }

  const { data: jurnalData } = await jurnalQuery.returns<JurnalRow[]>();

  if (!jurnalData) {
    return NextResponse.json({ error: "Gagal ambil jurnal" }, { status: 500 });
  }

  const jurnalIds = jurnalData.map((j) => j.id_jurnal);

  if (jurnalIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: detailData } = await db
    .from("jurnal_detail")
    .select("id_coa, debit, kredit")
    .in("id_jurnal", jurnalIds)
    .returns<JurnalDetailRow[]>();

  const { data: coaData } = await db
    .from("coa")
    .select("id_coa, is_cash")
    .returns<CoaRow[]>();

  if (!detailData || !coaData) {
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }

  const cashSet = new Set(
    coaData.filter((c) => c.is_cash).map((c) => c.id_coa),
  );

  let cashIn = 0;
  let cashOut = 0;

  detailData.forEach((row) => {
    if (!cashSet.has(row.id_coa)) return;

    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    cashIn += debit;
    cashOut += kredit;
  });

  const netCash = cashIn - cashOut;

  const buffer = await buildCashFlowExcelWithQR(cashIn, cashOut, netCash);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cash-flow-armada.xlsx",
    },
  });
}
