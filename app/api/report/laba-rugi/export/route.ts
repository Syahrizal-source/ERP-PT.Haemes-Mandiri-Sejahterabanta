import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildLabaRugiExcelWithQR } from "@/lib/export/laba-rugi-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("keterangan,debit,kredit");

  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }

  let pendapatan = 0;
  let beban = 0;

  for (const r of data) {
    const ket = r.keterangan.toLowerCase();
    if (ket.includes("bunga")) pendapatan += Number(r.debit);
    if (ket.includes("fee") || ket.includes("admin") || ket.includes("pajak")) {
      beban += Number(r.kredit);
    }
  }

  const buffer = await buildLabaRugiExcelWithQR(pendapatan, beban);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=laba-rugi.xlsx",
    },
  });
}
