import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildJurnalPenutupExcelWithQR } from "@/lib/export/jurnal-penutup-export";

type Params = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_jurnal = Number(id);

  // Header jurnal penutup
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .select("tanggal,no_bukti,keterangan,id_periode,sumber")
    .eq("id_jurnal", id_jurnal)
    .eq("sumber", "PENUTUP")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: "Jurnal penutup tidak ditemukan" },
      { status: 404 },
    );
  }

  // Detail jurnal penutup
  const { data: details, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_coa,debit,kredit")
    .eq("id_jurnal", id_jurnal);

  if (detailError || !details) {
    return NextResponse.json(
      { error: "Detail jurnal tidak ditemukan" },
      { status: 404 },
    );
  }

  const buffer = await buildJurnalPenutupExcelWithQR(
    {
      tanggal: header.tanggal as string,
      no_bukti: header.no_bukti as string,
      keterangan: header.keterangan as string,
      id_periode: header.id_periode as number,
    },
    details.map((d) => ({
      id_coa: d.id_coa as number,
      debit: Number(d.debit),
      kredit: Number(d.kredit),
    })),
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=jurnal-penutup-${header.no_bukti}.xlsx`,
    },
  });
}
