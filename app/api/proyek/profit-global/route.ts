import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Proyek = {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  nilai_kontrak: number;
  margin_target: number | null;
};

export async function GET() {
  try {
    const { data: proyekList, error } = await db
      .from("proyek_master")
      .select("id, kode_proyek, nama_proyek, nilai_kontrak, margin_target");

    if (error || !proyekList) {
      throw new Error("Gagal ambil proyek");
    }

    const result = [];

    for (const proyek of proyekList as Proyek[]) {
      /* ================= RAB ================= */
      const { data: rab } = await db
        .from("proyek_rab")
        .select("total")
        .eq("id_proyek", proyek.id);

      const totalRAB =
        rab?.reduce((s, r) => s + Number(r.total), 0) ?? 0;

      /* ================= ALAT BERAT ================= */
      const { data: alat } = await db
        .from("proyek_alat_berat_konstruksi")
        .select("tarif_sewa_internal, jam_operasi")
        .eq("id_proyek", proyek.id);

      const totalAlat =
        alat?.reduce(
          (s, a) =>
            s +
            Number(a.tarif_sewa_internal) *
              Number(a.jam_operasi),
          0,
        ) ?? 0;

      /* ================= MATERIAL ================= */
      const { data: material } = await db
        .from("proyek_material")
        .select("qty, harga")
        .eq("id_proyek", proyek.id);

      const totalMaterial =
        material?.reduce(
          (s, m) => s + Number(m.qty) * Number(m.harga),
          0,
        ) ?? 0;

      /* ================= TENAGA KERJA ================= */
      const { data: tenaga } = await db
        .from("proyek_tenaga_kerja")
        .select("upah")
        .eq("id_proyek", proyek.id);

      const totalTenaga =
        tenaga?.reduce((s, t) => s + Number(t.upah), 0) ??
        0;

      const totalBeban =
        totalAlat + totalMaterial + totalTenaga;

      /* ================= TAGIHAN ================= */
      const { data: tagihan } = await db
        .from("proyek_tagihan")
        .select("nilai")
        .eq("id_proyek", proyek.id);

      const totalPendapatan =
        tagihan?.reduce(
          (s, t) => s + Number(t.nilai),
          0,
        ) ?? 0;

      const profit = totalPendapatan - totalBeban;

      result.push({
        id: proyek.id,
        kode_proyek: proyek.kode_proyek,
        nama_proyek: proyek.nama_proyek,
        nilai_kontrak: Number(proyek.nilai_kontrak),
        margin_target: proyek.margin_target,
        total_rab: totalRAB,
        total_beban: totalBeban,
        total_pendapatan: totalPendapatan,
        profit,
      });
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}