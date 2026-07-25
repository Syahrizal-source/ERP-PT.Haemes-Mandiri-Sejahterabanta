import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type JurnalJoin = {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
};

type DetailRow = {
  debit: number;
  kredit: number;
  jurnal: JurnalJoin;
};

type BukuBesarRow = {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
};

type Coa = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
};

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const idPeriodeParam = searchParams.get("id_periode");
  const idCoaParam = searchParams.get("id_coa");

  const idPeriode = Number(idPeriodeParam);
  const idCoa = Number(idCoaParam);

  if (!Number.isInteger(idPeriode) || !Number.isInteger(idCoa)) {
    return NextResponse.json(
      { error: "Parameter tidak valid" },
      { status: 400 },
    );
  }

  /* =========================
     VALIDASI COA
  ========================= */
  const { data: coa, error: coaError } = await db
    .from("coa")
    .select("id_coa,kode,nama,tipe")
    .eq("id_coa", idCoa)
    .single();

  if (coaError || !coa) {
    return NextResponse.json({ error: "COA tidak ditemukan" }, { status: 404 });
  }

  const coaTyped = coa as Coa;

  /* =========================
     AMBIL DATA POSTED SAJA
  ========================= */
  const { data, error } = await db
    .from("jurnal_detail")
    .select(
      `
      debit,
      kredit,
      jurnal: id_jurnal (
        tanggal,
        no_bukti,
        keterangan,
        id_periode,
        is_posted
      )
    `,
    )
    .eq("id_coa", idCoa)
    .eq("jurnal.id_periode", idPeriode)
    .eq("jurnal.is_posted", true)
    .order("tanggal", {
      foreignTable: "jurnal",
      ascending: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rowsRaw = (data ?? []) as DetailRow[];

  /* =========================
     SALDO AWAL (OPSIONAL ERP)
  ========================= */
  let saldoBerjalan = 0;

  const rows: BukuBesarRow[] = rowsRaw.map((r) => {
    const debit = Number(r.debit);
    const kredit = Number(r.kredit);

    if (coaTyped.tipe === "ASET" || coaTyped.tipe === "BEBAN") {
      saldoBerjalan += debit - kredit;
    } else {
      saldoBerjalan += kredit - debit;
    }

    return {
      tanggal: r.jurnal.tanggal,
      no_bukti: r.jurnal.no_bukti,
      keterangan: r.jurnal.keterangan,
      debit,
      kredit,
      saldo: saldoBerjalan,
    };
  });

  /* =========================
     TOTAL VALIDASI
  ========================= */
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);

  return NextResponse.json({
    coa: coaTyped,
    id_periode: idPeriode,
    total_transaksi: rows.length,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    is_balance: totalDebit === totalKredit,
    rows,
  });
}
