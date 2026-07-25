import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Deal = {
  id: string;
  id_customer: string | null;
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas: number | null;
  closing_date: string | null;
  created_at: string;
};

type UpdateDealBody = {
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas?: number;
  closing_date?: string;
};

/* =========================
   GET
========================= */
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { data, error } = await db
    .from("crm_deal")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data as Deal);
}

/* =========================
   UPDATE
========================= */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: UpdateDealBody = await req.json();

  const { data, error } = await db
    .from("crm_deal")
    .update({
      nama_deal: body.nama_deal,
      nilai: body.nilai,
      tahap: body.tahap,
      probabilitas: body.probabilitas ?? null,
      closing_date: body.closing_date ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Deal);
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await db.from("crm_deal").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
