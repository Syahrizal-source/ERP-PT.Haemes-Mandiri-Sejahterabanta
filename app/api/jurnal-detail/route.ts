import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import type { JurnalDetail } from "@/types/jurnal";

/* ===============================
   GET: Ambil semua atau by ID Jurnal
   Query param: ?id_jurnal=1
================================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idJurnalParam = searchParams.get("id_jurnal");
    let query = db
      .from("jurnal_detail")
      .select(
        "id_detail, id_jurnal, id_coa, debit, kredit, id_alat, id_cost_center",
      );

    if (idJurnalParam) {
      const idJurnal = Number(idJurnalParam);
      if (isNaN(idJurnal)) {
        return NextResponse.json(
          { message: "id_jurnal harus angka" },
          { status: 400 },
        );
      }
      query = query.eq("id_jurnal", idJurnal);
    }

    const { data, error } = await query.order("id_detail", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET JURNAL DETAIL ERROR:", err);
    return NextResponse.json(
      { message: "Gagal ambil jurnal detail" },
      { status: 500 },
    );
  }
}

/* ===============================
   POST: Tambah Jurnal Detail
================================= */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Omit<JurnalDetail, "id_detail">;

    if (!body.id_jurnal || !body.id_coa) {
      return NextResponse.json(
        { message: "id_jurnal dan id_coa wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("jurnal_detail")
      .insert([
        {
          id_jurnal: body.id_jurnal,
          id_coa: body.id_coa,
          debit: body.debit ?? 0,
          kredit: body.kredit ?? 0,
          id_alat: body.id_alat ?? null,
          id_cost_center: body.id_cost_center ?? null,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error("POST JURNAL DETAIL ERROR:", err);
    return NextResponse.json(
      { message: "Gagal simpan jurnal detail" },
      { status: 500 },
    );
  }
}

/* ===============================
   PUT: Update Jurnal Detail
================================= */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as JurnalDetail;

    if (!body.id_detail) {
      return NextResponse.json(
        { message: "id_detail wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("jurnal_detail")
      .update({
        id_coa: body.id_coa,
        debit: body.debit,
        kredit: body.kredit,
        id_alat: body.id_alat ?? null,
        id_cost_center: body.id_cost_center ?? null,
      })
      .eq("id_detail", body.id_detail)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error("PUT JURNAL DETAIL ERROR:", err);
    return NextResponse.json(
      { message: "Gagal update jurnal detail" },
      { status: 500 },
    );
  }
}

/* ===============================
   DELETE: Hapus Jurnal Detail
================================= */
export async function DELETE(req: Request) {
  try {
    const { id_detail } = (await req.json()) as { id_detail: number };

    if (!id_detail) {
      return NextResponse.json(
        { message: "id_detail wajib diisi" },
        { status: 400 },
      );
    }

    const { error } = await db
      .from("jurnal_detail")
      .delete()
      .eq("id_detail", id_detail);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE JURNAL DETAIL ERROR:", err);
    return NextResponse.json(
      { message: "Gagal hapus jurnal detail" },
      { status: 500 },
    );
  }
}
