import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { JurnalSchema } from "@/schemas/jurnal.schema";
import { validateBalance } from "@/lib/validators/jurnal";
import { isPeriodeClosed } from "@/lib/utils/periodelock";

/* ===============================
   SETUP SUPABASE
================================ */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/* ===============================
   TYPES
================================ */
interface Params {
  id: string;
}

interface JurnalRow {
  id_jurnal: string; // BIGINT → string
  id_periode: string; // BIGINT → string
}

/* ===============================
   PUT: Update Jurnal
================================ */
export async function PUT(req: Request, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params;
    const id_jurnal: string = id;

    if (!id_jurnal) {
      return NextResponse.json(
        { message: "id_jurnal tidak valid" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = JurnalSchema.parse(body);

    // ✅ VALIDASI DEBIT = KREDIT
    validateBalance(parsed.details);

    /* ===============================
       Ambil jurnal existing
    ================================ */
    const { data: jurnal, error: fetchError } = await supabase
      .from("jurnal")
      .select("id_jurnal, id_periode")
      .eq("id_jurnal", id_jurnal)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!jurnal) {
      return NextResponse.json(
        { message: "Jurnal tidak ditemukan" },
        { status: 404 },
      );
    }

    const jurnalRow = jurnal as JurnalRow;

    /* ===============================
       🔒 LOCK jika periode CLOSED
    ================================ */
    const locked = await isPeriodeClosed(jurnalRow.id_periode);

    if (locked) {
      return NextResponse.json(
        { message: "Periode CLOSED, jurnal tidak bisa diubah" },
        { status: 403 },
      );
    }

    /* ===============================
       Update header jurnal
    ================================ */
    const { error: updateError } = await supabase
      .from("jurnal")
      .update({
        tanggal: parsed.tanggal,
        no_bukti: parsed.no_bukti,
        keterangan: parsed.keterangan,
        id_periode: String(parsed.id_periode),
      })
      .eq("id_jurnal", id_jurnal);

    if (updateError) throw updateError;

    /* ===============================
       Replace jurnal_detail
    ================================ */

    // 1️⃣ Hapus detail lama
    const { error: deleteError } = await supabase
      .from("jurnal_detail")
      .delete()
      .eq("id_jurnal", id_jurnal);

    if (deleteError) throw deleteError;

    // 2️⃣ Insert detail baru
    const detailRows = parsed.details.map((d) => ({
      id_jurnal: id_jurnal,
      id_coa: String(d.id_coa),
      debit: d.debit,
      kredit: d.kredit,
    }));

    const { error: insertError } = await supabase
      .from("jurnal_detail")
      .insert(detailRows);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT JURNAL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal update jurnal" },
      { status: 400 },
    );
  }
}

/* ===============================
   DELETE: Delete Jurnal
================================ */
export async function DELETE(_: Request, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params;
    const id_jurnal: string = id;

    if (!id_jurnal) {
      return NextResponse.json(
        { message: "id_jurnal tidak valid" },
        { status: 400 },
      );
    }

    /* ===============================
       Ambil jurnal existing
    ================================ */
    const { data: jurnal, error: fetchError } = await supabase
      .from("jurnal")
      .select("id_jurnal, id_periode")
      .eq("id_jurnal", id_jurnal)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!jurnal) {
      return NextResponse.json(
        { message: "Jurnal tidak ditemukan" },
        { status: 404 },
      );
    }

    const jurnalRow = jurnal as JurnalRow;

    /* ===============================
       🔒 LOCK jika periode CLOSED
    ================================ */
    const locked = await isPeriodeClosed(jurnalRow.id_periode);

    if (locked) {
      return NextResponse.json(
        { message: "Periode CLOSED, jurnal tidak bisa dihapus" },
        { status: 403 },
      );
    }

    /* ===============================
       Hapus detail → header
    ================================ */
    const { error: deleteDetailError } = await supabase
      .from("jurnal_detail")
      .delete()
      .eq("id_jurnal", id_jurnal);

    if (deleteDetailError) throw deleteDetailError;

    const { error: deleteHeaderError } = await supabase
      .from("jurnal")
      .delete()
      .eq("id_jurnal", id_jurnal);

    if (deleteHeaderError) throw deleteHeaderError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE JURNAL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal hapus jurnal" },
      { status: 400 },
    );
  }
}
