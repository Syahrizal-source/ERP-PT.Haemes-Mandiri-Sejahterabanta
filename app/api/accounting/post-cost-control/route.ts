import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { createJurnalProyek } from "@/lib/services/createJurnalProyek";

type Body = {
  id_cost_control: string;
  id_periode: number;
};

type CoaRow = { id_coa: number };

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { id_cost_control, id_periode } = body;

    const { data: cc, error } = await db
      .from("proyek_cost_control")
      .select("id, id_proyek, tanggal, biaya_realisasi")
      .eq("id", id_cost_control)
      .single();

    if (error || !cc) {
      return NextResponse.json(
        { error: "Cost Control tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!cc.id_proyek) {
      return NextResponse.json(
        { error: "Cost control belum terkait proyek" },
        { status: 400 },
      );
    }

    const { data: pajak } = await db
      .from("regulasi_pajak")
      .select("tarif")
      .eq("kode_pajak", "PPN_PROYEK")
      .single();

    const ppn = (cc.biaya_realisasi * (pajak?.tarif ?? 0)) / 100;

    const coaBeban = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "61103")
      .single<CoaRow>();
    const coaHutang = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "21010")
      .single<CoaRow>();
    const coaPPN = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22010")
      .single<CoaRow>();

    if (!coaBeban.data || !coaHutang.data || !coaPPN.data) {
      return NextResponse.json({ error: "COA belum lengkap" }, { status: 400 });
    }

    const jurnalId = await createJurnalProyek(
      cc.tanggal,
      `CC-${cc.id}`,
      "PROYEK",
      "Posting Cost Control Proyek",
      id_periode,
      cc.id_proyek,
      [
        { id_coa: coaBeban.data.id_coa, debit: cc.biaya_realisasi, kredit: 0 },
        { id_coa: coaPPN.data.id_coa, debit: ppn, kredit: 0 },
        {
          id_coa: coaHutang.data.id_coa,
          debit: 0,
          kredit: cc.biaya_realisasi + ppn,
        },
      ],
    );

    return NextResponse.json({ success: true, jurnalId });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
