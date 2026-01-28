import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPembayaranInvoiceExcelWithQR } from "@/lib/export/pembayaran-invoice-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("id,tanggal,id_invoice,nominal,keterangan")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data pembayaran invoice" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    id_invoice: r.id_invoice as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  const buffer = await buildPembayaranInvoiceExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=pembayaran-invoice.xlsx",
    },
  });
}
