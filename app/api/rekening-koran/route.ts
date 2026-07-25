import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  rekeningKoranSchema,
  normalizeRekeningKoran,
  hitungSaldoBaru,
  validasiJenis,
  type RekeningKoranInput,
} from "@/lib/validators/rekeningKoran";
import { postRekeningKoran } from "@/lib/accounting/postRekeningKoran";

type RekeningKoranRow = {
  id: number;
  id_rekening: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
  jenis: string;
  id_jurnal: number | null;
  created_at: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("rekening_koran")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as RekeningKoranRow[]);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   POST
========================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = rekeningKoranSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: RekeningKoranInput = parsed.data;

    /* =========================
       NORMALISASI + VALIDASI
    ========================= */

    const dataNorm = normalizeRekeningKoran(input);
    validasiJenis(dataNorm);

    /* =========================
       AMBIL SALDO TERAKHIR
    ========================= */

    const { data: lastRow } = await db
      .from("rekening_koran")
      .select("saldo")
      .eq("id_rekening", dataNorm.id_rekening)
      .order("tanggal", { ascending: false })
      .limit(1)
      .maybeSingle();

    const saldoSebelumnya: number = lastRow?.saldo ?? 0;

    const saldoBaru: number = hitungSaldoBaru(saldoSebelumnya, dataNorm);

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("rekening_koran")
      .insert({
        id_rekening: dataNorm.id_rekening,
        tanggal: dataNorm.tanggal,
        deskripsi: dataNorm.deskripsi,
        debit: dataNorm.debit,
        kredit: dataNorm.kredit,
        saldo: saldoBaru,
        jenis: dataNorm.jenis,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert");
    }

    /* =========================
       POST JURNAL
    ========================= */

    try {
      const jurnalId: number = await postRekeningKoran(dataNorm);

      await db
        .from("rekening_koran")
        .update({ id_jurnal: jurnalId })
        .eq("id", data.id);
    } catch (err: unknown) {
      console.error("JURNAL ERROR:", err);

      return NextResponse.json(
        { error: "Gagal membuat jurnal rekening koran" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Rekening koran berhasil ditambahkan",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
