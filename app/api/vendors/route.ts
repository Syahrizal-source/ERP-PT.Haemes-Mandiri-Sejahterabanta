import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { vendorSchema, VendorInput } from "@/lib/validators/vendors";

type VendorRow = {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("vendors")
    .select(
      "id,kode_vendor,nama_vendor,kategori_vendor,npwp,nama_npwp,alamat_npwp,telepon,email,alamat,status"
    )
    .order("nama_vendor");

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: "Gagal mengambil data vendor" },
      { status: 500 }
    );
  }

  const result: VendorRow[] = data.map((row) => ({
    id: row.id as number,
    kode_vendor: row.kode_vendor ?? null,
    nama_vendor: row.nama_vendor as string,
    kategori_vendor: row.kategori_vendor ?? null,
    npwp: row.npwp ?? null,
    nama_npwp: row.nama_npwp ?? null,
    alamat_npwp: row.alamat_npwp ?? null,
    telepon: row.telepon ?? null,
    email: row.email ?? null,
    alamat: row.alamat ?? null,
    status: row.status as boolean,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = vendorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const payload: VendorInput = parsed.data;

  const { data, error } = await db
    .from("vendors")
    .insert(payload)
    .select(
      "id,kode_vendor,nama_vendor,kategori_vendor,npwp,nama_npwp,alamat_npwp,telepon,email,alamat,status"
    )
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert vendor" },
      { status: 500 }
    );
  }

  const result: VendorRow = {
    id: data.id as number,
    kode_vendor: data.kode_vendor ?? null,
    nama_vendor: data.nama_vendor as string,
    kategori_vendor: data.kategori_vendor ?? null,
    npwp: data.npwp ?? null,
    nama_npwp: data.nama_npwp ?? null,
    alamat_npwp: data.alamat_npwp ?? null,
    telepon: data.telepon ?? null,
    email: data.email ?? null,
    alamat: data.alamat ?? null,
    status: data.status as boolean,
  };

  return NextResponse.json(result, { status: 201 });
}