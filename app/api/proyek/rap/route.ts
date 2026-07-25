import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekRAP } from "@/types/proyek";
import { postRAP } from "@/lib/accounting/postRAP";

type Kategori =
  | "alat"
  | "tenaga_kerja"
  | "bbm"
  | "sparepart"
  | "subcontract"
  | "overhead";

type RapBody = {
  id_proyek: string;
  nama_item: string;
  kategori: Kategori;
  qty: number;
  harga: number;
  tanggal: string;
  keterangan?: string;
};

/* =========================
   GET ALL
========================= */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = String(searchParams.get("id_proyek") ?? "");

    if (!id_proyek) {
      return NextResponse.json({ error: "id_proyek wajib" }, { status: 400 });
    }

    const { data, error } = await db
      .from("rap_proyek")
      .select("*")
      .eq("id_proyek", id_proyek) // 🔥 FILTER PENTING
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal ambil RAP" }, { status: 500 });
  }
}
/* =========================
   POST (ANTI MINUS + VALID)
========================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as RapBody;

    if (!body.id_proyek || !body.nama_item || !body.tanggal) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }
    await postRAP({
      id_proyek: body.id_proyek,
      nama_item: body.nama_item,
      kategori: body.kategori,
      qty: body.qty,
      harga: body.harga,
      tanggal: body.tanggal,
    });

    const qty = Math.max(0, Number(body.qty));
    const harga = Math.max(0, Number(body.harga));
    const total = qty * harga;

    if (total <= 0) {
      return NextResponse.json(
        { error: "Total tidak boleh 0" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT RAP
    ========================= */
    const { data: rap, error: rapError } = await db
      .from("rap_proyek")
      .insert({
        id_proyek: body.id_proyek,
        nama_item: body.nama_item,
        kategori: body.kategori,
        qty,
        harga,
        tanggal: body.tanggal,
        keterangan: body.keterangan,
      })
      .select()
      .single();

    if (rapError || !rap) {
      return NextResponse.json(
        { error: rapError?.message ?? "Gagal simpan RAP" },
        { status: 500 },
      );
    }

    await db.from("audit_log").insert({
      aksi: "INSERT",
      tabel: "rap_proyek",
      data: {
        id_rap: rap.id,
        nama_item: body.nama_item,
        total,
      },
    });

    /* =========================
       AMBIL PERIODE OPEN
    ========================= */
    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      return NextResponse.json(
        { error: "Periode OPEN tidak ditemukan" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT JURNAL HEADER
    ========================= */
    const { data: jurnal, error: jError } = await db
      .from("jurnal")
      .insert({
        tanggal: body.tanggal,
        no_bukti: `RAP-${Date.now()}`,
        sumber: "UMUM",
        keterangan: `RAP: ${body.nama_item}`,
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select()
      .single();

    if (jError || !jurnal) {
      return NextResponse.json(
        { error: jError?.message ?? "Gagal buat jurnal" },
        { status: 500 },
      );
    }

    /* =========================
       COA (WAJIB ADA DI DB)
    ========================= */
    const COA_BEBAN = 50000; // ganti sesuai DB kamu
    const COA_KAS = 11001; // kas

    /* =========================
       INSERT DETAIL
    ========================= */
    const { error: dError } = await db.from("jurnal_detail").insert([
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: COA_BEBAN,
        debit: total,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: COA_KAS,
        debit: 0,
        kredit: total,
      },
    ]);

    if (dError) {
      return NextResponse.json({ error: dError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "RAP + Jurnal berhasil",
    });
  } catch (err) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
