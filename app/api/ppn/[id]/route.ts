import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  ppnSchema,
  normalizePpn,
  validatePpn,
  hitungPpn,
} from "@/lib/validators/ppn";

/* =========================
   GET BY ID
========================= */
export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params; // ✅ WAJIB

  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { data, error } = await db
    .from("ppn")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

/* =========================
   PUT
========================= */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params; // ✅ WAJIB

  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const raw: unknown = await req.json();

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const bodyRaw = raw as Record<string, unknown>;

  const body = {
    id_transaksi: Number(bodyRaw.id_transaksi),
    jenis_ppn: String(bodyRaw.jenis_ppn),
    nilai_dasar: Number(bodyRaw.nilai_dasar),
    tarif_ppn: Number(bodyRaw.tarif_ppn),
    nilai_ppn: Number(bodyRaw.nilai_ppn),
    tanggal_transaksi: String(bodyRaw.tanggal_transaksi),
  };

  const parsed = ppnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const input = parsed.data;

  const dataNorm = normalizePpn(input);
  validatePpn(dataNorm);

  const hitung = hitungPpn(dataNorm);

  const { data, error } = await db
    .from("ppn")
    .update({
      id_transaksi: dataNorm.id_transaksi,
      jenis_ppn: dataNorm.jenis_ppn,
      nilai_dasar: dataNorm.nilai_dasar,
      tarif_ppn: dataNorm.tarif_ppn,
      nilai_ppn: hitung.nilai_ppn,
      tanggal_transaksi: dataNorm.tanggal_transaksi,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Updated",
    data,
  });
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params; // ✅ WAJIB

  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { error } = await db.from("ppn").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Deleted",
  });
}
