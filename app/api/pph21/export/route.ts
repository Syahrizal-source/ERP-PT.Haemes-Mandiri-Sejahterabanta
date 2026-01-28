import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPPH21ExcelWithQR } from "@/lib/export/pph21-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph21")
    .select(
      "id,nama,gaji_bruto,biaya_jabatan,iuran,tarif_pph21,nilai_pph21,tanggal",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH21" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id: r.id as number,
    nama: r.nama as string,
    gaji_bruto: Number(r.gaji_bruto),
    biaya_jabatan: Number(r.biaya_jabatan),
    iuran: Number(r.iuran),
    tarif_pph21: Number(r.tarif_pph21),
    nilai_pph21: Number(r.nilai_pph21),
    tanggal: r.tanggal as string,
  }));

  const buffer = await buildPPH21ExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=pph21.xlsx",
    },
  });
}
