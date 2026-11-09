import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildJurnalPenyesuaianExcelWithQR } from "@/lib/export/jurnal-penyesuaian-export";
import type {
  JurnalPenyesuaianRow,
  JurnalPenyesuaianDetailRow,
} from "@/types/jurnal";

type Params = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_jurnal = Number(id);

  if (!Number.isInteger(id_jurnal)) {
    return NextResponse.json(
      { message: "ID jurnal tidak valid" },
      { status: 400 },
    );
  }

  const { data: header, error: headerError } = await db
    .from("jurnal")
    .select("id_jurnal,tanggal,no_bukti,keterangan,id_periode,sumber")
    .eq("id_jurnal", id_jurnal)
    .eq("sumber", "PENYESUAIAN")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { message: "Header jurnal tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data: details, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_jurnal,id_coa,debit,kredit,id_alat")
    .eq("id_jurnal", id_jurnal);

  if (detailError || !details || details.length === 0) {
    return NextResponse.json(
      { message: "Detail jurnal tidak ditemukan" },
      { status: 404 },
    );
  }

  const headerRow: JurnalPenyesuaianRow = {
    id_jurnal: header.id_jurnal as number,
    tanggal: header.tanggal as string,
    no_bukti: header.no_bukti as string,
    keterangan: header.keterangan as string,
    id_periode: header.id_periode as number,
    sumber: header.sumber as string,
  };

  const detailRows: JurnalPenyesuaianDetailRow[] = details.map((d) => ({
    id_jurnal: d.id_jurnal as number,
    id_coa: d.id_coa as number,
    debit: Number(d.debit),
    kredit: Number(d.kredit),
    id_alat: d.id_alat as number | null,
  }));

  const buffer = await buildJurnalPenyesuaianExcelWithQR(headerRow, detailRows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=jurnal-penyesuaian-${header.no_bukti}.xlsx`,
    },
  });
}
