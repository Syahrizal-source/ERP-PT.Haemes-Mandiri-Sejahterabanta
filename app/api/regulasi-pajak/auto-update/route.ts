import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function POST(): Promise<NextResponse> {
  const tahunBaru = new Date().getFullYear();

  const { data } = await db
    .from("regulasi_pajak")
    .select("*")
    .eq("aktif", true)
    .lt("tahun", tahunBaru);

  if (!data || data.length === 0) {
    return NextResponse.json({ message: "Tidak ada regulasi lama" });
  }

  for (const reg of data) {
    await db.from("regulasi_pajak").insert({
      ...reg,
      tahun: tahunBaru,
      versi: 1,
      aktif: true,
      berlaku_mulai: `${tahunBaru}-01-01`,
      berlaku_sampai: null,
    });
  }

  return NextResponse.json({ success: true, count: data.length });
}
