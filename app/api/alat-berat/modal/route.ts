import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

const modalAlatSchema = z.object({
  equipment_id: z.string().uuid(),
  capital_date: z.string(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

type ModalAlatPayload = z.infer<typeof modalAlatSchema>;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload: ModalAlatPayload = modalAlatSchema.parse(body);

    const { data, error } = await db
      .from("equipment_capital")
      .insert({
        equipment_id: payload.equipment_id,
        capital_date: payload.capital_date,
        amount: payload.amount,
        description: payload.description ?? null,
      })
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
