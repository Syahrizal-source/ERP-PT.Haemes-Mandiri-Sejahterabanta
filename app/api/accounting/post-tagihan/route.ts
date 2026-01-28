import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { createJurnalProyek } from "@/lib/services/createJurnalProyek";

type PostBody = {
  id_tagihan: string;
  id_periode: number;
};

type CoaRow = { id_coa: number };

export async function POST(req: NextRequest) {
  try {
    const body: PostBody = await req.json();
    const { id_tagihan, id_periode } = body;

    if (!id_tagihan || !id_periode) {
      return NextResponse.json(
        { error: "id_tagihan dan id_periode wajib" },
        { status: 400 },
      );
    }

    const { data: tagihan, error: errTagihan } = await db
      .from("proyek_tagihan")
      .select("id,id_proyek,tanggal, nilai, nomor_invoice")
      .eq("id", id_tagihan)
      .single();

    if (errTagihan || !tagihan) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan" },
        { status: 404 },
      );
    }

    const nilai = Number(tagihan.nilai);

    const { data: ppnReg } = await db
      .from("regulasi_pajak")
      .select("tarif")
      .eq("kode_pajak", "PPN_PROYEK")
      .single();

    const { data: pph4Reg } = await db
      .from("regulasi_pajak")
      .select("tarif")
      .eq("kode_pajak", "PPh4_PROYEK")
      .single();

    const tarifPPN = ppnReg?.tarif ?? 0;
    const tarifPPh4 = pph4Reg?.tarif ?? 0;

    const ppn = (nilai * tarifPPN) / 100;
    const pph4 = (nilai * tarifPPh4) / 100;

    // Ambil COA
    const coaPiutang = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "12010")
      .single<CoaRow>();
    const coaPendapatan = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "41103")
      .single<CoaRow>();
    const coaPPN = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22010")
      .single<CoaRow>();
    const coaPPh4 = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22013")
      .single<CoaRow>();
    const coaBebanPPh = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "61199")
      .single<CoaRow>(); // Beban Pajak Final

    if (
      !coaPiutang.data ||
      !coaPendapatan.data ||
      !coaPPN.data ||
      !coaPPh4.data ||
      !coaBebanPPh.data
    ) {
      return NextResponse.json({ error: "COA belum lengkap" }, { status: 400 });
    }

    // POSTING JURNAL (BALANCE)
    const jurnalId = await createJurnalProyek(
      tagihan.tanggal,
      tagihan.nomor_invoice,
      "PROYEK",
      "Posting Tagihan Proyek",
      id_periode,
      tagihan.id_proyek, // ⬅️ WAJIB
      [
        { id_coa: coaPiutang.data.id_coa, debit: nilai + ppn, kredit: 0 },
        { id_coa: coaBebanPPh.data.id_coa, debit: pph4, kredit: 0 },
        { id_coa: coaPendapatan.data.id_coa, debit: 0, kredit: nilai },
        { id_coa: coaPPN.data.id_coa, debit: 0, kredit: ppn },
        { id_coa: coaPPh4.data.id_coa, debit: 0, kredit: pph4 },
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Posting Tagihan berhasil",
      jurnalId,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
