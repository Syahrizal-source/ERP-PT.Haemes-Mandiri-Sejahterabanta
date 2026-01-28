import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPPH4ExcelWithQR } from "@/lib/export/pph4-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph4")
    .select(
      "id,jenis_objek,nilai_transaksi,tarif_pph4,pph4_terutang,tanggal_transaksi",
    )
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH4" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id: r.id as number,
    jenis_objek: r.jenis_objek as string,
    nilai_transaksi: Number(r.nilai_transaksi),
    tarif_pph4: Number(r.tarif_pph4),
    pph4_terutang: Number(r.pph4_terutang),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  const buffer = await buildPPH4ExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=pph4.xlsx",
    },
  });
}
