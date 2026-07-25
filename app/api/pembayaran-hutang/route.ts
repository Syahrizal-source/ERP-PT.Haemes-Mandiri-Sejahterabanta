import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pembayaranHutangSchema,
  type PembayaranHutangInput,
} from "@/lib/validators/pembayaran-hutang";
import { postPembayaranHutang } from "@/lib/accounting/postPembayaranHutang";

interface Row {
  id: number;
  tanggal: string;
  id_hutang: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
}

export async function GET() {
  const { data, error } = await db
    .from("pembayaran_hutang")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: Row[] = data ?? [];

  /* =========================
     HITUNG STATUS REAL
  ========================= */

  const result = await Promise.all(
    rows.map(async (item) => {
      const { data: hutang } = await db
        .from("hutang")
        .select("nilai")
        .eq("id_hutang", item.id_hutang)
        .single();

      const nilaiHutang: number = Number(hutang?.nilai ?? 0);

      const { data: pembayaran } = await db
        .from("pembayaran_hutang")
        .select("total")
        .eq("id_hutang", item.id_hutang);

      const totalBayar: number = (pembayaran ?? []).reduce(
        (sum, p) => sum + Number(p.total ?? 0),
        0,
      );

      let status: "UNPAID" | "PARTIAL" | "PAID";

      if (totalBayar >= nilaiHutang && nilaiHutang > 0) status = "PAID";
      else if (totalBayar > 0) status = "PARTIAL";
      else status = "UNPAID";

      let keterangan: string;

      if (status === "PAID") keterangan = "Pembayaran Lunas";
      else if (status === "PARTIAL") keterangan = "Pembayaran Sebagian";
      else keterangan = "Belum Dibayar";

      return {
        ...item,
        status,
        keterangan,
      };
    }),
  );

  return NextResponse.json(result);
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = pembayaranHutangSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pembayaran hutang tidak valid" },
        { status: 400 },
      );
    }

    const input: PembayaranHutangInput = parsed.data;
    /* =========================
       HITUNG PAJAK
    ========================= */

    const nominal: number = input.nominal;

    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;

    const totalHutang: number = nominal + ppn;
    const totalBayar: number = totalHutang - pph23;

    /* =========================
       ANTI MINUS
    ========================= */

    if (totalBayar <= 0) {
      return NextResponse.json(
        { error: "Total pembayaran tidak valid" },
        { status: 400 },
      );
    }

    const { data: hutangCheck } = await db
      .from("hutang")
      .select("id_hutang")
      .eq("id_hutang", input.id_hutang)
      .single();

    if (!hutangCheck) {
      return NextResponse.json(
        { error: "Hutang tidak ditemukan" },
        { status: 400 },
      );
    }
    /* =========================
       INSERT
    ========================= */
    const { data, error } = await db
      .from("pembayaran_hutang")
      .insert({
        tanggal: input.tanggal,
        id_hutang: input.id_hutang,
        nominal,
        ppn,
        pph23,
        total: totalBayar,
        keterangan: input.keterangan,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyimpan pembayaran hutang");
    }

    /* =========================
       JURNAL
    ========================= */

    const jurnalId: number = await postPembayaranHutang(
      input.tanggal,
      `BYR-${data.id}`,
      input.keterangan,
      nominal,
      ppn,
      pph23,
    );

    await db
      .from("pembayaran_hutang")
      .update({ id_jurnal: jurnalId })
      .eq("id", data.id);

    return NextResponse.json({
      message: "Pembayaran hutang berhasil",
      data,
    });
  } catch (error: unknown) {
    console.error("PEMBAYARAN HUTANG ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
