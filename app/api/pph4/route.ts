import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph4Schema, type Pph4Input, hitungPph4 } from "@/lib/validators/pph4";
import { postPph4 } from "@/lib/accounting/postPph4";

type Pph4Row = {
  id: number;
  id_vendor: number;
  jenis_objek: string;
  npwp_pembeli: string | null;
  nama_pembeli: string | null;
  nomor_faktur_pajak: string | null;
  tanggal_faktur_pajak: string | null;
  nilai_transaksi: number;
  dpp_nilai_lain: number;
  tarif_pph4: number;
  potongan: number;
  pph4_terutang: number;
  tanggal_transaksi: string;
  created_at: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pph4")
      .select(
        `
    *,
    vendors!pph4_id_vendor_fkey (
      id,
      kode_vendor,
      nama_vendor
    )
  `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as Pph4Row[]);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   POST
========================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = pph4Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data PPh4 tidak valid" },
        { status: 400 },
      );
    }

    const input: Pph4Input = parsed.data;

    /* =========================
       HITUNG ULANG (ANTI MINUS)
    ========================= */

    const pph4_terutang: number = hitungPph4(input);

    if (pph4_terutang <= 0) {
      return NextResponse.json(
        { error: "Nilai PPh4 tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       VALIDASI VENDOR
    ========================= */

    const { data: vendor, error: vendorError } = await db
      .from("vendors")
      .select("id")
      .eq("id", input.id_vendor)
      .maybeSingle();

    if (vendorError) {
      throw new Error(vendorError.message);
    }

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor tidak ditemukan" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT
    ========================= */

    const { data, error } = await db
      .from("pph4")
      .insert({
        id_vendor: input.id_vendor,
        jenis_objek: input.jenis_objek,
        npwp_pembeli: input.npwp_pembeli ?? null,
        nama_pembeli: input.nama_pembeli ?? null,
        nomor_faktur_pajak: input.nomor_faktur_pajak ?? null,
        tanggal_faktur_pajak: input.tanggal_faktur_pajak ?? null,
        nilai_transaksi: input.nilai_transaksi,
        dpp_nilai_lain: input.dpp_nilai_lain ?? 0,
        tarif_pph4: input.tarif_pph4,
        potongan: input.potongan ?? 0,
        pph4_terutang,
        tanggal_transaksi: input.tanggal_transaksi,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert PPh4");
    }

    /* =========================
       JURNAL
    ========================= */

    try {
      await postPph4(input, data.id);
    } catch (err) {
      console.error("JURNAL PPH4 ERROR:", err);
      // tidak menggagalkan transaksi
    }

    return NextResponse.json({
      message: "PPh4 berhasil dibuat",
      data,
    });
  } catch (error: unknown) {
    console.error("PPH4 ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
