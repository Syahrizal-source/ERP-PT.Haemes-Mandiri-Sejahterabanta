import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { jurnalPenyesuaianSchema } from "@/lib/validators/jurnal-penyesuaian";
import { validateBalance } from "@/lib/validators/jurnal";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = jurnalPenyesuaianSchema.parse(body);

    validateBalance(parsed.details);

    // 1️⃣ simpan header penyesuaian
    const { data: penyesuaian, error: pe } = await db
      .from("jurnal_penyesuaian")
      .insert({
        tanggal: parsed.tanggal,
        id_periode: parsed.id_periode,
        keterangan: parsed.keterangan,
      })
      .select("id")
      .single();

    if (pe || !penyesuaian) throw pe;

    // 2️⃣ simpan detail penyesuaian
    for (const d of parsed.details) {
      await db.from("jurnal_penyesuaian_detail").insert({
        id_penyesuaian: penyesuaian.id,
        id_coa: d.id_coa,
        debit: d.debit,
        kredit: d.kredit,
      });
    }

    // 3️⃣ POSTING KE JURNAL UTAMA
    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: parsed.tanggal,
        id_periode: parsed.id_periode,
        sumber: "PENYESUAIAN",
        keterangan: parsed.keterangan,
        no_bukti: `ADJ-${penyesuaian.id}`,
      })
      .select("id_jurnal")
      .single();

    if (jurnalError || !jurnal) {
      throw new Error(
        jurnalError?.message ?? "Gagal membuat jurnal penyesuaian.",
      );
    }

    for (const d of parsed.details) {
      await db.from("jurnal_detail").insert({
        id_jurnal: jurnal.id_jurnal,
        id_coa: d.id_coa,
        debit: d.debit,
        kredit: d.kredit,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal jurnal penyesuaian" },
      { status: 400 },
    );
  }
}
