import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Jurnal = {
  id_jurnal: number;
};

type Detail = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ message: "Skip opening (no body)" });
    }

    const from_periode = Number(body.from_periode);
    const to_periode = Number(body.to_periode);

    if (!Number.isInteger(from_periode) || !Number.isInteger(to_periode)) {
      return NextResponse.json({ message: "Skip opening (invalid periode)" });
    }

    /* =========================
       AMBIL JURNAL POSTED
    ========================= */
    const { data: jurnal } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("id_periode", from_periode)
      .eq("is_posted", true);

    const jurnalIds: number[] =
      (jurnal as Jurnal[] | null)?.map((j) => j.id_jurnal) ?? [];

    if (jurnalIds.length === 0) {
      return NextResponse.json({
        message: "Skip opening (tidak ada jurnal)",
      });
    }

    /* =========================
       AMBIL DETAIL
    ========================= */
    const { data: detail } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit")
      .in("id_jurnal", jurnalIds);

    if (!detail || detail.length === 0) {
      return NextResponse.json({
        message: "Skip opening (tidak ada detail)",
      });
    }

    const map = new Map<number, number>();

    for (const d of detail as Detail[]) {
      const saldo = Number(d.debit) - Number(d.kredit);
      map.set(d.id_coa, (map.get(d.id_coa) ?? 0) + saldo);
    }

    if (map.size === 0) {
      return NextResponse.json({
        message: "Skip opening (saldo kosong)",
      });
    }

    /* =========================
   AMBIL PERIODE OPEN YANG ADA
========================= */
    const { data: periodeTujuan } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .maybeSingle();

    if (!periodeTujuan) {
      return NextResponse.json({
        message: "Skip opening (tidak ada periode OPEN)",
      });
    }

    const targetPeriode = Number(periodeTujuan.id_periode);

    /* =========================
       INSERT JURNAL OPENING
    ========================= */
    const { data: jurnalBaru, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: new Date().toISOString(),
        no_bukti: `OPEN-${targetPeriode}-${Date.now()}`,
        keterangan: "Opening Balance",
        sumber: "PENYESUAIAN",
        id_periode: targetPeriode,
        is_posted: true,
      })
      .select()
      .single();
    if (jurnalError || !jurnalBaru) {
      console.error(jurnalError);
      return NextResponse.json({
        message: "Skip opening (gagal insert jurnal)",
      });
    }

    const detailInsert: {
      id_jurnal: number;
      id_coa: number;
      debit: number;
      kredit: number;
    }[] = [];

    for (const [id_coa, saldo] of map.entries()) {
      if (saldo > 0) {
        detailInsert.push({
          id_jurnal: jurnalBaru.id_jurnal,
          id_coa,
          debit: saldo,
          kredit: 0,
        });
      } else if (saldo < 0) {
        detailInsert.push({
          id_jurnal: jurnalBaru.id_jurnal,
          id_coa,
          debit: 0,
          kredit: Math.abs(saldo),
        });
      }
    }

    if (detailInsert.length === 0) {
      return NextResponse.json({
        message: "Skip opening (detail kosong)",
      });
    }

    await db.from("jurnal_detail").insert(detailInsert);

    return NextResponse.json({
      message: "Opening balance berhasil",
    });
  } catch (err) {
    console.error("OPENING ERROR:", err);

    return NextResponse.json({
      message: "Opening balance di-skip (error aman)",
    });
  }
}
