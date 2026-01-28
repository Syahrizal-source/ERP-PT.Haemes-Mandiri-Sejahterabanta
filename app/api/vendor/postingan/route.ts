import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_vendor: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_vendor: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_vendor, id_periode, id_akun_vendor } = parsed.data;

  const { data: vendor } = await db
    .from("vendor")
    .select("id_vendor,nama")
    .eq("id_vendor", id_vendor)
    .single();

  if (!vendor) {
    return NextResponse.json(
      { error: "Vendor tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data: periode } = await db
    .from("periode")
    .select("status")
    .eq("id_periode", id_periode)
    .single();

  if (!periode || periode.status === "CLOSED") {
    return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
  }

  const { data: header } = await db
    .from("jurnal")
    .insert({
      tanggal: new Date().toISOString().slice(0, 10),
      no_bukti: `VENDOR-${vendor.id_vendor}`,
      keterangan: `Registrasi Vendor ${vendor.nama}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (!header) {
    return NextResponse.json(
      { error: "Gagal buat jurnal vendor" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id_jurnal: header.id_jurnal });
}
