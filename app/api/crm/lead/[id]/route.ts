import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Lead = {
  id: string;
  id_customer: string | null;
  sumber: string | null;
  status: string;
  minat: string | null;
  budget: number | null;
  timeline: string | null;
  created_at: string;
};

type UpdateLeadBody = {
  id_customer?: string;
  sumber?: string;
  status?: string;
  minat?: string;
  budget?: number;
  timeline?: string;
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
    .from("crm_lead")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data as Lead);
}

/* =========================
   UPDATE
========================= */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: UpdateLeadBody = await req.json();

  const { data, error } = await db
    .from("crm_lead")
    .update({
      id_customer: body.id_customer ?? null,
      sumber: body.sumber ?? null,
      status: body.status ?? "NEW",
      minat: body.minat ?? null,
      budget: body.budget ?? null,
      timeline: body.timeline ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Lead);
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await db.from("crm_lead").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
