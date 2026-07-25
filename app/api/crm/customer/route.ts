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

type CreateCustomerBody = {
  nama: string;
  perusahaan?: string;
  email?: string;
  telp?: string;
  alamat?: string;
  industri?: string;
};

/* =========================
   GET ALL
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("crm_customer")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as Customer[]);
}

/* =========================
   CREATE
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: CreateCustomerBody = await req.json();

  if (!body.nama || body.nama.trim() === "") {
    return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  const { data, error } = await db
    .from("crm_customer")
    .insert({
      nama: body.nama,
      perusahaan: body.perusahaan ?? null,
      email: body.email ?? null,
      telp: body.telp ?? null,
      alamat: body.alamat ?? null,
      industri: body.industri ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as Customer);
}
