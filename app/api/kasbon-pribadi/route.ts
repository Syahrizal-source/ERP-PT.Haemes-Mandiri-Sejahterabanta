import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonPribadiSchema } from "@/lib/validators/kasbon";
import { postKasbon } from "@/lib/accounting/postKasbon";

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_pribadi")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   POST + SALDO + JURNAL
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = kasbonPribadiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, deskripsi, no_voucher, debit, kredit } = parsed.data;

  /* =========================
     HITUNG SALDO
  ========================= */
  const { data: last } = await db
    .from("kasbon_pribadi")
    .select("saldo")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .single();

  const saldoSebelumnya: number = Number(last?.saldo ?? 0);

  const saldoBaru: number = saldoSebelumnya + debit - kredit;

  /* =========================
     INSERT KASBON
  ========================= */
  const { data: kasbon, error } = await db
    .from("kasbon_pribadi")
    .insert({
      ...parsed.data,
      saldo: saldoBaru,
    })
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
    "PRIBADI",
    tanggal,
    `KP-${no_voucher}`,
    `Kasbon Pribadi - ${deskripsi}`,
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
    message: "Kasbon Pribadi berhasil & jurnal terbentuk",
  });
}
