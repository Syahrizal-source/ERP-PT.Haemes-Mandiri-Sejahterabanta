import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildNeracaExcelWithQR } from "@/lib/export/neraca-export";

interface JurnalRow {
  id_jurnal: number;
  tanggal: string;
  sumber: string;
}

interface JurnalDetailRow {
  id_jurnal: number;
  id_coa: number;
  debit: string;
  kredit: string;
}

interface CoaRow {
  id_coa: number;
  tipe: string;
}

interface NeracaRow {
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  // 1️⃣ Ambil jurnal ARMADA
  let jurnalQuery = db
    .from("jurnal")
    .select("id_jurnal, tanggal, sumber")
    .eq("sumber", "ARMADA");

  if (start && end) {
    jurnalQuery = jurnalQuery.gte("tanggal", start).lte("tanggal", end);
  }

  const { data: jurnalData, error: jurnalError } =
    await jurnalQuery.returns<JurnalRow[]>();

  if (jurnalError || !jurnalData) {
    return NextResponse.json(
      { error: "Gagal ambil jurnal ARMADA" },
      { status: 500 },
    );
  }

  const jurnalIds = jurnalData.map((j) => j.id_jurnal);

  if (jurnalIds.length === 0) {
    return NextResponse.json([]);
  }

  // 2️⃣ Ambil detail
  const { data: detailData, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_jurnal, id_coa, debit, kredit")
    .in("id_jurnal", jurnalIds)
    .returns<JurnalDetailRow[]>();

  if (detailError || !detailData) {
    return NextResponse.json(
      { error: "Gagal ambil jurnal detail" },
      { status: 500 },
    );
  }

  // 3️⃣ Ambil COA
  const { data: coaData, error: coaError } = await db
    .from("coa")
    .select("id_coa, tipe")
    .returns<CoaRow[]>();

  if (coaError || !coaData) {
    return NextResponse.json({ error: "Gagal ambil COA" }, { status: 500 });
  }

  const coaMap = new Map<number, string>();
  coaData.forEach((c) => {
    coaMap.set(c.id_coa, c.tipe);
  });

  // 4️⃣ Hitung Neraca (HANYA TIPE NERACA)
  const grouped: Record<string, number> = {};

  detailData.forEach((row) => {
    const tipe = coaMap.get(row.id_coa);
    if (!tipe) return;

    if (tipe !== "ASET" && tipe !== "LIABILITAS" && tipe !== "EKUITAS") {
      return;
    }

    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    let saldo = 0;

    if (tipe === "ASET") {
      saldo = debit - kredit;
    } else {
      saldo = kredit - debit;
    }

    grouped[tipe] = (grouped[tipe] ?? 0) + saldo;
  });

  const result: NeracaRow[] = [
    { tipe: "ASET", saldo: grouped["ASET"] ?? 0 },
    { tipe: "LIABILITAS", saldo: grouped["LIABILITAS"] ?? 0 },
    { tipe: "EKUITAS", saldo: grouped["EKUITAS"] ?? 0 },
  ];

  const exportRows = result.map((row) => ({
    kode: row.tipe,
    nama: row.tipe,
    tipe: row.tipe,
    saldo: row.saldo,
  }));
  const buffer = await buildNeracaExcelWithQR(null, exportRows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=neraca-armada.xlsx",
    },
  });
}
