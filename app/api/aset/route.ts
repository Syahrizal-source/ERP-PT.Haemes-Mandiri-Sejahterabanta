import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { calcDepresiasiBulanan } from "@/lib/aset/calc-depresiasi";
import { postAset } from "@/lib/accounting/postAset";
import { asetSchema, AsetInput } from "@/lib/validators/aset";

export type AsetRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
  depresiasi_bulanan: number;
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
    nama,
    nilai_perolehan,
    tanggal_perolehan,
    umur_manfaat,
    depresiasi_bulanan,
    akumulasi_depresiasi,
    nilai_buku,
    last_depresiasi
  `,
    )
    .order("tanggal_perolehan", {
      ascending: false,
    });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data aset" },
      { status: 500 },
    );
  }

  const result: AsetRow[] = data.map((a) => ({
    id_aset: Number(a.id_aset),
    nama: String(a.nama),
    nilai_perolehan: Number(a.nilai_perolehan),
    tanggal_perolehan: String(a.tanggal_perolehan),
    umur_manfaat: Number(a.umur_manfaat),
    depresiasi_bulanan: Number(a.depresiasi_bulanan ?? 0),
    akumulasi_depresiasi: Number(a.akumulasi_depresiasi ?? 0),
    nilai_buku: Number(a.nilai_buku ?? 0),
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

    const ppn = nominal * 0.11;
    const pph23 = nominal * 0.02;

    const total = nominal + ppn - pph23;

    if (total <= 0) {
      return Response.json({ error: "Total tidak valid" }, { status: 400 });
    }

    const depresiasi = calcDepresiasiBulanan(nominal, input.umur_manfaat);

    const { data, error } = await db
      .from("aset")
      .insert({
        nama: input.nama,
        nilai_perolehan: nominal,
        tanggal_perolehan: input.tanggal_perolehan,
        umur_manfaat: input.umur_manfaat,
        depresiasi_bulanan: depresiasi,
        ppn,
        pph23,
        total,
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
      ppn,
      pph23,
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
