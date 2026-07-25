import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonDireksiSchema } from "@/lib/validators/kasbon";
import { postKasbon } from "@/lib/accounting/postKasbon";

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_direksi")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   POST + JURNAL
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = kasbonDireksiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, deskripsi, no_voucher, debit, kredit } = parsed.data;

  /* =========================
     INSERT KASBON
  ========================= */
  const { data: kasbon, error } = await db
    .from("kasbon_direksi")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !kasbon) {
    return NextResponse.json(
      {
        error: error?.message ?? "Gagal simpan kasbon",
      },
      { status: 500 },
    );
  }

  /* =========================
     AUTO JURNAL
  ========================= */
  const jurnalId: number = await postKasbon(
    "DIREKSI",
    tanggal,
    `KD-${no_voucher}`,
    `Kasbon Direksi - ${deskripsi}`,
    debit,
  );

  if (!jurnalId) {
    return NextResponse.json(
      { error: "Gagal membuat jurnal" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    jurnal_id: jurnalId,
    message: "Kasbon Direksi berhasil & jurnal terbentuk",
  });
}
