import { db } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LabaRugiRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "PENDAPATAN" | "BEBAN";
  nilai: number;
};

type LabaRugiJoinRow = {
  debit: number | string;
  kredit: number | string;
  coa: { id_coa: number; kode: string; nama: string; tipe: string }[] | null;
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

  /* =========================
     AMBIL DATA JURNAL POSTED
  ========================= */
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
        id_periode,
        is_posted
      )
    `,
    )
    .eq("jurnal.is_posted", true)
    .eq("jurnal.id_periode", id_periode)
    .returns<LabaRugiJoinRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<number, LabaRugiRow>();

  for (const row of data ?? []) {
    const coa = row.coa?.[0];
    if (!coa) continue;

    const coaTyped = coa as {
      id_coa: number;
      kode: string;
      nama: string;
      tipe: "PENDAPATAN" | "BEBAN" | string;
    };

    // 🔥 hanya ambil akun laba rugi
    if (coaTyped.tipe !== "PENDAPATAN" && coaTyped.tipe !== "BEBAN") continue;

    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    if (!map.has(coaTyped.id_coa)) {
      map.set(coaTyped.id_coa, {
        id_coa: coaTyped.id_coa,
        kode: coaTyped.kode,
        nama: coaTyped.nama,
        tipe: coaTyped.tipe as "PENDAPATAN" | "BEBAN",
        nilai: 0,
      });
    }

    const current = map.get(coaTyped.id_coa);
    if (!current) continue;

    /* =========================
       LOGIKA AKUNTANSI BENAR
    ========================= */
    if (coaTyped.tipe === "PENDAPATAN") {
      current.nilai += kredit - debit;
    }

    if (coaTyped.tipe === "BEBAN") {
      current.nilai += debit - kredit;
    }
  }

  const rows = Array.from(map.values()).map((r) => {
    return {
      ...r,
      nilai: Math.abs(r.nilai),
    };
  });

  /* =========================
     TOTAL
  ========================= */
  const totalPendapatan = rows
    .filter((r) => r.tipe === "PENDAPATAN")
    .reduce((sum, r) => sum + r.nilai, 0);

  const totalBeban = rows
    .filter((r) => r.tipe === "BEBAN")
    .reduce((sum, r) => sum + r.nilai, 0);

  const labaBersih = totalPendapatan - totalBeban;

  /* =========================
     RESPONSE
  ========================= */
  return NextResponse.json({
    id_periode,
    total_pendapatan: totalPendapatan,
    total_beban: totalBeban,
    laba_bersih: labaBersih,
    is_balance: true,
    rows,
  });
}
