import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { armadaSchema } from "@/lib/validators/armada";
import { postArmadaToJurnal } from "@/lib/jurnal/posting-armada";
import { postArmadaToCashFlow } from "@/lib/cash-flow/post-armada";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("armada")
    .select("*")
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();
  const parsed = armadaSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.format(), { status: 400 });

  const payload = { ...parsed.data, "m³": parsed.data.m3 };
  delete (payload as { m3?: number }).m3;

  const { data, error } = await db
    .from("armada")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert armada gagal" },
      { status: 500 },
    );
  }

  await postArmadaToJurnal(data.id);
  await postArmadaToCashFlow(data.id);

  return NextResponse.json({ success: true, id: data.id });
}
