import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { piutangSchema } from "@/lib/validators/piutang";

type PiutangRow = {
  id_piutang: number;
  customer: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("piutang")
    .select("id_piutang,customer,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data piutang" },
      { status: 500 },
    );
  }

  const result: PiutangRow[] = data.map((r) => ({
    id_piutang: r.id_piutang as number,
    customer: r.customer as string,
    no_invoice: r.no_invoice as string,
    tanggal: r.tanggal as string,
    jatuh_tempo: r.jatuh_tempo as string,
    nilai: Number(r.nilai),
    status: r.status as PiutangRow["status"],
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = piutangSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("piutang")
    .insert(parsed.data)
    .select("id_piutang,customer,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert piutang" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
