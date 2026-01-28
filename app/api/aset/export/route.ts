import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildAsetExcelWithQR } from "@/lib/export/aset-export";

type AsetRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("aset")
    .select("id_aset,nama,nilai_perolehan,tanggal_perolehan,umur_manfaat")
    .order("tanggal_perolehan", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data aset" },
      { status: 500 },
    );
  }

  const rows: AsetRow[] = data.map((a) => ({
    id_aset: a.id_aset as number,
    nama: a.nama as string,
    nilai_perolehan: Number(a.nilai_perolehan),
    tanggal_perolehan: a.tanggal_perolehan as string,
    umur_manfaat: a.umur_manfaat as number,
  }));

  const buffer = await buildAsetExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=aset.xlsx",
    },
  });
}
