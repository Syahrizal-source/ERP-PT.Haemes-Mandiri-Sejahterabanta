import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  ppnSchema,
  normalizePpn,
  validatePpn,
  hitungPpn,
} from "@/lib/validators/ppn";
import { postPpn } from "@/lib/accounting/postPpn";

/* =========================
   GET ALL
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("ppn")
    .select(
      `
    *,
    vendors (
      id,
      kode_vendor,
      nama_vendor,
      npwp,
      nama_npwp,
      alamat_npwp,
      pkp,
      jenis_pajak
    )
  `,
    )
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   POST
========================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json();

    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const bodyRaw = raw as Record<string, unknown>;

    /* =========================
       NORMALIZE NUMBER
    ========================= */
    const body = {
      id_transaksi: Number(bodyRaw.id_transaksi),

      vendor_id:
        bodyRaw.vendor_id === null || bodyRaw.vendor_id === undefined
          ? null
          : Number(bodyRaw.vendor_id),

      nomor_seri:
        typeof bodyRaw.nomor_seri === "string" ? bodyRaw.nomor_seri : null,

      keterangan:
        typeof bodyRaw.keterangan === "string" ? bodyRaw.keterangan : null,

      jenis_ppn: String(bodyRaw.jenis_ppn),

      nilai_dasar: Number(bodyRaw.nilai_dasar),

      tarif_ppn: Number(bodyRaw.tarif_ppn),

      nilai_ppn: Number(bodyRaw.nilai_ppn),

      tanggal_transaksi: String(bodyRaw.tanggal_transaksi),
    };

    /* =========================
       VALIDASI
    ========================= */
    const parsed = ppnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data tidak valid",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const dataNorm = normalizePpn(input);
    validatePpn(dataNorm);

    const hitung = hitungPpn(dataNorm);

    /* =========================
       INSERT DB
    ========================= */
    const { data, error } = await db
      .from("ppn")
      .insert({
        id_transaksi: dataNorm.id_transaksi,
        jenis_ppn: dataNorm.jenis_ppn,
        nilai_dasar: dataNorm.nilai_dasar,
        tarif_ppn: dataNorm.tarif_ppn,
        nilai_ppn: hitung.nilai_ppn,
        tanggal_transaksi: dataNorm.tanggal_transaksi,
        vendor_id: dataNorm.vendor_id,
        nomor_seri: dataNorm.nomor_seri,
        keterangan: dataNorm.keterangan,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Insert gagal" },
        { status: 500 },
      );
    }

    /* =========================
       POST JURNAL
    ========================= */
    try {
      await postPpn({
        ...dataNorm,
        nilai_ppn: hitung.nilai_ppn,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Berhasil",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
