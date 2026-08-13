import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { calcDepresiasi } from "@/lib/aset/calc-depresiasi";
import { postAset } from "@/lib/accounting/postAset";
import { asetSchema, AsetInput } from "@/lib/validators/aset";

export type AsetRow = {
  id_aset: number;
  kategori_aset: string;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
  metode: string;
  tarif_penyusutan: number;
  depresiasi_bulanan: number;
  depresiasi_tahunan: number;
  akumulasi_depresiasi: number;
  nilai_buku: number;
  last_depresiasi: string | null;
};

/* =========================
   GET ASET
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("aset")
    .select(
      `
    id_aset,
    kategori_aset,
    nama,
    nilai_perolehan,
    tanggal_perolehan,
    umur_manfaat,
    metode,
    tarif_penyusutan,
    depresiasi_bulanan,
    depresiasi_tahunan,
    akumulasi_depresiasi,
    nilai_buku,
    last_depresiasi
  `,
    )
    .order("tanggal_perolehan", { ascending: false });
  if (error) {
    console.error("GET ASET ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data.map((a) => ({
    id_aset: Number(a.id_aset),

    kategori_aset:
      a.kategori_aset && a.kategori_aset !== "null"
        ? String(a.kategori_aset)
        : "PERALATAN",

    nama: String(a.nama),

    nilai_perolehan: Number(a.nilai_perolehan),

    tanggal_perolehan: String(a.tanggal_perolehan),

    umur_manfaat: Number(a.umur_manfaat),

    metode: String(a.metode ?? "GARIS_LURUS"),

    tarif_penyusutan: Number(
      a.tarif_penyusutan ?? 100 / Number(a.umur_manfaat),
    ),

    depresiasi_bulanan: Number(a.depresiasi_bulanan ?? 0),

    depresiasi_tahunan: Number(
      a.depresiasi_tahunan ?? Number(a.depresiasi_bulanan ?? 0) * 12,
    ),

    akumulasi_depresiasi: Number(a.akumulasi_depresiasi ?? 0),

    nilai_buku: Number(a.nilai_buku ?? a.nilai_perolehan),

    last_depresiasi: a.last_depresiasi ? String(a.last_depresiasi) : null,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST ASET
========================= */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    const parsed = asetSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: AsetInput = parsed.data;

    const nominal = input.nilai_perolehan;

    if (nominal <= 0) {
      return Response.json(
        { error: "Nilai perolehan tidak valid" },
        { status: 400 },
      );
    }

    const hasil = calcDepresiasi(nominal, input.umur_manfaat);

    const depresiasiBulanan = hasil.depresiasiBulanan;
    const depresiasiTahunan = hasil.depresiasiTahunan;
    const tarifPenyusutan = hasil.tarifPersen;

    const { data, error } = await db
      .from("aset")
      .insert({
        kategori_aset: input.kategori_aset,
        nama: input.nama,
        nilai_perolehan: nominal,
        tanggal_perolehan: input.tanggal_perolehan,
        umur_manfaat: input.umur_manfaat,
        metode: "GARIS_LURUS",
        tarif_penyusutan: tarifPenyusutan,
        depresiasi_bulanan: depresiasiBulanan,
        depresiasi_tahunan: depresiasiTahunan,
        akumulasi_depresiasi: 0,
        nilai_buku: nominal,
        last_depresiasi: null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message);
    }

    const jurnalId = await postAset(
      input.tanggal_perolehan,
      `AST-${data.id_aset}`,
      input.nama,
      nominal,
    );

    await db
      .from("aset")
      .update({ id_jurnal: jurnalId })
      .eq("id_aset", data.id_aset);

    return Response.json({
      message: "Aset berhasil disimpan",
      data,
    });
  } catch (error: unknown) {
    console.error("ASET ERROR:", error);

    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
