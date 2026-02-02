import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Params = {
  params: { id: string };
};

export async function DELETE(_: Request, { params }: Params) {
  return NextResponse.json(
    { message: "Part transaction tidak boleh dihapus" },
    { status: 405 },
  );
}
