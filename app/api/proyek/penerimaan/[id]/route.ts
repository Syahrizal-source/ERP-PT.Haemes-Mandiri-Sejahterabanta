import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  ProyekPenerimaanSchema,
  type ProyekPenerimaanInput,
} from "@/lib/validators/penerimaanproyek";

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   PUT UPDATE PENERIMAAN
========================= */

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const payload: ProyekPenerimaanInput = ProyekPenerimaanSchema.parse(
      await req.json(),
    );

    const { error } = await db
      .from("proyek_penerimaan")
      .update({
        id_tagihan: payload.id_tagihan,
        tanggal: payload.tanggal,
        jumlah: payload.jumlah,
        metode: payload.metode,
        bank: payload.bank,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Penerimaan berhasil diupdate",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengupdate penerimaan",
      },
      { status: 400 },
    );
  }
}

/* =========================
   DELETE PENERIMAAN
========================= */

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data: penerimaan, error: penerimaanError } = await db
      .from("proyek_penerimaan")
      .select("id, id_tagihan, jumlah")
      .eq("id", id)
      .single();

    if (penerimaanError || !penerimaan) {
      return NextResponse.json(
        { error: "Data penerimaan tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.from("jurnal").delete().eq("no_bukti", `PNR-${id}`);

    const { error } = await db.from("proyek_penerimaan").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Penerimaan & jurnal berhasil dihapus",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus penerimaan" },
      { status: 500 },
    );
  }
}
