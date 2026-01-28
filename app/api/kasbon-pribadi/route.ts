import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonPribadiSchema } from "@/lib/validators/kasbon";

type KasbonPribadiRow = {
  id: string;
  tanggal: string;
  deskripsi: string;
  no_voucher: string;
  debit: number;
  kredit: number;
  saldo: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_pribadi")
    .select("*")
    .order("tanggal", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = kasbonPribadiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, deskripsi, no_voucher, debit, kredit } = parsed.data;

  const { data: lastRow } = await db
    .from("kasbon_pribadi")
    .select("saldo")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const saldoSebelumnya: number = lastRow?.saldo ?? 0;
  const saldoBaru: number = saldoSebelumnya + debit - kredit;

  const { error } = await db.from("kasbon_pribadi").insert({
    tanggal,
    deskripsi,
    no_voucher,
    debit,
    kredit,
    saldo: saldoBaru,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" }, { status: 201 });
}
