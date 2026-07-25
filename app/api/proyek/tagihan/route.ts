import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { TagihanProyekSchema } from "@/lib/validators/tagihanproyek";
import { validatePositive } from "@/lib/validator";

/* ======================
   GET TAGIHAN PER PROYEK
====================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = searchParams.get("id_proyek");

    if (!id_proyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("proyek_tagihan")
      .select("*")
      .eq("id_proyek", id_proyek)
      .order("tanggal", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/* ======================
   POST TAGIHAN + JURNAL
====================== */
export async function POST(req: NextRequest) {
  try {
    const payload = TagihanProyekSchema.parse(await req.json());
    validatePositive(payload.nilai, "Nilai");

    // periode OPEN
    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      throw new Error("Tidak ada periode OPEN");
    }

    // simpan tagihan
    const { data: tagihan, error } = await db
      .from("proyek_tagihan")
      .insert(payload)
      .select("id")
      .single();

    if (error || !tagihan) {
      throw new Error("Gagal menyimpan tagihan");
    }

    // jurnal header
    const { data: jurnal } = await db
      .from("jurnal")
      .insert({
        tanggal: payload.tanggal,
        no_bukti: `INV-${payload.nomor_invoice}`,
        sumber: "UMUM",
        keterangan: "Tagihan Proyek",
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (!jurnal) {
      throw new Error("Gagal membuat jurnal");
    }

    // jurnal detail
    const details = [
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 12010, // PIUTANG USAHA PROYEK
        debit: payload.nilai,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 41010, // PENDAPATAN PROYEK
        debit: 0,
        kredit: payload.nilai,
      },
    ];

    const { error: errDetail } = await db.from("jurnal_detail").insert(details);

    if (errDetail) {
      throw new Error("Gagal membuat jurnal detail");
    }

    return NextResponse.json({
      message: "Tagihan & jurnal berhasil",
    });
  } catch (e: unknown) {
    console.error("TAGIHAN ERROR:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
