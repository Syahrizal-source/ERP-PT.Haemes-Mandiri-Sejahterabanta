import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  vendorPajakUpdateSchema,
  VendorPajakUpdateInput,
} from "@/lib/validators/vendorPajak";

type Params = {
  id: string;
};

type VendorPajakRow = {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
};

export async function PUT(
  req: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const pajakId = Number(params.id);

  if (!Number.isInteger(pajakId)) {
    return NextResponse.json(
      { error: "ID pajak vendor tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();

  const parsed = vendorPajakUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const payload: VendorPajakUpdateInput = parsed.data;

  const { data, error } = await db
    .from("vendor_pajak")
    .update(payload)
    .eq("id", pajakId)
    .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
    .single();

  if (error !== null || data === null) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update pajak vendor" },
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

  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const pajakId = Number(params.id);

  if (!Number.isInteger(pajakId)) {
    return NextResponse.json(
      { error: "ID pajak vendor tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db.from("vendor_pajak").delete().eq("id", pajakId);

  if (error !== null) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
