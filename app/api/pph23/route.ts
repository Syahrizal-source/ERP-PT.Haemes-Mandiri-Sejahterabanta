import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pph23Schema,
  type Pph23Input,
  hitungPph23,
} from "@/lib/validators/pph23";
import { postPph23 } from "@/lib/accounting/postPph23";

type Pph23Row = {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
  created_at: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pph23")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as Pph23Row[]);
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

    const parsed = pph23Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data PPh23 tidak valid" },
        { status: 400 },
      );
    }

    const input: Pph23Input = parsed.data;

    /* =========================
       HITUNG ULANG (ANTI MINUS)
    ========================= */

    const pph23_terutang: number = hitungPph23(input);

    if (pph23_terutang <= 0) {
      return NextResponse.json(
        { error: "Nilai PPh23 tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       VALIDASI VENDOR
    ========================= */

    const { data: vendor, error: vendorError } = await db
      .from("vendors") // ✅ FIX DI SINI
      .select("id")
      .eq("id", input.id_vendor)
      .maybeSingle();

    if (vendorError) {
      throw new Error(vendorError.message);
    }

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor tidak ditemukan" },
        { status: 400 },
      );
    }
    console.log("ID VENDOR:", input.id_vendor);

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("pph23")
      .insert({
        id_vendor: input.id_vendor,
        jenis_jasa: input.jenis_jasa,
        nilai_transaksi: input.nilai_transaksi,
        tarif_pph23: input.tarif_pph23,
        pph23_terutang,
        tanggal_transaksi: input.tanggal_transaksi,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert PPh23");
    }

    /* =========================
       JURNAL
    ========================= */

    try {
      await postPph23(input);
    } catch (err) {
      console.error("JURNAL PPH23 ERROR:", err);
      // tidak menggagalkan transaksi
    }

    return NextResponse.json({
      message: "PPh23 berhasil dibuat",
      data,
    });
  } catch (error: unknown) {
    console.error("PPH23 ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
