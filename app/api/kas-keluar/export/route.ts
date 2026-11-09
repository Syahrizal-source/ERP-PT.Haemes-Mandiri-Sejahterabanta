import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildKasKeluarExcelWithQR } from "@/lib/export/kas-keluar-export";

type KasKeluarRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  tujuan: string;
  id_akun_kas: number;
  id_akun_beban: number;
  nominal: number;
  keterangan: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kas_keluar")
    .select(
      "id,tanggal,no_bukti,tujuan,id_akun_kas,id_akun_beban,nominal,keterangan",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data kas keluar" },
      { status: 500 },
    );
  }

  const rows: KasKeluarRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_bukti: r.no_bukti as string,
    tujuan: r.tujuan as string,
    id_akun_kas: r.id_akun_kas as number,
    id_akun_beban: r.id_akun_beban as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  const buffer = await buildKasKeluarExcelWithQR(rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=kas-keluar.xlsx",
    },
  });
}
