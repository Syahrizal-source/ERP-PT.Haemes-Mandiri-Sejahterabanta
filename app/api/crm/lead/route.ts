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

type CreateLeadBody = {
  id_customer?: string;
  sumber?: string;
  status?: string;
  minat?: string;
  budget?: number;
  timeline?: string;
};

/* =========================
   GET ALL
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("crm_lead")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as Lead[]);
}

/* =========================
   CREATE
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: CreateLeadBody = await req.json();

  const { data, error } = await db
    .from("crm_lead")
    .insert({
      id_customer: body.id_customer ?? null,
      sumber: body.sumber ?? null,
      status: body.status ?? "NEW",
      minat: body.minat ?? null,
      budget: body.budget ?? null,
      timeline: body.timeline ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Lead);
}
