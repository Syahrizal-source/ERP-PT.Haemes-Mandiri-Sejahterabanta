import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  vendorPajakSchema,
  VendorPajakInput,
} from "@/lib/validators/vendorPajak";

type VendorPajakRow = {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
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
    .from("vendor_pajak")
    .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
    .eq("vendor_id", vendorId)
    .order("id");

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: "Gagal mengambil data pajak vendor" },
      { status: 500 },
    );
  }

  const result: VendorPajakRow[] = data.map((row) => ({
    id: row.id as number,
    vendor_id: row.vendor_id as number,
    npwp: row.npwp ?? null,
    nama_npwp: row.nama_npwp ?? null,
    alamat_npwp: row.alamat_npwp ?? null,
    pkp: row.pkp as boolean,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = vendorPajakSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const payload: VendorPajakInput = parsed.data;

  const { data, error } = await db
    .from("vendor_pajak")
    .insert(payload)
    .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal membuat pajak vendor" },
      { status: 500 },
    );
  }

  const result: VendorPajakRow = {
    id: data.id as number,
    vendor_id: data.vendor_id as number,
    npwp: data.npwp ?? null,
    nama_npwp: data.nama_npwp ?? null,
    alamat_npwp: data.alamat_npwp ?? null,
    pkp: data.pkp as boolean,
  };

  return NextResponse.json(result, { status: 201 });
}
