import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { HarvestSchema } from "@/lib/validators/harvest";

const paramSchema = z.object({
  id: z.string().uuid("ID harvest tidak valid"),
});

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET DETAIL HARVEST
========================= */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const { id } = parsed.data;

  const { data, error } = await db
    .from("harvests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   UPDATE HARVEST
========================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();

  const parsedBody = HarvestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: "Data harvest tidak valid" },
      { status: 400 },
    );
  }

  const { id } = parsedParams.data;

  const { data, error } = await db
    .from("harvests")
    .update({
      block_id: parsedBody.data.block_id,
      harvest_date: parsedBody.data.harvest_date,
      total_bunches: parsedBody.data.total_bunches,
      total_weight_kg: parsedBody.data.total_weight_kg,
      total_loose_fruit_kg: parsedBody.data.total_loose_fruit_kg,
      notes: parsedBody.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   DELETE HARVEST
========================= */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const { id } = parsed.data;

  const { error } = await db.from("harvests").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Harvest berhasil dihapus" },
    { status: 200 },
  );
}
