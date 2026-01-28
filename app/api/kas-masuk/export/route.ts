import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildKasMasukExcelWithQR } from "@/lib/export/kas-masuk-export";

type KasMasukRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  keterangan: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kas_masuk")
    .select(
      "id,tanggal,no_bukti,sumber,id_akun_kas,id_akun_lawan,nominal,keterangan",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data kas masuk" },
      { status: 500 },
    );
  }

  const rows: KasMasukRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_bukti: r.no_bukti as string,
    sumber: r.sumber as string,
    id_akun_kas: r.id_akun_kas as number,
    id_akun_lawan: r.id_akun_lawan as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  const buffer = await buildKasMasukExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=kas-masuk.xlsx",
    },
  });
}
