import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPPNExcelWithQR } from "@/lib/export/ppn-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("ppn")
    .select("id,jenis_ppn,nilai_dasar,tarif_ppn,nilai_ppn,tanggal_transaksi")
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPN" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id: r.id as number,
    jenis_ppn: r.jenis_ppn as string,
    nilai_dasar: Number(r.nilai_dasar),
    tarif_ppn: Number(r.tarif_ppn),
    nilai_ppn: Number(r.nilai_ppn),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  const buffer = await buildPPNExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=ppn.xlsx",
    },
  });
}
