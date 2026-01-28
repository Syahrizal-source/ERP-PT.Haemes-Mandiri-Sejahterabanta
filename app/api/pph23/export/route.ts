import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPPH23ExcelWithQR } from "@/lib/export/pph23-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph23")
    .select(
      "id,id_vendor,jenis_jasa,nilai_transaksi,tarif_pph23,pph23_terutang,tanggal_transaksi",
    )
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH23" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id: r.id as number,
    id_vendor: r.id_vendor as number,
    jenis_jasa: r.jenis_jasa as string,
    nilai_transaksi: Number(r.nilai_transaksi),
    tarif_pph23: Number(r.tarif_pph23),
    pph23_terutang: Number(r.pph23_terutang),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  const buffer = await buildPPH23ExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=pph23.xlsx",
    },
  });
}
