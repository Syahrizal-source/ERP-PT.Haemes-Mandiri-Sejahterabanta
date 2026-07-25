import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Coa = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
};

type JurnalDetail = {
  debit: number;
  kredit: number;
  coa: Coa | null;
};

type GroupResult = {
  operasional: number;
  investasi: number;
  pendanaan: number;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const idPeriodeParam = searchParams.get("id_periode");

  if (!idPeriodeParam) {
    return NextResponse.json(
      { error: "id_periode wajib diisi" },
      { status: 400 },
    );
  }

  const id_periode = Number(idPeriodeParam);

  if (!Number.isInteger(id_periode)) {
    return NextResponse.json(
      { error: "id_periode tidak valid" },
      { status: 400 },
    );
  }

  /* =========================
     AMBIL JURNAL POSTED
  ========================= */
  const { data, error } = await db
    .from("jurnal_detail")
    .select(
      `
      debit,
      kredit,
      jurnal:id_jurnal (
        id_periode,
        is_posted
      ),
      coa:id_coa (
        id_coa,
        kode,
        nama,
        tipe
      )
    `,
    )
    .eq("jurnal.id_periode", id_periode)
    .eq("jurnal.is_posted", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data as JurnalDetail[];

  const kasCodes = ["11001", "11002", "11010", "11020", "11040"];

  let operasional = 0;
  let investasi = 0;
  let pendanaan = 0;

  for (const r of rows) {
    if (!r.coa) continue;

    const kode = r.coa.kode;
    const debit = Number(r.debit);
    const kredit = Number(r.kredit);

    const net = debit - kredit;

    /* =========================
       HANYA YANG BERKAITAN DENGAN KAS
    ========================= */
    if (!kasCodes.includes(kode) && r.coa.tipe === "ASET") continue;

    /* =========================
       OPERASIONAL
    ========================= */
    if (r.coa.tipe === "PENDAPATAN" || r.coa.tipe === "BEBAN") {
      operasional += net;
    } else if (r.coa.tipe === "ASET" && !kasCodes.includes(kode)) {

    /* =========================
       INVESTASI
    ========================= */
      investasi += net;
    } else if (r.coa.tipe === "LIABILITAS" || r.coa.tipe === "EKUITAS") {

    /* =========================
       PENDANAAN
    ========================= */
      pendanaan += net;
    }
  }

  const total = operasional + investasi + pendanaan;

  return NextResponse.json({
    id_periode,
    operasional,
    investasi,
    pendanaan,
    total,
  });
}
