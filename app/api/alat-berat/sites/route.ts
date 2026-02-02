import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { siteCreateSchema } from "@/lib/zod/site.schema";

export async function GET() {
  const { data, error } = await db.from("sites").select("*").order("site_name");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = siteCreateSchema.parse(body);

    const { data, error } = await db
      .from("sites")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
