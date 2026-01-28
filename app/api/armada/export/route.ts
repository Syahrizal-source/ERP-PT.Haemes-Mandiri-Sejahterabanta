import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildArmadaExcelWithQR } from "@/lib/export/armada-export";
import type { ArmadaRow } from "@/types/armada";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db.from("armada").select("*");
  if (error || !data)
    return NextResponse.json(
      { error: error?.message ?? "Export gagal" },
      { status: 500 },
    );

  const rows: ArmadaRow[] = data.map((r) => ({
    ...r,
    ["m³"]: Number(r["m³"]),
    tagihan: Number(r.tagihan),
    uang_jalan: Number(r.uang_jalan),
    belanja: Number(r.belanja),
    do_qty: Number(r.do_qty),
    mel: Number(r.mel),
    tambal_ban: Number(r.tambal_ban),
    inap_um: Number(r.inap_um),
    sub_bak_besar: Number(r.sub_bak_besar),
    perg_solar: Number(r.perg_solar),
    kaca_film_bemper: Number(r.kaca_film_bemper),
    sparepart: Number(r.sparepart),
    koordinasi: Number(r.koordinasi),
    adm: Number(r.adm),
    stnk_kir: Number(r.stnk_kir),
    jumlah_tagihan: Number(r.jumlah_tagihan),
    jumlah_uang_jalan: Number(r.jumlah_uang_jalan),
    jumlah_do: Number(r.jumlah_do),
    bersih: Number(r.bersih),
  }));

  const buffer = await buildArmadaExcelWithQR(rows);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=armada.xlsx",
    },
  });
}
