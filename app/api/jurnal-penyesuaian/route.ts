import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import type { JurnalForm, JurnalPenyesuaianRow } from "@/types/jurnal";
import { jurnalPenyesuaianSchema } from "@/lib/validators/jurnal-penyesuaian";
import { normalizeHMSDetails } from "@/lib/jurnal/normalize-hms";

export async function POST(req: Request): Promise<NextResponse> {
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

  // INSERT HEADER
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: data.tanggal,
      no_bukti: data.no_bukti,
      keterangan: data.keterangan,
      id_periode: data.id_periode,
      sumber: "PENYESUAIAN",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { message: headerError?.message ?? "Gagal insert jurnal" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  // INSERT DETAIL
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

  return NextResponse.json({ id_jurnal });
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("jurnal")
    .select("id_jurnal,tanggal,no_bukti,keterangan,id_periode,sumber")
    .eq("sumber", "PENYESUAIAN")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { message: "Gagal ambil jurnal penyesuaian" },
      { status: 500 },
    );
  }

  const rows: JurnalPenyesuaianRow[] = data.map((r) => ({
    id_jurnal: r.id_jurnal as number,
    tanggal: r.tanggal as string,
    no_bukti: r.no_bukti as string,
    keterangan: r.keterangan as string,
    id_periode: r.id_periode as number,
    sumber: r.sumber as string,
  }));

  return NextResponse.json(rows);
}
