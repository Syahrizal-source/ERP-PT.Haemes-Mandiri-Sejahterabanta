import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";
import { equipmentFuelUpdateSchema } from "@/lib/validators/alat-berat/equipment-fuel";

const paramSchema = z.object({
  id: z.string().uuid("ID fuel tidak valid"),
});

type Context = {
  params: Promise<{ id: string }>;
};

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

  const { data, error } = await db
    .from("equipment_fuel")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

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

  const parsedBody = equipmentFuelUpdateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: "Data fuel tidak valid" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("equipment_fuel")
    .update(parsedBody.data)
    .eq("id", parsedParams.data.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

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

  const { error } = await db
    .from("equipment_fuel")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Fuel berhasil dihapus" },
    { status: 200 },
  );
}
