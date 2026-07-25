import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { PembayaranHutangSchema } from "@/lib/validators/pembayaranhutang";
import { validatePositive } from "@/lib/validator";

/* =========================
   GET PEMBAYARAN HUTANG
========================= */
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

    const { data, error } = await db
      .from("proyek_pembayaran_hutang")
      .select(
        `
        id,
        tanggal,
        jumlah,
        metode,
        bank,
        proyek_hutang!inner (
          id_proyek
        )
      `,
      )
      .eq("proyek_hutang.id_proyek", id_proyek)
      .order("tanggal", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      data.map((d) => ({
        id: d.id,
        tanggal: d.tanggal,
        jumlah: d.jumlah,
        metode: d.metode,
        bank: d.bank,
      })),
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/* =========================
   POST PEMBAYARAN + JURNAL
========================= */
export async function POST(req: NextRequest) {
  try {
    const payload = PembayaranHutangSchema.parse(await req.json());
    validatePositive(payload.jumlah, "Jumlah");

    // ambil hutang
    const { data: hutang } = await db
      .from("proyek_hutang")
      .select("id, nilai")
      .eq("id", payload.id_hutang)
      .single();

    if (!hutang) {
      throw new Error("Hutang tidak ditemukan");
    }

    // periode OPEN
    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      throw new Error("Tidak ada periode OPEN");
    }

    // simpan pembayaran
    const { data: pembayaran } = await db
      .from("proyek_pembayaran_hutang")
      .insert(payload)
      .select("id")
      .single();

    if (!pembayaran) {
      throw new Error("Gagal menyimpan pembayaran");
    }

    // hitung total bayar
    const { data: list } = await db
      .from("proyek_pembayaran_hutang")
      .select("jumlah")
      .eq("id_hutang", payload.id_hutang);

    const totalBayar = list?.reduce((s, r) => s + Number(r.jumlah), 0) ?? 0;

    const status =
      totalBayar >= hutang.nilai
        ? "Paid (Pembayaran Penuh/ Lunas)"
        : "Partial (Pembayaran Sebagian)";

    await db
      .from("proyek_hutang")
      .update({ status })
      .eq("id", payload.id_hutang);

    // jurnal header
    const { data: jurnal } = await db
      .from("jurnal")
      .insert({
        tanggal: payload.tanggal,
        no_bukti: `BHT-${pembayaran.id}`,
        sumber: "KAS_PROYEK",
        keterangan: "Pembayaran Hutang Proyek",
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (!jurnal) {
      throw new Error("Gagal membuat jurnal");
    }

    // jurnal detail
    const details = [
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 23001, // HUTANG USAHA
        debit: payload.jumlah,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: 11030, // KAS PROYEK
        debit: 0,
        kredit: payload.jumlah,
      },
    ];

    await db.from("jurnal_detail").insert(details);

    return NextResponse.json({
      message: "Pembayaran hutang & jurnal berhasil",
    });
  } catch (e: unknown) {
    console.error("PEMBAYARAN HUTANG ERROR:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
