import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildVendorExcelWithQR } from "@/lib/export/vendor-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("vendor")
    .select("id_vendor,nama,npwp,alamat")
    .order("nama");

  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil vendor" }, { status: 500 });
  }

  const rows = data.map((r) => ({
    id_vendor: r.id_vendor as number,
    nama: r.nama as string,
    npwp: r.npwp ?? undefined,
    alamat: r.alamat ?? undefined,
  }));

  const buffer = await buildVendorExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=vendor.xlsx",
    },
  });
}
