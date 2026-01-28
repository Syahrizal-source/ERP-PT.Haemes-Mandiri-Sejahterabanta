import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildInvoiceExcelWithQR } from "@/lib/export/invoice-export";

type InvoiceRow = {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("invoice")
    .select("id,tanggal,no_invoice,customer,nominal,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data invoice" },
      { status: 500 },
    );
  }

  const rows: InvoiceRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_invoice: r.no_invoice as string,
    customer: r.customer as string,
    nominal: Number(r.nominal),
    status: r.status as string,
  }));

  const buffer = await buildInvoiceExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=invoice.xlsx",
    },
  });
}
