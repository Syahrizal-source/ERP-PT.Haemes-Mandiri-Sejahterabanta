import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { safetyIncidentUpdateSchema } from "@/lib/zod/safetyIncident.schema";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: Request, context: Context) {
  try {
    const { id } = await context.params;

    const body: unknown = await req.json();
    const payload = safetyIncidentUpdateSchema.parse(body);

    const { data, error } = await db
      .from("safety_incidents")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Safety incident not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Context) {
  const { id } = await context.params;

  const { error } = await db.from("safety_incidents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Safety incident deleted" },
    { status: 200 },
  );
}
