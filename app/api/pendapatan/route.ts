import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pendapatanSchema } from "@/lib/validators/pendapatan";
import { postPendapatan } from "@/lib/accounting/postPendapatan";

export async function GET() {
  const { data, error } = await db
    .from("pendapatan")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    const parsed = pendapatanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid" },
        { status: 400 },
      );
    }

    const input = parsed.data;

    /* =========================
       HITUNG PAJAK
    ========================= */

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;
    const total: number = nominal + ppn - pph23;

    if (total <= 0) {
      return NextResponse.json(
        { error: "Total tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT DB
    ========================= */

    const { data: inserted, error: insertError } = await db
      .from("pendapatan")
      .insert({
        tanggal: input.tanggal,
        id_coa: input.id_coa,
        nominal,
        ppn,
        pph23,
        total,
        keterangan: input.keterangan,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message },
        { status: 500 },
      );
    }

    /* =========================
       POST JURNAL
    ========================= */

    const jurnalId = await postPendapatan(
      input.tanggal,
      `PEND-${inserted.id}`,
      input.keterangan,
      nominal,
      ppn,
      pph23,
      total,
    );

    await db
      .from("pendapatan")
      .update({ id_jurnal: jurnalId })
      .eq("id", inserted.id);

    return NextResponse.json({
      message: "Pendapatan berhasil disimpan",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}