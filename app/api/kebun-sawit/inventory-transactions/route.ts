import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  inventoryTransactionSchema,
  InventoryTransactionInput,
} from "@/lib/validators/inventory-transaction";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";
import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";

/* =========================
   GET LIST
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("inventory_transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return NextResponse.json(data);
}

/* =========================
   CREATE TRANSACTION
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();

  const payload: InventoryTransactionInput =
    inventoryTransactionSchema.parse(body);

  const quantity = Number(payload.quantity);
  const unitPrice = Number(payload.unit_price);

  const subtotal = quantity * unitPrice;

  const ppn = Number(payload.ppn ?? 0);
  const pph23 = Number(payload.pph23 ?? 0);
  const pph4 = Number(payload.pph4 ?? 0);

  const ppnAmount = subtotal * (ppn / 100);
  const pph23Amount = subtotal * (pph23 / 100);
  const pph4Amount = subtotal * (pph4 / 100);

  const totalAmount = subtotal + ppnAmount - pph23Amount - pph4Amount;

  const { data: inserted, error } = await db
    .from("inventory_transactions")
    .insert({
      item_id: payload.item_id,
      block_id: payload.block_id ?? null,
      transaction_date: payload.transaction_date,
      transaction_type: payload.transaction_type,
      quantity,
      unit_price: unitPrice,
      subtotal,
      total_amount: totalAmount,
      ppn,
      pph23,
      pph4,
      reference_module: payload.reference_module ?? null,
      notes: payload.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error("Gagal menyimpan transaksi inventory");
  }

  /* =========================
     POST JURNAL
  ========================= */

  if (payload.block_id) {
    const { data: block } = await db
      .from("blocks")
      .select("region_id,id_cost_center")
      .eq("id", payload.block_id)
      .single();

    if (block) {
      const mapping = await getCoaMappingTransaction(
        "MAINTENANCE",
        block.region_id,
      );

      const lines: JurnalLine[] = mapping.map((m) => ({
        id_coa: m.id_coa,
        debit: m.posisi === "DEBIT" ? totalAmount : 0,
        kredit: m.posisi === "KREDIT" ? totalAmount : 0,
        id_cost_center: block.id_cost_center,
      }));

      await postJournal({
        tanggal: payload.transaction_date,
        no_bukti: `INV-${inserted.id}`,
        keterangan: payload.notes ?? "Inventory Transaction",
        sumber: "KEBUN",
        modul: "INVENTORY_TRANSACTION",
        ref_id: inserted.id,
        lines,
      });
    }
  }

  return NextResponse.json(
    {
      message: "Inventory transaction berhasil",
      id: inserted.id,
    },
    { status: 201 },
  );
}
