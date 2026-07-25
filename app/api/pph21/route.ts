import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pph21Schema,
  type Pph21Input,
  hitungPph21,
} from "@/lib/validators/pph21";
import { postPph21 } from "@/lib/accounting/postPph21";

type Pph21Row = {
  id: number;
  id_payroll: number;
  nama: string;
  status_ptkp: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  nilai_pph21: number;
  tanggal: string;
  created_at: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pph21")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as Pph21Row[]);
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

    const parsed = pph21Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data PPh21 tidak valid" },
        { status: 400 },
      );
    }

    const input: Pph21Input = parsed.data;

    /* =========================
       HITUNG ULANG (ANTI MINUS)
    ========================= */

    const hasil = hitungPph21(input);

    if (hasil.nilai_pph21 <= 0) {
      return NextResponse.json(
        { error: "Nilai PPh21 tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       VALIDASI PAYROLL
    ========================= */

    const { data: payroll } = await db
      .from("payroll")
      .select("id")
      .eq("id", input.id_payroll)
      .single();

    if (!payroll) {
      return NextResponse.json(
        { error: "Payroll tidak ditemukan" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("pph21")
      .insert({
        id_payroll: input.id_payroll,
        nama: input.nama,

        status_ptkp: input.status_ptkp,

        gaji_bruto: input.gaji_bruto,

        biaya_jabatan: input.biaya_jabatan,

        iuran: input.iuran,

        tarif_pph21: input.tarif_pph21,

        thr: hasil.thr,

        penghasilan_bruto: hasil.penghasilan_bruto,

        nilai_pph21: hasil.nilai_pph21,

        tanggal: input.tanggal,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert PPh21");
    }

    /* =========================
       JURNAL
    ========================= */

    try {
      await postPph21(input);
    } catch (err) {
      console.error("JURNAL PPH21 ERROR:", err);
      // ❗ tidak menggagalkan insert
    }

    return NextResponse.json({
      message: "PPh21 berhasil dibuat",
      data,
    });
  } catch (error: unknown) {
    console.error("PPH21 ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
