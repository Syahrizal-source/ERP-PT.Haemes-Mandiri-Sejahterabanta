import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type JurnalFixRow = {
  id_jurnal: number;
  no_bukti: string;
  total_debit: number;
  total_kredit: number;
};

type InsertDetail = {
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
};

export async function POST(): Promise<NextResponse> {
  try {
    /* =========================
       AMBIL JURNAL TIDAK BALANCE
    ========================= */
    const { data, error } = await db.rpc("get_unbalanced_jurnal");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data as JurnalFixRow[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        message: "Semua jurnal sudah balance",
      });
    }

    /* =========================
       AMBIL COA SUSPENSE
    ========================= */
    const { data: suspenseCoa, error: coaError } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "99999")
      .single();

    if (coaError || !suspenseCoa) {
      return NextResponse.json(
        { error: "COA Suspense (99999) tidak ditemukan" },
        { status: 400 },
      );
    }

    const inserts: InsertDetail[] = [];

    for (const row of rows) {
      const selisih = row.total_debit - row.total_kredit;

      if (selisih === 0) continue;

      if (selisih > 0) {
        // kurang kredit
        inserts.push({
          id_jurnal: row.id_jurnal,
          id_coa: suspenseCoa.id_coa,
          debit: 0,
          kredit: selisih,
        });
      } else {
        // kurang debit
        inserts.push({
          id_jurnal: row.id_jurnal,
          id_coa: suspenseCoa.id_coa,
          debit: Math.abs(selisih),
          kredit: 0,
        });
      }
    }

    /* =========================
       INSERT FIX
    ========================= */
    const { error: insertError } = await db
      .from("jurnal_detail")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Auto fix berhasil",
      total_fixed: inserts.length,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
