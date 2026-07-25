import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  vendorUpdateSchema,
  VendorUpdateInput,
} from "@/lib/validators/vendors";

type Params = {
  id: string;
};

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const resolvedParams = await params;

  const vendorId = Number(resolvedParams.id);

  if (!Number.isInteger(vendorId)) {
    return NextResponse.json(
      { error: "ID vendor tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();

  const parsed = vendorUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const payload: VendorUpdateInput = parsed.data;

  const { data, error } = await db
    .from("vendors")
    .update(payload)
    .eq("id", vendorId)
    .select(
      "id,kode_vendor,nama_vendor,kategori_vendor,npwp,nama_npwp,alamat_npwp,telepon,email,alamat,status",
    )
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update vendor" },
      { status: 500 },
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

  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const resolvedParams = await params;

  const vendorId = Number(resolvedParams.id);

  if (!Number.isInteger(vendorId)) {
    return NextResponse.json(
      { error: "ID vendor tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db.from("vendors").delete().eq("id", vendorId);

  if (error !== null) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
