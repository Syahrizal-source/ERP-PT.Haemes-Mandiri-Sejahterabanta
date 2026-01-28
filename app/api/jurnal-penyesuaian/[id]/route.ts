import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import type { JurnalForm } from "@/types/jurnal";
import { jurnalPenyesuaianSchema } from "@/lib/validators/jurnal-penyesuaian";
import { normalizeHMSDetails } from "@/lib/jurnal/normalize-hms";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_jurnal = Number(id);

  const body: unknown = await req.json();
  const parsed = jurnalPenyesuaianSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const data: JurnalForm = parsed.data;

  const normalizedDetails = normalizeHMSDetails(
    data.details.map((d) => ({
      id_coa: d.id_coa,
      debit: d.debit,
      kredit: d.kredit,
      id_alat: d.id_alat ?? null,
    })),
  );

  const totalDebit = normalizedDetails.reduce((sum, d) => sum + d.debit, 0);
  const totalKredit = normalizedDetails.reduce((sum, d) => sum + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Total debit harus sama dengan total kredit" },
      { status: 400 },
    );
  }

  // UPDATE HEADER
  const { error: headerError } = await db
    .from("jurnal")
    .update({
      tanggal: data.tanggal,
      no_bukti: data.no_bukti,
      keterangan: data.keterangan,
      id_periode: data.id_periode,
    })
    .eq("id_jurnal", id_jurnal)
    .eq("sumber", "PENYESUAIAN");

  if (headerError) {
    return NextResponse.json({ message: headerError.message }, { status: 500 });
  }

  // DELETE OLD DETAIL
  const { error: deleteDetailError } = await db
    .from("jurnal_detail")
    .delete()
    .eq("id_jurnal", id_jurnal);

  if (deleteDetailError) {
    return NextResponse.json(
      { message: deleteDetailError.message },
      { status: 500 },
    );
  }

  // INSERT NEW DETAIL
  const detailRows = normalizedDetails.map((d) => ({
    id_jurnal,
    id_coa: d.id_coa,
    debit: d.debit,
    kredit: d.kredit,
    id_alat: d.id_alat,
  }));

  const { error: detailError } = await db
    .from("jurnal_detail")
    .insert(detailRows);

  if (detailError) {
    return NextResponse.json({ message: detailError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_jurnal = Number(id);

  const { error } = await db
    .from("jurnal")
    .delete()
    .eq("id_jurnal", id_jurnal)
    .eq("sumber", "PENYESUAIAN");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
