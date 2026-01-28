import { NextRequest, NextResponse } from "next/server";
import { PostingSchema } from "./schema";
import { postingEngine } from "@/lib/egine/postingEngine";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const input = PostingSchema.parse(raw);

    const idJurnal = await postingEngine(input);

    return NextResponse.json(
      {
        success: true,
        id_jurnal: idJurnal,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Posting gagal",
      },
      { status: 400 },
    );
  }
}
