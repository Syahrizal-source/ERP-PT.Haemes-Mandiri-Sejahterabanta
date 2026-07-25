import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { blockUpdateSchema } from "@/lib/validators/block";
import { ZodError, z } from "zod";

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const parsedParam = paramSchema.parse(params);

    const body: unknown = await request.json();
    const parsedBody = blockUpdateSchema.parse(body);

    const { data, error } = await db
      .from("blocks")
      .update({
        division_id: parsedBody.division_id,
        code: parsedBody.code,
        planting_year: parsedBody.planting_year,
        area_ha: parsedBody.area_ha,
        palm_population: parsedBody.palm_population,
        status: parsedBody.status,
        seed_type: parsedBody.seed_type,
        id_cost_center: parsedBody.id_cost_center,
        is_active: parsedBody.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsedParam.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const parsedParam = paramSchema.parse(params);

  const { error } = await db.from("blocks").delete().eq("id", parsedParam.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Block berhasil dihapus" },
    { status: 200 },
  );
}
