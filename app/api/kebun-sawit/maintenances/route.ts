import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const maintenanceSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),

  maintenance_date: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine((value: string) => !isNaN(Date.parse(value)), {
      message: "Tanggal tidak valid",
    }),

  activity_type: z.enum([
    "SEMPROT_GULMA",
    "TEBAS",
    "PRUNING",
    "DONGKEL_ANAK_KAYU",
    "LAINNYA",
  ]),

  area_ha: z.coerce.number().min(0, "Luas tidak boleh minus"),

  labor_cost: z.coerce.number().min(0, "Biaya tenaga kerja tidak boleh minus"),

  vendor_cost: z.coerce
    .number()
    .min(0, "Biaya vendor tidak boleh minus")
    .optional(),

  pph23_rate: z.coerce
    .number()
    .min(0, "Tarif PPh23 tidak boleh minus")
    .max(100, "Tarif maksimal 100%")
    .optional(),

  notes: z.string().max(500).optional(),
});

type MaintenanceInput = z.infer<typeof maintenanceSchema>;

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("maintenances")
    .select("*")
    .order("maintenance_date", { ascending: false });

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

    const parsed = maintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: MaintenanceInput = parsed.data;

    const vendorCost: number = input.vendor_cost ?? 0;
    const pphRate: number = input.pph23_rate ?? 0;

    // Validasi logika pajak
    if (vendorCost === 0 && pphRate > 0) {
      return NextResponse.json(
        { message: "PPh23 tidak bisa dihitung tanpa biaya vendor" },
        { status: 400 },
      );
    }

    const pph23Amount: number = (vendorCost * pphRate) / 100;

    const totalCost: number = input.labor_cost + vendorCost - pph23Amount;

    if (totalCost < 0) {
      return NextResponse.json(
        { message: "Total biaya tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("maintenances")
      .insert({
        block_id: input.block_id,
        maintenance_date: input.maintenance_date,
        activity_type: input.activity_type,
        area_ha: input.area_ha,
        labor_cost: input.labor_cost,
        vendor_cost: vendorCost,
        pph23_rate: pphRate,
        pph23_amount: pph23Amount,
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
