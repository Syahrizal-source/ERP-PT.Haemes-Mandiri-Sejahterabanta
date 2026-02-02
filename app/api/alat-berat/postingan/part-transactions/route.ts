import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

const partCreateSchema = z.object({
  part_id: z.string().uuid(),
  wo_id: z.string().uuid(),
  transaction_type: z.enum(["ISSUE", "RECEIVE"]),
  qty: z.coerce.number().positive(),
  transaction_date: z.string(),
  ppn: z.boolean().optional().default(false),
  pph21: z.boolean().optional().default(false),
  pph23: z.boolean().optional().default(false),
  pph4: z.boolean().optional().default(false),
});

type PartPayload = z.infer<typeof partCreateSchema>;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload: PartPayload = partCreateSchema.parse(body);

    const { data, error } = await db
      .from("part_transactions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Trigger database akan otomatis:
    // - Update stok
    // - Posting jurnal jika ISSUE

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
