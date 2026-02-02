import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { workOrderUpdateSchema } from "@/lib/zod/workOrder.schema";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: Request, context: Context) {
  try {
    const { id } = await context.params;

    const body: unknown = await req.json();
    const payload = workOrderUpdateSchema.parse(body);

    const { data, error } = await db
      .from("work_orders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Work order not found" },
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

export async function DELETE() {
  return NextResponse.json(
    {
      message:
        "Work orders cannot be deleted. Change status instead (e.g., CANCELLED).",
    },
    { status: 405 },
  );
}
