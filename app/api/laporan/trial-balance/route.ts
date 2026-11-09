import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type TrialBalanceRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
  total_debit: number;
  total_kredit: number;
  saldo: number;
};

type TrialBalanceJoinRow = {
  debit: number | string;
  kredit: number | string;
  coa:
    | {
        id_coa: number;
        kode: string;
        nama: string;
        tipe: TrialBalanceRow["tipe"];
      }[]
    | null;
};

export async function GET(req: Request): Promise<NextResponse> {
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

  const { data, error } = await db
    .from("jurnal_detail")
    .select(
      `
      debit,
      kredit,
      coa:id_coa (
        id_coa,
        kode,
        nama,
        tipe
      ),
      jurnal:id_jurnal (
        id_periode
      )
    `,
    )
    .eq("jurnal.is_posted", true)
    .eq("jurnal.id_periode", id_periode)
    .returns<TrialBalanceJoinRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<number, TrialBalanceRow>();

  for (const row of data ?? []) {
    const coa = row.coa?.[0];
    if (!coa) continue;

    const coaTyped = coa as {
      id_coa: number;
      kode: string;
      nama: string;
      tipe: TrialBalanceRow["tipe"];
    };

    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    if (!map.has(coaTyped.id_coa)) {
      map.set(coaTyped.id_coa, {
        id_coa: coaTyped.id_coa,
        kode: coaTyped.kode,
        nama: coaTyped.nama,
        tipe: coaTyped.tipe,
        total_debit: 0,
        total_kredit: 0,
        saldo: 0,
      });
    }

    const current = map.get(coaTyped.id_coa);
    if (!current) continue;

    current.total_debit += debit;
    current.total_kredit += kredit;

    if (coaTyped.tipe === "ASET" || coaTyped.tipe === "BEBAN") {
      current.saldo = current.total_debit - current.total_kredit;
    } else {
      current.saldo = current.total_kredit - current.total_debit;
    }
  }

  const rows = Array.from(map.values()).sort((a, b) =>
    a.kode.localeCompare(b.kode),
  );

  const total_debit = rows.reduce((sum, r) => sum + r.total_debit, 0);
  const total_kredit = rows.reduce((sum, r) => sum + r.total_kredit, 0);

  return NextResponse.json({
    id_periode,
    total_debit,
    total_kredit,
    is_balance: total_debit === total_kredit,
    rows,
  });
}
