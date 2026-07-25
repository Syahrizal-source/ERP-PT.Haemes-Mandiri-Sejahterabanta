import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pph25Schema,
  type Pph25Input,
  hitungPph25,
} from "@/lib/validators/pph25";
import { postPph25 } from "@/lib/accounting/postPph25";

type Pph25Row = {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  keterangan: string | null;
  id_jurnal: number | null;
  created_at: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pph25")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as Pph25Row[]);
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

    const parsed = pph25Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data PPh25 tidak valid" },
        { status: 400 },
      );
    }

    const input: Pph25Input = parsed.data;

    /* =========================
       HITUNG ULANG (ANTI MINUS)
    ========================= */

    const nilaiFinal: number = hitungPph25(input);

    if (nilaiFinal <= 0) {
      return NextResponse.json(
        { error: "Nilai PPh25 tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT DATA
    ========================= */

    const { data, error } = await db
      .from("pph25")
      .insert({
        tahun: input.tahun,
        bulan: input.bulan,
        nilai_angsuran: nilaiFinal,
        tanggal_setor: input.tanggal_setor || null,
        tanggal_transaksi: input.tanggal_transaksi,
        keterangan: input.keterangan || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert PPh25");
    }

    /* =========================
       POST JURNAL
    ========================= */

    try {
      const jurnalId: number = await postPph25(input);

      await db.from("pph25").update({ id_jurnal: jurnalId }).eq("id", data.id);
    } catch (err) {
      console.error("JURNAL PPH25 ERROR:", err);
      // tidak menggagalkan transaksi
    }

    return NextResponse.json({
      message: "PPh25 berhasil dibuat",
      data,
    });
  } catch (error: unknown) {
    console.error("PPH25 ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
