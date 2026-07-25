import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { postDepresiasiAset } from "@/lib/accounting/postDepresiasiAset";

export async function POST(): Promise<NextResponse> {
  try {
    const today = new Date();
    const tanggal = today.toISOString().split("T")[0];

    const { data: asetList, error } = await db.from("aset").select(`
  id_aset,
  nama,
  depresiasi_bulanan,
  akumulasi_depresiasi,
  nilai_perolehan,
  last_depresiasi
`);

    if (error) {
      throw new Error(error.message);
    }

    for (const aset of asetList ?? []) {
      const depresiasi = Number(aset.depresiasi_bulanan ?? 0);

      if (depresiasi <= 0) continue;

      const last = aset.last_depresiasi;

      if (last) {
        const lastDate = new Date(last);
        if (
          lastDate.getMonth() === today.getMonth() &&
          lastDate.getFullYear() === today.getFullYear()
        ) {
          continue; // sudah dihitung bulan ini
        }
      }

      const periode = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;

      const noBukti = `DAST-${aset.id_aset}-${periode}`;

      try {
        const jurnalId = await postDepresiasiAset(
          tanggal,
          noBukti,
          `Depresiasi aset ${aset.nama}`,
          depresiasi,
        );

        const akumulasi = Number(aset.akumulasi_depresiasi ?? 0) + depresiasi;

        const nilaiBuku = Number(aset.nilai_perolehan ?? 0) - akumulasi;

        const { data: updated, error: updateError } = await db
          .from("aset")
          .update({
            akumulasi_depresiasi: akumulasi,
            nilai_buku: nilaiBuku,
            last_depresiasi: tanggal,
          })
          .eq("id_aset", aset.id_aset)
          .select();

        if (updateError) {
          throw new Error(updateError.message);
        }

        if (!updated || updated.length === 0) {
          throw new Error(`Aset ${aset.id_aset} tidak berhasil diupdate`);
        }
      } catch (err) {
        console.error(`Depresiasi aset ${aset.id_aset} gagal`, err);
      }
    }

    return NextResponse.json({
      message: "Depresiasi berhasil dijalankan",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
