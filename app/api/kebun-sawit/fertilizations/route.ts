import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const fertilizationSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),
  item_id: z.string().uuid("Item ID tidak valid").nullable().optional(),
  vendor_name: z.string().max(100).optional(),
  fertilization_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    }),
  dose_per_ha: z.coerce
    .number()
    .min(0, "Dosis per ha tidak boleh minus")
    .optional(),
  total_used: z.coerce.number().min(0, "Total pupuk tidak boleh minus"),
  labor_cost: z.coerce.number().min(0, "Biaya tenaga kerja tidak boleh minus"),
  unit_price: z.coerce.number().min(0, "Harga tidak boleh minus").optional(),
  ppn_rate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

type FertilizationInput = z.infer<typeof fertilizationSchema>;

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("fertilizations")
    .select("*")
    .order("fertilization_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = fertilizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: FertilizationInput = parsed.data;

    const unitPrice: number = input.unit_price ?? 0;
    const subtotalMaterial: number = input.total_used * unitPrice;
    const ppnRate: number = input.ppn_rate ?? 0;
    const ppnAmount: number = (subtotalMaterial * ppnRate) / 100;
    const totalCost: number = subtotalMaterial + ppnAmount + input.labor_cost;

    if (ppnAmount < 0 || totalCost < 0) {
      return NextResponse.json(
        { message: "Perhitungan tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("fertilizations")
      .insert({
        block_id: input.block_id,
        item_id: input.item_id ?? null,
        vendor_name: input.vendor_name ?? null,
        fertilization_date: input.fertilization_date,
        dose_per_ha: input.dose_per_ha ?? null,
        total_used: input.total_used,
        labor_cost: input.labor_cost,
        unit_price: unitPrice,
        subtotal_material: subtotalMaterial,
        ppn_rate: ppnRate,
        ppn_amount: ppnAmount,
        total_cost: totalCost,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
