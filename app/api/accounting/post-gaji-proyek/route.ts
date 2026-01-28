import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { createJurnalProyek } from "@/lib/services/createJurnalProyek";

type Body = {
  id_tenaga_kerja: string;
  id_periode: number;
};

type CoaRow = { id_coa: number };

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { id_tenaga_kerja, id_periode } = body;

    const { data: tk, error } = await db
      .from("proyek_tenaga_kerja")
      .select("id, id_proyek, upah")
      .eq("id", id_tenaga_kerja)
      .single();

    if (error || !tk) {
      return NextResponse.json(
        { error: "Tenaga kerja tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!tk.id_proyek) {
      return NextResponse.json(
        { error: "Tenaga kerja belum terkait proyek" },
        { status: 400 },
      );
    }

    const { data: pph21Reg } = await db
      .from("regulasi_pajak")
      .select("tarif")
      .eq("kode_pajak", "PPh21_PROYEK")
      .single();

    const pph21 = (tk.upah * (pph21Reg?.tarif ?? 0)) / 100;

    const coaBeban = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "61103")
      .single<CoaRow>();
    const coaKas = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "11030")
      .single<CoaRow>();
    const coaPPh21 = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22011")
      .single<CoaRow>();

    if (!coaBeban.data || !coaKas.data || !coaPPh21.data) {
      return NextResponse.json({ error: "COA belum lengkap" }, { status: 400 });
    }

    const jurnalId = await createJurnalProyek(
      new Date().toISOString().slice(0, 10),
      `GAJI-${tk.id}`,
      "PROYEK",
      "Posting Gaji Proyek",
      id_periode,
      tk.id_proyek,
      [
        { id_coa: coaBeban.data.id_coa, debit: tk.upah, kredit: 0 },
        { id_coa: coaPPh21.data.id_coa, debit: 0, kredit: pph21 },
        { id_coa: coaKas.data.id_coa, debit: 0, kredit: tk.upah - pph21 },
      ],
    );

    return NextResponse.json({ success: true, jurnalId });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
