import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  armadaSchema,
  normalizeArmada,
  hitungArmada,
  validateArmada,
  type ArmadaInput,
} from "@/lib/validators/armada";
import { postArmada } from "@/lib/accounting/postArmada";

type ArmadaRow = {
  id: number;
  user_id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  no_pintu: string;
  supir: string;
  hp: string | null;
  buangan_galian: string;
  m3: number;
  rit: number;
  tagihan: number;
  uang_jalan: number;
  belanja: number;
  do_qty: number;
  mel: number;
  tambal_ban: number;
  inap_um: number;
  sub_bak_besar: number;
  perg_solar: number;
  kaca_film_bemper: number;
  sparepart: number;
  koordinasi: number;
  adm: number;
  stnk_kir: number;
  jumlah_tagihan: number;
  jumlah_uang_jalan: number;
  jumlah_do: number;
  bersih: number;
  status: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("armada")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as ArmadaRow[]);
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

    const parsed = armadaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: ArmadaInput = parsed.data;

    /* =========================
       NORMALIZE + VALIDATE
    ========================= */
    const dataNorm = normalizeArmada(input);
    validateArmada(dataNorm);

    /* =========================
       HITUNG
    ========================= */
    const hitung = hitungArmada(dataNorm);

    /* =========================
   INSERT (SAFE FIELD ONLY)
========================= */
    const insertData = {
      user_id: dataNorm.user_id ?? 2, // ✅ FIX WAJIB

      tanggal: dataNorm.tanggal,
      kode_transaksi: dataNorm.kode_transaksi,
      no_polisi: dataNorm.no_polisi,
      no_pintu: dataNorm.no_pintu,
      supir: dataNorm.supir,
      hp: dataNorm.hp,
      buangan_galian: dataNorm.buangan_galian,

      // ❌ m3 DIHAPUS TOTAL

      rit: dataNorm.rit,
      tagihan: dataNorm.tagihan,
      uang_jalan: dataNorm.uang_jalan,
      belanja: dataNorm.belanja,
      do_qty: dataNorm.do_qty,
      mel: dataNorm.mel,
      tambal_ban: dataNorm.tambal_ban,
      inap_um: dataNorm.inap_um,
      sub_bak_besar: dataNorm.sub_bak_besar,
      perg_solar: dataNorm.perg_solar,
      kaca_film_bemper: dataNorm.kaca_film_bemper,
      sparepart: dataNorm.sparepart,
      koordinasi: dataNorm.koordinasi,
      adm: dataNorm.adm,
      stnk_kir: dataNorm.stnk_kir,

      jumlah_tagihan: hitung.jumlah_tagihan,
      jumlah_uang_jalan: hitung.jumlah_uang_jalan,
      jumlah_do: hitung.jumlah_do,
      bersih: hitung.bersih,
    };

    const { data, error } = await db
      .from("armada")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      console.error("ARMADA INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: error?.message ?? "Insert armada gagal (unknown)",
        },
        { status: 500 },
      );
    }

    /* =========================
       POST JURNAL
    ========================= */
    try {
      const jurnalId = await postArmada(dataNorm);

      await db.from("armada").update({ status: "POSTED" }).eq("id", data.id);
    } catch (err: unknown) {
      console.error("JURNAL ARMADA ERROR:", err);

      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Armada berhasil disimpan",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
