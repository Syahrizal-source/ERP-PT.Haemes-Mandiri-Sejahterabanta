import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type HutangInput = {
  id_proyek: string;
  supplier: string;
  tanggal: string;
  nilai: number;
  jatuh_tempo: string | null;
  id_coa_beban: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    if (!idProyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("proyek_hutang")
      .select("*")
      .eq("id_proyek", idProyek)
      .order("tanggal", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil hutang proyek" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: HutangInput = await req.json();

    validatePositive(body.nilai, "Nilai Hutang");

    // INSERT HUTANG
    const { data: hutang, error } = await db
      .from("proyek_hutang")
      .insert({
        id_proyek: body.id_proyek,
        supplier: body.supplier,
        tanggal: body.tanggal,
        nilai: body.nilai,
        jatuh_tempo: body.jatuh_tempo,
        status: "Unpaid (Menunggu Pembayaran)",
      })
      .select("id")
      .single();

    if (error || !hutang) {
      throw new Error("Gagal menyimpan hutang");
    }

    // POST JURNAL
    const jurnalRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/jurnal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: body.tanggal,
          no_bukti: `HTG-${hutang.id}`,
          sumber: "UMUM",
          keterangan: `Hutang Proyek - ${body.supplier}`,
          details: [
            {
              id_coa: body.id_coa_beban,
              debit: body.nilai,
              kredit: 0,
            },
            {
              id_coa: 21010,
              debit: 0,
              kredit: body.nilai,
            },
          ],
        }),
      },
    );

    if (!jurnalRes.ok) {
      throw new Error("Posting jurnal gagal");
    }

    return NextResponse.json({
      message: "Hutang & jurnal berhasil",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
