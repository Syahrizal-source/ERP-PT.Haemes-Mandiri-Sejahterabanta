import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RingkasanResponse = {
  total_rab: number;
  total_tagihan: number;
  total_penerimaan: number;
  sisa_piutang: number;
  total_alat_berat: number;
  total_material: number;
  total_tenaga_kerja: number;
  total_progress: number;
  total_hutang: number;
  total_piutang_non_proyek: number;
};

function sumNumeric<T>(rows: T[] | null, field: keyof T): number {
  if (!rows || rows.length === 0) return 0;

  return rows.reduce((acc: number, row: T) => {
    const value = row[field];
    if (typeof value === "number") return acc + value;
    if (typeof value === "string") return acc + Number(value);
    return acc;
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = searchParams.get("id_proyek");

    if (!id_proyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    /* ======================
       FETCH DATA
    ====================== */

    const { data: rab } = await db
      .from("proyek_rab")
      .select("total")
      .eq("id_proyek", id_proyek);

    const { data: tagihan } = await db
      .from("proyek_tagihan")
      .select("nilai")
      .eq("id_proyek", id_proyek);

    const { data: penerimaan } = await db
      .from("proyek_penerimaan")
      .select(
        `
        jumlah,
        proyek_tagihan!inner (
          id_proyek
        )
      `,
      )
      .eq("proyek_tagihan.id_proyek", id_proyek);

    const { data: alatBerat } = await db
      .from("proyek_alat_berat_konstruksi")
      .select("tarif_sewa_internal")
      .eq("id_proyek", id_proyek);

    const { data: material } = await db
      .from("proyek_material")
      .select("harga")
      .eq("id_proyek", id_proyek);

    const { data: tenagaKerja } = await db
      .from("proyek_tenaga_kerja")
      .select("upah")
      .eq("id_proyek", id_proyek);

    const { data: progress } = await db
      .from("proyek_progress")
      .select("deviasi")
      .eq("id_proyek", id_proyek);

    const { data: hutang } = await db
      .from("proyek_hutang")
      .select("nilai")
      .eq("id_proyek", id_proyek);

    const { data: piutangNonProyek } = await db
      .from("piutang_non_proyek")
      .select("saldo");

    /* ======================
       HITUNG TOTAL
    ====================== */

    const total_rab = sumNumeric(rab, "total");
    const total_tagihan = sumNumeric(tagihan, "nilai");
    const total_penerimaan = sumNumeric(penerimaan, "jumlah");
    const total_alat_berat = sumNumeric(alatBerat, "tarif_sewa_internal");
    const total_material = sumNumeric(material, "harga");
    const total_tenaga_kerja = sumNumeric(tenagaKerja, "upah");
    const total_progress = sumNumeric(progress, "deviasi");
    const total_hutang = sumNumeric(hutang, "nilai");
    const total_piutang_non_proyek = sumNumeric(piutangNonProyek, "saldo");

    const sisa_piutang = total_tagihan - total_penerimaan;

    const response: RingkasanResponse = {
      total_rab,
      total_tagihan,
      total_penerimaan,
      sisa_piutang,
      total_alat_berat,
      total_material,
      total_tenaga_kerja,
      total_progress,
      total_hutang,
      total_piutang_non_proyek,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
