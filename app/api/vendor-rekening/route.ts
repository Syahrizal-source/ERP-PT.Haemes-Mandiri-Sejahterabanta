import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  vendorRekeningSchema,
  VendorRekeningInput,
} from "@/lib/validators/vendorRekening";

type VendorRekeningRow = {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
};

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const vendorIdParam = searchParams.get("vendor_id");

  if (vendorIdParam === null) {
    return NextResponse.json(
      { error: "vendor_id wajib diisi" },
      { status: 400 },
    );
  }

  const vendorId = Number(vendorIdParam);

  if (!Number.isInteger(vendorId)) {
    return NextResponse.json(
      { error: "vendor_id tidak valid" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("vendor_rekening")
    .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
    .eq("vendor_id", vendorId)
    .order("id");

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: "Gagal mengambil rekening vendor" },
      { status: 500 },
    );
  }

  const result: VendorRekeningRow[] = data.map((row) => ({
    id: row.id as number,
    vendor_id: row.vendor_id as number,
    nama_bank: row.nama_bank as string,
    nomor_rekening: row.nomor_rekening as string,
    nama_rekening: row.nama_rekening as string,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = vendorRekeningSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const payload: VendorRekeningInput = parsed.data;

  const { data, error } = await db
    .from("vendor_rekening")
    .insert(payload)
    .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal membuat rekening vendor" },
      { status: 500 },
    );
  }

  const result: VendorRekeningRow = {
    id: data.id as number,
    vendor_id: data.vendor_id as number,
    nama_bank: data.nama_bank as string,
    nomor_rekening: data.nomor_rekening as string,
    nama_rekening: data.nama_rekening as string,
  };

  return NextResponse.json(result, { status: 201 });
}
