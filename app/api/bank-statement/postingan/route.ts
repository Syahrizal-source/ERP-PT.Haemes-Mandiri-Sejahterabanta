import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type PostingResult = {
  success: true;
  posted: number;
};

export async function POST(): Promise<NextResponse<PostingResult>> {
  const { data, error } = await db
    .from("bank_statement")
    .select("id,tanggal,keterangan,debit,kredit");

  if (error || !data) {
    return NextResponse.json({ success: false } as never, { status: 500 });
  }

  let posted = 0;

  for (const r of data) {
    const debit = Number(r.debit);
    const kredit = Number(r.kredit);

    if (debit === 0 && kredit === 0) continue;

    const lawanAkun = detectLawanAkun(r.keterangan);

    const { data: header, error: hErr } = await db
      .from("jurnal")
      .insert({
        tanggal: r.tanggal,
        no_bukti: `BS-${r.id}`,
        keterangan: r.keterangan,
        id_periode: 1,
        sumber: "UMUM",
      })
      .select("id_jurnal")
      .single();

    if (hErr || !header) continue;

    const details =
      debit > 0
        ? [
            { id_jurnal: header.id_jurnal, id_coa: 11001, debit, kredit: 0 },
            {
              id_jurnal: header.id_jurnal,
              id_coa: lawanAkun,
              debit: 0,
              kredit: debit,
            },
          ]
        : [
            {
              id_jurnal: header.id_jurnal,
              id_coa: lawanAkun,
              debit: kredit,
              kredit: 0,
            },
            { id_jurnal: header.id_jurnal, id_coa: 11001, debit: 0, kredit },
          ];

    await db.from("jurnal_detail").insert(details);
    posted++;
  }

  return NextResponse.json({ success: true, posted });
}

function detectLawanAkun(keterangan: string): number {
  const ket = keterangan.toLowerCase();

  if (ket.includes("bunga")) return 41001; // Pendapatan bunga
  if (ket.includes("fee")) return 61001; // Beban fee
  if (ket.includes("admin")) return 61002; // Beban admin
  if (ket.includes("pajak")) return 23001; // Hutang pajak

  return 30001; // default: modal
}
