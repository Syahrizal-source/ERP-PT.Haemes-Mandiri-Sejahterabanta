import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import type { Coa } from "@/types/coa";

/* ===============================
   UTIL: CEK COA TERKUNCI
   - sudah dipakai jurnal
   - atau periode CLOSED
================================ */
async function isCoaLocked(id_coa: number): Promise<boolean> {
  /* dipakai di jurnal_detail */
  const { count: usedCount } = await db
    .from("jurnal_detail")
    .select("*", { count: "exact", head: true })
    .eq("id_coa", id_coa);

  if ((usedCount ?? 0) > 0) return true;

  /* dipakai di jurnal dengan periode CLOSED */
  const { count: closedCount } = await db
    .from("jurnal_detail")
    .select(
      `
        id_jurnal,
        jurnal!inner (
          id_periode,
          periode!inner ( status )
        )
      `,
      { count: "exact", head: true },
    )
    .eq("id_coa", id_coa)
    .eq("jurnal.periode.status", "CLOSED");

  return (closedCount ?? 0) > 0;
}

/* ===============================
   GET: LIST COA
================================ */
export async function GET() {
  const { data, error } = await db
    .from("coa")
    .select("id_coa,kode,nama,tipe,parent_id,aktif,is_cash")
    .order("kode");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data satisfies Coa[]);
}

/* ===============================
   POST: CREATE COA
================================ */
export async function POST(req: Request) {
  const body: Omit<Coa, "id_coa" | "created_at" | "updated_at"> =
    await req.json();

  if (!body.kode || !body.nama || !body.tipe) {
    return NextResponse.json(
      { message: "Data tidak lengkap" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("coa")
    .insert({
      kode: body.kode,
      nama: body.nama,
      tipe: body.tipe,
      parent_id: body.parent_id ?? null,
      aktif: body.aktif,
      is_cash: body.is_cash,
    })
    .select("id_coa")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ id_coa: data.id_coa });
}

/* ===============================
   PATCH: UPDATE COA
================================ */
export async function PATCH(req: Request) {
  const body: Pick<Coa, "id_coa" | "nama" | "aktif" | "is_cash"> =
    await req.json();

  if (await isCoaLocked(body.id_coa)) {
    return NextResponse.json(
      {
        message: "COA sudah dipakai / periode CLOSED, tidak boleh diubah",
      },
      { status: 403 },
    );
  }

  const { error } = await db
    .from("coa")
    .update({
      nama: body.nama,
      aktif: body.aktif,
      is_cash: body.is_cash,
    })
    .eq("id_coa", body.id_coa);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/* ===============================
   DELETE: HAPUS COA
================================ */
export async function DELETE(req: Request) {
  const { id_coa }: { id_coa: number } = await req.json();

  if (await isCoaLocked(id_coa)) {
    return NextResponse.json(
      {
        message: "COA sudah dipakai / periode CLOSED, tidak boleh dihapus",
      },
      { status: 403 },
    );
  }

  const { error } = await db.from("coa").delete().eq("id_coa", id_coa);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
