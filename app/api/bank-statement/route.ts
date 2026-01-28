import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { bankStatementSchema } from "@/lib/validators/bank-statement";
import type { BankStatementInput } from "@/lib/validators/bank-statement";

type BankStatementRow = BankStatementInput & { id: number };

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("id,tanggal,keterangan,debit,kredit,saldo")
    .order("tanggal", { ascending: true });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal ambil bank statement" },
      { status: 500 },
    );
  }

  const rows: BankStatementRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    keterangan: r.keterangan as string,
    debit: Number(r.debit),
    kredit: Number(r.kredit),
    saldo: Number(r.saldo),
  }));

  return NextResponse.json(rows);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = bankStatementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("bank_statement")
    .insert(parsed.data)
    .select("id,tanggal,keterangan,debit,kredit,saldo")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert bank statement" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: data.id as number,
      tanggal: data.tanggal as string,
      keterangan: data.keterangan as string,
      debit: Number(data.debit),
      kredit: Number(data.kredit),
      saldo: Number(data.saldo),
    },
    { status: 201 },
  );
}
