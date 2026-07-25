import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pinjamanNonBankSchema,
  type PinjamanNonBankInput,
} from "@/lib/validators/pinjaman-non-bank";
import { postPinjamanNonBank } from "@/lib/accounting/postNonBank";

/* =========================
   TYPES
========================= */

interface PinjamanRow {
  id: number;
  tanggal: string;
  deskripsi: string;
  pihak: string;
  nominal: number;
  bunga_persen: number;
  total_bunga: number;
  total_pinjaman: number;
  saldo: number;
  tanggal_pengembalian: string | null;
  id_jurnal: number | null;
}

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pinjaman_non_bank")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: PinjamanRow[] = data ?? [];

  return NextResponse.json(rows);
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = pinjamanNonBankSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PinjamanNonBankInput = parsed.data;

    /* =========================
       HITUNG
    ========================= */
    const totalBunga: number = (input.nominal * input.bunga_persen) / 100;

    const totalPinjaman: number = input.nominal + totalBunga;

    if (totalPinjaman <= 0) {
      return NextResponse.json(
        { error: "Total pinjaman tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT DATA
    ========================= */
    const { data: inserted, error: insertError } = await db
      .from("pinjaman_non_bank")
      .insert({
        tanggal: input.tanggal,
        deskripsi: input.deskripsi,
        pihak: input.pihak,
        nominal: input.nominal,
        bunga_persen: input.bunga_persen,
        total_bunga: totalBunga,
        total_pinjaman: totalPinjaman,
        saldo: totalPinjaman,
        tanggal_pengembalian: input.tanggal_pengembalian ?? null,
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
       JURNAL
    ========================= */
    const jurnalId = await postPinjamanNonBank(
      input.tanggal,
      `PNB-${inserted.id}`,
      input.deskripsi,
      input.nominal,
      input.bunga_persen,
    );

    /* =========================
       UPDATE JURNAL ID
    ========================= */
    await db
      .from("pinjaman_non_bank")
      .update({ id_jurnal: jurnalId.jurnal_id })
      .eq("id", inserted.id);

    return NextResponse.json({
      message: "Pinjaman berhasil dibuat",
      data: inserted,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
