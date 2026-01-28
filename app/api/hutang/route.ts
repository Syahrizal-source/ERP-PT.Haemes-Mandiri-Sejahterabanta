import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hutangSchema } from "@/lib/validators/hutang";

type HutangRow = {
  id_hutang: number;
  supplier: string;
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
    .from("hutang")
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data hutang" },
      { status: 500 },
    );
  }

  const result: HutangRow[] = data.map((r) => ({
    id_hutang: r.id_hutang as number,
    supplier: r.supplier as string,
    no_invoice: r.no_invoice as string,
    tanggal: r.tanggal as string,
    jatuh_tempo: r.jatuh_tempo as string,
    nilai: Number(r.nilai),
    status: r.status as HutangRow["status"],
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = hutangSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("hutang")
    .insert(parsed.data)
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert hutang" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
