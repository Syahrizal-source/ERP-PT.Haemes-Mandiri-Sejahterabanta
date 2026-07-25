import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PiutangNonProyekSchema,
  PiutangNonProyekInput,
} from "@/lib/validators/piutangnonproyek";

/* =========================
   GET PIUTANG NON PROYEK
========================= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    let query = db
      .from("piutang_non_proyek")
      .select("*")
      .order("tanggal", { ascending: true });

    if (idProyek && idProyek.trim() !== "") {
      query = query.eq("id_proyek", idProyek);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    console.error("GET PIUTANG ERROR:", e);

    return NextResponse.json(
      {
        error: (e as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   POST PIUTANG + JURNAL
========================= */
export async function POST(req: NextRequest) {
  try {
    const payload: PiutangNonProyekInput = PiutangNonProyekSchema.parse(
      await req.json(),
    );

    // ambil periode OPEN
    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      return NextResponse.json(
        { error: "Tidak ada periode OPEN" },
        { status: 400 },
      );
    }

    const insertData = {
      id_proyek: payload.id_proyek,
      tanggal: payload.tanggal,
      deskripsi: payload.deskripsi,
      debit: payload.debit,
      kredit: payload.kredit,
      saldo: payload.saldo,
    };

    // insert piutang
    const { data: piutang, error } = await db
      .from("piutang_non_proyek")
      .insert(insertData)
      .select("id")
      .single();

    if (error || !piutang) {
      throw new Error("Gagal menyimpan piutang");
    }

    // buat jurnal
    const { data: jurnal } = await db
      .from("jurnal")
      .insert({
        tanggal: payload.tanggal,
        no_bukti: `PNP-${piutang.id}`,
        sumber: "UMUM",
        keterangan: payload.deskripsi,
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (!jurnal) {
      throw new Error("Gagal membuat jurnal");
    }

    // jurnal detail
    await db.from("jurnal_detail").insert([
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 12020, // Piutang
        debit: payload.debit,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 41020, // Pendapatan lain-lain
        debit: 0,
        kredit: payload.kredit,
      },
    ]);

    return NextResponse.json({
      message: "Piutang non proyek & jurnal berhasil",
    });
  } catch (e) {
    console.error("POST PIUTANG ERROR:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
