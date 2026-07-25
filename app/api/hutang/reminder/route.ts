import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type HutangReminder = {
  id: number;
  no_invoice: string;
  supplier: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db.from("hutang").select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: HutangReminder[] = (data ?? [])
      .filter((item) =>
        String(item.status ?? "")
          .toLowerCase()
          .includes("unpaid"),
      )
      .map((item) => {
        // 🔥 FIX UTAMA: gunakan id_hutang
        const idValue: number = Number(item.id_hutang ?? 0);

        const tanggal: string =
          item.tanggal_jatuh_tempo ?? item.tanggal ?? new Date().toISOString();

        return {
          id: idValue,
          no_invoice: String(item.no_invoice ?? "-"),
          supplier: String(item.supplier ?? "-"),
          nominal: Number(item.nilai ?? 0),
          tanggal_jatuh_tempo: String(tanggal),
        };
      })
      .filter((item) => item.id > 0); // 🔥 buang yg invalid

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
