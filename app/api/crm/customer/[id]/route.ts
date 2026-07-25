import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Customer = {
  id: string;
  nama: string;
  perusahaan: string | null;
  email: string | null;
  telp: string | null;
  alamat: string | null;
  industri: string | null;
  created_at: string;
};

type UpdateCustomerBody = {
  nama: string;
  perusahaan?: string;
  email?: string;
  telp?: string;
  alamat?: string;
  industri?: string;
};

/* =========================
   GET BY ID
========================= */
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { data, error } = await db
    .from("crm_customer")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data as Customer);
}

/* =========================
   UPDATE
========================= */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: UpdateCustomerBody = await req.json();

  if (!body.nama || body.nama.trim() === "") {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  const { data, error } = await db
    .from("crm_customer")
    .update({
      nama: body.nama,
      perusahaan: body.perusahaan ?? null,
      email: body.email ?? null,
      telp: body.telp ?? null,
      alamat: body.alamat ?? null,
      industri: body.industri ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Customer);
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await db.from("crm_customer").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
