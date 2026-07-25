import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  vendorRekeningUpdateSchema,
  VendorRekeningUpdateInput,
} from "@/lib/validators/vendorRekening";

type Params = {
  id: string;
};

type VendorRekeningRow = {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
};

export async function PUT(
  req: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const rekeningId = Number(params.id);

  if (!Number.isInteger(rekeningId)) {
    return NextResponse.json(
      { error: "ID rekening tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();

  const parsed = vendorRekeningUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const payload: VendorRekeningUpdateInput = parsed.data;

  const { data, error } = await db
    .from("vendor_rekening")
    .update(payload)
    .eq("id", rekeningId)
    .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update rekening vendor" },
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

  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const rekeningId = Number(params.id);

  if (!Number.isInteger(rekeningId)) {
    return NextResponse.json(
      { error: "ID rekening tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db
    .from("vendor_rekening")
    .delete()
    .eq("id", rekeningId);

  if (error !== null) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
