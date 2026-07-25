import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Jurnal = {
  id_jurnal: number;
  no_bukti: string;
  tanggal: string;
  id_periode: number;
};

type Detail = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export async function POST(): Promise<NextResponse> {
  try {
    /* =========================
       AMBIL JURNAL UMUM (TARGET)
    ========================= */
    const { data: jurnalList, error: jError } = await db
      .from("jurnal")
      .select("id_jurnal, no_bukti, tanggal, id_periode")
      .eq("sumber", "UMUM")
      .eq("is_posted", true);

    if (jError) {
      return NextResponse.json({ error: jError.message }, { status: 500 });
    }

    let totalReversal = 0;

    for (const j of jurnalList ?? []) {
      /* =========================
         CEK SUDAH PERNAH DIREVERSAL?
      ========================= */
      const { data: cek } = await db
        .from("jurnal")
        .select("id_jurnal")
        .ilike("keterangan", `%REVERSAL ${j.no_bukti}%`)
        .limit(1);

      if (cek && cek.length > 0) {
        continue; // skip kalau sudah pernah
      }

      /* =========================
         AMBIL DETAIL
      ========================= */
      const { data: details } = await db
        .from("jurnal_detail")
        .select("id_coa, debit, kredit")
        .eq("id_jurnal", j.id_jurnal);

      if (!details || details.length === 0) continue;

      /* =========================
         BUAT JURNAL REVERSAL
      ========================= */
      const { data: revJurnal } = await db
        .from("jurnal")
        .insert({
          tanggal: new Date().toISOString().slice(0, 10),
          no_bukti: `REV-${j.no_bukti}`,
          sumber: "UMUM",
          keterangan: `REVERSAL ${j.no_bukti}`,
          id_periode: j.id_periode,
          is_posted: true,
        })
        .select("id_jurnal")
        .single();

      if (!revJurnal) continue;

      /* =========================
         BALIKKAN DETAIL
      ========================= */
      const reversed = details.map((d: Detail) => ({
        id_jurnal: revJurnal.id_jurnal,
        id_coa: d.id_coa,
        debit: d.kredit,
        kredit: d.debit,
      }));

      await db.from("jurnal_detail").insert(reversed);

      totalReversal++;
    }

    return NextResponse.json({
      message: `Auto reversal selesai`,
      total: totalReversal,
    });
  } catch (err) {
    return NextResponse.json({ error: "Gagal auto reversal" }, { status: 500 });
  }
}
