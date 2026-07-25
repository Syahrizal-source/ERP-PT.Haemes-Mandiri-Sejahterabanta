import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */
type Activity = {
  id: string;
  id_lead: string | null;
  id_customer: string | null;
  catatan: string | null;
  tanggal: string | null;
  follow_up_date: string | null;
  tipe: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
};

type UpdateActivityBody = {
  id_lead?: string;
  id_customer?: string;
  catatan?: string;
  tanggal?: string;
  follow_up_date?: string;
  tipe?: string;
  status?: string;
  assigned_to?: string;
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
    .from("crm_activity")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data as Activity);
}

/* =========================
   UPDATE
========================= */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: UpdateActivityBody = await req.json();

  const { data, error } = await db
    .from("crm_activity")
    .update({
      id_lead: body.id_lead ?? null,
      id_customer: body.id_customer ?? null,
      catatan: body.catatan ?? null,
      tanggal: body.tanggal ?? null,
      follow_up_date: body.follow_up_date ?? null,
      tipe: body.tipe ?? null,
      status: body.status ?? "OPEN",
      assigned_to: body.assigned_to ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Activity);
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await db.from("crm_activity").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
