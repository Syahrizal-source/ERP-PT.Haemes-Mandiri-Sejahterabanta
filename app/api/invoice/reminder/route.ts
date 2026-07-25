import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type InvoiceReminder = {
  id: number;
  no_invoice: string;
  customer: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  status: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("invoice")
      .select(
        "id,no_invoice,customer,nominal,tanggal,tanggal_jatuh_tempo,status",
      )
      .ilike("status", "%unpaid%") // 🔥 fleksibel
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: InvoiceReminder[] = (data ?? []).map((item) => {
      // 🔥 fallback jika null
      const jatuhTempo: string = item.tanggal_jatuh_tempo ?? item.tanggal;

      return {
        id: Number(item.id),
        no_invoice: String(item.no_invoice),
        customer: String(item.customer ?? "-"),
        nominal: Number(item.nominal ?? 0),
        tanggal_jatuh_tempo: String(jatuhTempo),
        status: String(item.status),
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
