import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
}

interface DetailRow {
  id_detail: number;
  id_coa: number;
  debit: number;
  kredit: number;
  coa: CoaRow | null;
}

interface JurnalRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
  jurnal_detail: DetailRow[];
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const jurnalId: number = Number(id);

    if (!jurnalId) {
      return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    const { data: jurnalData, error: jurnalError } = await db
      .from("jurnal")
      .select(
        `
        id_jurnal,
        tanggal,
        no_bukti,
        sumber,
        keterangan,
        id_periode,
        is_posted
      `,
      )
      .eq("id_jurnal", jurnalId)
      .single();

    if (jurnalError || !jurnalData) {
      return NextResponse.json(
        { message: "Jurnal tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: detailData, error: detailError } = await db
      .from("jurnal_detail")
      .select(
        `
        id_detail,
        id_coa,
        debit,
        kredit
      `,
      )
      .eq("id_jurnal", jurnalId);

    if (detailError) {
      return NextResponse.json(
        { message: detailError.message },
        { status: 500 },
      );
    }

    const coaIds: number[] = (detailData ?? []).map((d) => d.id_coa);

    const { data: coaData } = await db
      .from("coa")
      .select(
        `
        id_coa,
        kode,
        nama
      `,
      )
      .in("id_coa", coaIds);

    const coaMap: Record<number, CoaRow> = {};

    (coaData ?? []).forEach((c) => {
      coaMap[c.id_coa] = {
        id_coa: c.id_coa,
        kode: c.kode,
        nama: c.nama,
      };
    });

    const details: DetailRow[] = (detailData ?? []).map((d) => ({
      id_detail: d.id_detail,
      id_coa: d.id_coa,
      debit: d.debit,
      kredit: d.kredit,
      coa: coaMap[d.id_coa] ?? null,
    }));

    const result: JurnalRow = {
      id_jurnal: jurnalData.id_jurnal,
      tanggal: jurnalData.tanggal,
      no_bukti: jurnalData.no_bukti,
      sumber: jurnalData.sumber,
      keterangan: jurnalData.keterangan,
      id_periode: jurnalData.id_periode,
      is_posted: jurnalData.is_posted ?? false,
      jurnal_detail: details,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Gagal ambil jurnal" },
      { status: 500 },
    );
  }
}
