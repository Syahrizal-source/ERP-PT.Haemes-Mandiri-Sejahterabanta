import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildKasbonExcelWithQR } from "@/lib/export/kasbon-export";
import type { KasbonRow } from "@/types/kasbon";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_pribadi")
    .select("id,tanggal,deskripsi,no_voucher,debit,kredit,saldo")
    .order("tanggal", { ascending: true });

  if (error || !data) {
    return NextResponse.json(
      { message: "Gagal ambil data kasbon pribadi" },
      { status: 500 },
    );
  }

  const rows: KasbonRow[] = data.map((r) => ({
    id: r.id as string,
    tanggal: r.tanggal as string,
    deskripsi: r.deskripsi as string,
    no_voucher: r.no_voucher as string,
    debit: Number(r.debit),
    kredit: Number(r.kredit),
    saldo: Number(r.saldo),
  }));

  const buffer = await buildKasbonExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=kasbon-pribadi.xlsx",
    },
  });
}
