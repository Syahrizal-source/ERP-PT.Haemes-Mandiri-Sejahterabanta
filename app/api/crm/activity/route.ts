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

type CreateActivityBody = {
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
   GET ALL
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("crm_activity")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as Activity[]);
}

/* =========================
   CREATE
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();

  const { data, error } = await db
    .from("crm_activity")
    .insert({
      id_lead: body.id_lead && body.id_lead.trim() !== "" ? body.id_lead : null,

      id_customer:
        body.id_customer && body.id_customer.trim() !== ""
          ? body.id_customer
          : null,

      catatan: body.catatan ?? null,
      tanggal: body.tanggal ?? null,
      follow_up_date: body.follow_up_date ?? null,
      tipe: body.tipe ?? null,
      status: body.status ?? "OPEN",
      assigned_to: body.assigned_to ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
