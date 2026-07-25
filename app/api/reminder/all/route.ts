import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type ReminderItem = {
  id: number;
  no: string;
  nama: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  sumber: "INVOICE" | "HUTANG";
};

export async function GET(): Promise<NextResponse> {
  try {
    /* =========================
       INVOICE
    ========================= */
    const { data: invoice } = await db.from("invoice").select("*");

    /* =========================
       HUTANG
    ========================= */
    const { data: hutang } = await db.from("hutang").select("*");

    const inv: ReminderItem[] = (invoice ?? [])
      .filter((i) =>
        String(i.status ?? "")
          .toLowerCase()
          .includes("unpaid"),
      )
      .map((i) => ({
        id: Number(i.id),
        no: String(i.no_invoice),
        nama: String(i.customer ?? "-"),
        nominal: Number(i.nominal ?? 0),
        tanggal_jatuh_tempo: String(i.tanggal_jatuh_tempo ?? i.tanggal),
        sumber: "INVOICE",
      }));

    const hut: ReminderItem[] = (hutang ?? [])
      .filter((h) =>
        String(h.status ?? "")
          .toLowerCase()
          .includes("unpaid"),
      )
      .map((h) => ({
        id: Number(h.id_hutang),
        no: String(h.no_invoice),
        nama: String(h.supplier ?? "-"),
        nominal: Number(h.nilai ?? 0),
        tanggal_jatuh_tempo: String(h.tanggal_jatuh_tempo ?? h.tanggal),
        sumber: "HUTANG",
      }));

    const merged: ReminderItem[] = [...inv, ...hut].sort((a, b) => {
      return (
        new Date(a.tanggal_jatuh_tempo).getTime() -
        new Date(b.tanggal_jatuh_tempo).getTime()
      );
    });

    return NextResponse.json(merged);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
