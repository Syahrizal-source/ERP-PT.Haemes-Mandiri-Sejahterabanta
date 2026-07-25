import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekPenerimaanSchema } from "@/lib/validators/penerimaanproyek";
import { validatePositive } from "@/lib/validator";

/* =========================
   GET LIST PENERIMAAN
========================= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    if (!idProyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("proyek_penerimaan")
      .select(
        `
        id,
  id_tagihan,
  tanggal,
  jumlah,
  metode,
  bank,
  proyek_tagihan!inner(
    id_proyek
  )
      `,
      )
      .eq("proyek_tagihan.id_proyek", idProyek)
      .order("tanggal", { ascending: true });

    if (error) throw error;

    const result = data.map((d) => ({
      id: d.id,
      id_tagihan: d.id_tagihan,
      tanggal: d.tanggal,
      jumlah: Number(d.jumlah),
      metode: d.metode ?? "",
      bank: d.bank ?? "",
    }));

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/* =========================
   POST PENERIMAAN + JURNAL
========================= */
export async function POST(req: NextRequest) {
  try {
    const body = ProyekPenerimaanSchema.parse(await req.json());
    validatePositive(body.jumlah, "Jumlah");

    const { data: tagihan, error: errTagihan } = await db
      .from("proyek_tagihan")
      .select("id, nilai")
      .eq("id", body.id_tagihan)
      .single();

    if (errTagihan || !tagihan) {
      throw new Error("Tagihan tidak ditemukan");
    }

    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      throw new Error("Tidak ada periode OPEN");
    }

    const { data: penerimaan, error: errInsert } = await db
      .from("proyek_penerimaan")
      .insert(body)
      .select("id")
      .single();

    if (errInsert || !penerimaan) {
      throw new Error("Gagal menyimpan penerimaan");
    }

    const { data: list } = await db
      .from("proyek_penerimaan")
      .select("jumlah")
      .eq("id_tagihan", body.id_tagihan);

    const totalBayar = list?.reduce((sum, r) => sum + Number(r.jumlah), 0) ?? 0;

    const status =
      totalBayar >= tagihan.nilai
        ? "Paid (Pembayaran Penuh/ Lunas)"
        : "Partial (Pembayaran Sebagian)";

    await db
      .from("proyek_tagihan")
      .update({ status })
      .eq("id", body.id_tagihan);

    const { data: jurnal, error: errJurnal } = await db
      .from("jurnal")
      .insert({
        tanggal: body.tanggal,
        no_bukti: `RCV-${penerimaan.id}`,
        sumber: "KAS_PROYEK",
        keterangan: "Penerimaan Proyek",
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (errJurnal || !jurnal) {
      throw new Error("Gagal membuat jurnal");
    }

    const details = [
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 11030,
        debit: body.jumlah,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 12010,
        debit: 0,
        kredit: body.jumlah,
      },
    ];

    const { error: errDetail } = await db.from("jurnal_detail").insert(details);

    if (errDetail) {
      throw new Error("Gagal membuat jurnal detail");
    }

    return NextResponse.json({
      message: "Penerimaan & jurnal berhasil",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
