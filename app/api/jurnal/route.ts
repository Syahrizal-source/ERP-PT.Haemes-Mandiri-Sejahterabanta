import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { JurnalSchema } from "@/schemas/jurnal.schema";
import { validateBalance } from "@/lib/utils/jurnal";

/* =========================
   GET JURNAL
========================= */
export async function GET() {
  try {
    const { data, error } = await db
      .from("jurnal")
      .select(
        `
        id_jurnal,
        tanggal,
        no_bukti,
        sumber,
        keterangan,
        id_periode,
        created_at,
        jurnal_detail (
          id_detail,
          id_coa,
          debit,
          kredit
        )
      `,
      )
      .order("tanggal", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET JURNAL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal ambil jurnal" },
      { status: 500 },
    );
  }
}

/* =========================
   POST JURNAL
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1️⃣ VALIDASI ZOD
    const parsed = JurnalSchema.parse(body);

    // 2️⃣ VALIDASI DEBIT = KREDIT
    validateBalance(parsed.details);

    // 3️⃣ CEK PERIODE (WAJIB ADA & OPEN)
    const { data: periode, error: periodeError } = await db
      .from("periode")
      .select("id_periode, status")
      .eq("id_periode", parsed.id_periode)
      .single();

    if (periodeError || !periode) {
      return NextResponse.json(
        { message: "Periode tidak ditemukan" },
        { status: 400 },
      );
    }

    if (periode.status === "CLOSED") {
      return NextResponse.json(
        { message: "Periode sudah ditutup" },
        { status: 403 },
      );
    }

    // 4️⃣ INSERT JURNAL (HEADER)
    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: parsed.tanggal,
        no_bukti: parsed.no_bukti,
        sumber: parsed.sumber,
        keterangan: parsed.keterangan,
        id_periode: parsed.id_periode,
      })
      .select("id_jurnal")
      .single();

    if (jurnalError || !jurnal) throw jurnalError;

    // 5️⃣ INSERT JURNAL DETAIL
    const detailsPayload = parsed.details.map((d) => ({
      id_jurnal: jurnal.id_jurnal,
      id_coa: d.id_coa,
      debit: d.debit,
      kredit: d.kredit,
    }));

    const { error: detailError } = await db
      .from("jurnal_detail")
      .insert(detailsPayload);

    if (detailError) throw detailError;

    return NextResponse.json({
      message: "Jurnal berhasil disimpan",
      id_jurnal: jurnal.id_jurnal,
    });
  } catch (error) {
    console.error("POST JURNAL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal simpan jurnal" },
      { status: 400 },
    );
  }
}
