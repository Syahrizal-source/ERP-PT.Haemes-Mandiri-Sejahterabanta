import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasMasukSchema, type KasMasukInput } from "@/lib/validators/kas-masuk";
import { postKasMasuk } from "@/lib/accounting/postKasMasuk";

/* =========================
   TYPES
========================= */

interface KasMasukRow {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

export async function GET() {
  const { data, error } = await db
    .from("kas_masuk")
    .select(
      `
      id,
      tanggal,
      no_bukti,
      sumber,
      nominal,
      ppn,
      pph23,
      total,
      keterangan,
      id_jurnal
    `,
    )
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const payload = body as {
      tanggal: string;
      no_bukti: string;
      sumber: string;
      id_akun_kas: number;
      id_akun_lawan: number;
      nominal: number;
      keterangan: string;
    };

    const nominal: number = Number(payload.nominal);
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;
    const total: number = nominal + ppn - pph23;

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("kas_masuk")
      .insert({
        tanggal: payload.tanggal,
        no_bukti: payload.no_bukti,
        sumber: payload.sumber,
        id_akun_kas: payload.id_akun_kas,
        id_akun_lawan: payload.id_akun_lawan,
        nominal,
        ppn, // ✅ WAJIB
        pph23, // ✅ WAJIB
        total, // ✅ WAJIB
        keterangan: payload.keterangan,
      })
      .select()
      .single();

    if (error || !data) {
      throw error;
    }

    /* =========================
       POST JURNAL
    ========================= */

    const jurnalId: number = await postKasMasuk(
      payload.tanggal,
      payload.no_bukti,
      payload.keterangan,
      nominal,
      ppn,
      pph23,
    );

    await db
      .from("kas_masuk")
      .update({ id_jurnal: jurnalId })
      .eq("id", data.id);

    return NextResponse.json({
      message: "Kas masuk berhasil",
      data,
    });
  } catch (error: unknown) {
    console.error("KAS MASUK ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
