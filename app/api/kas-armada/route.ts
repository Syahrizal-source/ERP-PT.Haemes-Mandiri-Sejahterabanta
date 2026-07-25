import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  kasArmadaSchema,
  normalizeKasArmada,
  hitungKasArmada,
  validateKasArmada,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";
import { postKasArmada } from "@/lib/accounting/postKasArmada";

type KasArmadaRow = {
  id: number;
  tanggal: string;
  sopir: string;
  penerimaan: number;
  pengembalian: number;
  pengeluaran: number;
  kasbon: number;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
  status: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("kas_armada")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as KasArmadaRow[]);
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
    /* =========================
       BACA BODY SEKALI SAJA
    ========================= */
    const raw: unknown = await req.json();

    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const dataRaw = raw as Record<string, unknown>;

    /* =========================
       NORMALIZE NUMBER (ANTI STRING)
    ========================= */
    const body = {
      tanggal: String(dataRaw.tanggal ?? ""),
      sopir: String(dataRaw.sopir ?? ""),

      penerimaan: Number(dataRaw.penerimaan ?? 0),
      pengembalian: Number(dataRaw.pengembalian ?? 0),
      pengeluaran: Number(dataRaw.pengeluaran ?? 0),
      kasbon: Number(dataRaw.kasbon ?? 0),
    };

    /* =========================
       VALIDASI
    ========================= */
    const parsed = kasArmadaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input = parsed.data;

    /* =========================
       NORMALIZE + VALIDATE
    ========================= */
    const dataNorm = normalizeKasArmada(input);
    validateKasArmada(dataNorm);

    /* =========================
       HITUNG
    ========================= */
    const hitung = hitungKasArmada(dataNorm);

    /* =========================
       INSERT
    ========================= */
    const { data, error } = await db
      .from("kas_armada")
      .insert({
        ...dataNorm,
        tanggal: dataNorm.tanggal,
        sopir: dataNorm.sopir,

        penerimaan: dataNorm.penerimaan,
        pengembalian: dataNorm.pengembalian,
        pengeluaran: dataNorm.pengeluaran,
        kasbon: dataNorm.kasbon,

        // ✅ hanya ini yang disimpan
        saldo: hitung.saldo,

        status: "DRAFT",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("KAS ARMADA INSERT ERROR:", error);

      return NextResponse.json(
        { error: error?.message ?? "Insert gagal" },
        { status: 500 },
      );
    }

    /* =========================
       JURNAL
    ========================= */
    try {
      await postKasArmada(dataNorm);

      await db
        .from("kas_armada")
        .update({ status: "POSTED" })
        .eq("id", data.id);
    } catch (err: unknown) {
      console.error("JURNAL ERROR:", err);

      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Berhasil",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
