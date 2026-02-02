import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const schema = z.object({
  item_id: z.string().uuid("Item ID tidak valid"),

  block_id: z.string().uuid("Block ID tidak valid").optional(),

  transaction_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    }),

  transaction_type: z.enum(["IN", "OUT"]),

  quantity: z.coerce.number().min(0.0001, "Quantity harus lebih dari 0"),

  unit_price: z.coerce.number().min(0, "Harga tidak boleh minus"),

  /* Pajak opsional */
  ppn_rate: z.coerce.number().min(0).max(100).optional(),

  pph23_rate: z.coerce.number().min(0).max(100).optional(),

  pph4_rate: z.coerce.number().min(0).max(100).optional(),
});

type Input = z.infer<typeof schema>;

/* =========================
   GET ALL
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("inventory_transactions")
    .select(
      `
      id,
      item_id,
      block_id,
      transaction_date,
      transaction_type,
      quantity,
      unit_price,
      subtotal,
      reference_module,
      notes,
      created_at
    `,
    )
    .order("transaction_date", { ascending: false });

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

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: Input = parsed.data;

    /* =========================
       HITUNG SUBTOTAL
    ========================= */

    const subtotal: number = input.quantity * input.unit_price;

    if (subtotal < 0) {
      return NextResponse.json(
        { message: "Perhitungan subtotal tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT INVENTORY
    ========================= */

    const { data, error } = await db
      .from("inventory_transactions")
      .insert({
        item_id: input.item_id,
        block_id: input.block_id ?? null,
        transaction_date: input.transaction_date,
        transaction_type: input.transaction_type,
        quantity: input.quantity,
        unit_price: input.unit_price,
        subtotal,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    /* =========================
       HANDLE PPN (Optional)
    ========================= */

    if (input.ppn_rate !== undefined && input.ppn_rate > 0) {
      const ppnAmount: number = (subtotal * input.ppn_rate) / 100;

      await db.from("ppn").insert({
        id_transaksi: data.id,
        jenis_ppn: "masukan",
        nilai_dasar: subtotal,
        tarif_ppn: input.ppn_rate,
        nilai_ppn: ppnAmount,
        tanggal_transaksi: input.transaction_date,
      });
    }

    /* =========================
       HANDLE PPh23 (Optional)
    ========================= */

    if (input.pph23_rate !== undefined && input.pph23_rate > 0) {
      const pphAmount: number = (subtotal * input.pph23_rate) / 100;

      await db.from("pph23").insert({
        id_vendor: 1, // sementara static
        jenis_jasa: "Pembelian Material",
        nilai_transaksi: subtotal,
        tarif_pph23: input.pph23_rate,
        pph23_terutang: pphAmount,
        tanggal_transaksi: input.transaction_date,
      });
    }

    /* =========================
       HANDLE PPh4 (Optional)
    ========================= */

    if (input.pph4_rate !== undefined && input.pph4_rate > 0) {
      const pph4Amount: number = (subtotal * input.pph4_rate) / 100;

      await db.from("pph4").insert({
        id_vendor: 1,
        jenis_objek: "Pembelian Material",
        nilai_transaksi: subtotal,
        tarif_pph4: input.pph4_rate,
        pph4_terutang: pph4Amount,
        tanggal_transaksi: input.transaction_date,
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
