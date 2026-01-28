import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonPribadiSchema } from "@/lib/validators/kasbon";
import { recalculateKasbonPribadiSaldo } from "@/lib/kasbon/recalculate-saldo";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;

  const body: unknown = await req.json();
  const parsed = kasbonPribadiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { error } = await db
    .from("kasbon_pribadi")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // 🔁 Recalculate saldo aman
  try {
    await recalculateKasbonPribadiSaldo();
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      {
        message: "Update sukses, tapi gagal hitung ulang saldo",
        detail: err.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "OK" });
}
