import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasKeluarSchema } from "@/lib/validators/kas-keluar";
import { postKasKeluar } from "@/lib/accounting/postKasKeluar";

/* =========================
   TYPES
========================= */

interface KasKeluarRow {
  id: number;
  tanggal: string;
  no_bukti: string;
  tujuan: string;
  id_akun_kas: number;
  id_akun_beban: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kas_keluar")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = kasKeluarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input = parsed.data;

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;
    const total: number = nominal + ppn - pph23;

    /* =========================
       ANTI MINUS
    ========================= */

    if (total <= 0) {
      return NextResponse.json(
        { error: "Total kas keluar tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("kas_keluar")
      .insert({
        tanggal: input.tanggal,
        no_bukti: input.no_bukti,
        tujuan: input.tujuan,
        id_akun_kas: input.id_akun_kas,
        id_akun_beban: input.id_akun_beban,
        nominal,
        ppn,
        pph23,
        total,
        keterangan: input.keterangan,
      })
      .select()
      .single();

    if (error || !data) {
      throw error;
    }

    /* =========================
       POST JURNAL
    ========================= */

    const jurnalId: number = await postKasKeluar(
      input.tanggal,
      input.no_bukti,
      input.keterangan,
      nominal,
      ppn,
      pph23,
      input.id_akun_kas,
      input.id_akun_beban,
    );

    await db
      .from("kas_keluar")
      .update({ id_jurnal: jurnalId })
      .eq("id", data.id);

    return NextResponse.json({
      message: "Kas keluar berhasil",
      data,
    });
  } catch (error: unknown) {
    console.error("KAS KELUAR ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
