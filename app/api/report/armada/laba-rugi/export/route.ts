import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildLabaRugiExcelWithQR } from "@/lib/export/laba-rugi-export";

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
  tipe: "PENDAPATAN" | "BEBAN" | string;
}

interface LabaRugiRow {
  tipe: "PENDAPATAN" | "BEBAN";
  saldo: number;
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

  const { data: jurnalData, error: jurnalError } =
    await jurnalQuery.returns<JurnalRow[]>();

  if (jurnalError || !jurnalData) {
    return NextResponse.json({ error: "Gagal ambil jurnal" }, { status: 500 });
  }

  const jurnalIds = jurnalData.map((j) => j.id_jurnal);

  if (jurnalIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: detailData, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_coa, debit, kredit")
    .in("id_jurnal", jurnalIds)
    .returns<JurnalDetailRow[]>();

  if (detailError || !detailData) {
    return NextResponse.json({ error: "Gagal ambil detail" }, { status: 500 });
  }

  const { data: coaData, error: coaError } = await db
    .from("coa")
    .select("id_coa, tipe")
    .returns<CoaRow[]>();

  if (coaError || !coaData) {
    return NextResponse.json({ error: "Gagal ambil COA" }, { status: 500 });
  }

  const coaMap = new Map<number, CoaRow["tipe"]>();
  coaData.forEach((c) => coaMap.set(c.id_coa, c.tipe));

  let pendapatan = 0;
  let beban = 0;

  detailData.forEach((row) => {
    const tipe = coaMap.get(row.id_coa);
    if (!tipe) return;

    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    if (tipe === "PENDAPATAN") {
      pendapatan += kredit - debit;
    }

    if (tipe === "BEBAN") {
      beban += debit - kredit;
    }
  });

  const result: LabaRugiRow[] = [
    { tipe: "PENDAPATAN", saldo: pendapatan },
    { tipe: "BEBAN", saldo: beban },
  ];

  const buffer = await buildLabaRugiExcelWithQR(pendapatan, beban);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=laba-rugi-armada.xlsx",
    },
  });
}
