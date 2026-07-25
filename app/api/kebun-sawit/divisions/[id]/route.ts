import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { divisionUpdateSchema } from "@/lib/validators/divisions";
import { ZodError, z } from "zod";

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const parsedParam = paramSchema.parse(params);

    const body: unknown = await request.json();
    const parsedBody = divisionUpdateSchema.parse(body);

    const { data, error } = await db
      .from("divisions")
      .update({
        estate_id: parsedBody.estate_id,
        code: parsedBody.code,
        name: parsedBody.name,
        area_ha: parsedBody.area_ha,
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

/* =====================
   DELETE DIVISION
===================== */
export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db
    .from("divisions")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Division berhasil dihapus",
  });
}
