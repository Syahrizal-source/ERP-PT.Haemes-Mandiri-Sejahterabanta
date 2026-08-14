import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  TagihanProyekDetailSchema,
  type TagihanProyekDetailInput,
} from "@/lib/validators/tagihanproyek";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type SourceData = {
  id: string;
  id_proyek: string;
  no_bukti: string | null;
  uraian: string | null;
  qty: number | null;
  satuan: string | null;
  harga: number | null;
  total: number | null;
  id_jurnal: number | null;
};

type DetailRow = {
  sumber: TagihanProyekDetailInput["sumber"];
  total: number | null;
};

/* =====================================================
   GET DETAIL TAGIHAN
   ===================================================== */

export async function GET(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    if (!id) {
      throw new Error("ID tagihan wajib diisi.");
    }

    /* =================================================
       HEADER TAGIHAN
    ================================================= */

    const { data: tagihan, error: tagihanError } = await db
      .from("proyek_tagihan")
      .select(
        `
        id,
        id_proyek,
        nomor_invoice,
        tanggal,
        nilai,
        status,
        no_bukti,
        periode,
        nilai_ppn,
        nilai_pph,
        grand_total,
        total_material,
        total_alat_berat,
        total_tenaga_kerja,
        total_operasional,
        total_realisasi,
        total_subkon,
        total_progress,
        id_jurnal
        `,
      )
      .eq("id", id)
      .single();

    if (tagihanError || !tagihan) {
      throw new Error("Tagihan proyek tidak ditemukan.");
    }

    /* =================================================
       DETAIL TAGIHAN
    ================================================= */

    const { data: details, error: detailError } = await db
      .from("proyek_tagihan_detail")
      .select(
        `
        id,
        id_tagihan,
        sumber,
        id_referensi,
        no_bukti,
        uraian,
        qty,
        satuan,
        harga,
        total,
        id_jurnal,
        created_at
        `,
      )
      .eq("id_tagihan", id)
      .order("created_at", {
        ascending: true,
      });

    if (detailError) {
      throw new Error(`Gagal mengambil detail tagihan: ${detailError.message}`);
    }

    return NextResponse.json({
      tagihan,
      details: details ?? [],
    });
  } catch (error: unknown) {
    console.error("GET TAGIHAN DETAIL ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail tagihan.",
      },
      {
        status: 400,
      },
    );
  }
}

/* =====================================================
   POST DETAIL TAGIHAN
   ===================================================== */

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    if (!id) {
      throw new Error("ID tagihan wajib diisi.");
    }

    /* =================================================
       VALIDASI
    ================================================= */

    const json: unknown = await req.json();

    const detail: TagihanProyekDetailInput =
      TagihanProyekDetailSchema.parse(json);

    /* =================================================
       AMBIL HEADER TAGIHAN
    ================================================= */

    const { data: tagihan, error: tagihanError } = await db
      .from("proyek_tagihan")
      .select(
        `
        id,
        id_proyek,
        id_jurnal
        `,
      )
      .eq("id", id)
      .single();

    if (tagihanError || !tagihan) {
      throw new Error("Tagihan proyek tidak ditemukan.");
    }

    /* =================================================
       AMBIL SUMBER
    ================================================= */

    const source = await getSourceData(detail.sumber, detail.id_referensi);

    if (!source) {
      throw new Error(`Data sumber ${detail.sumber} tidak ditemukan.`);
    }

    /* =================================================
       VALIDASI PROYEK
    ================================================= */

    if (source.id_proyek !== tagihan.id_proyek) {
      throw new Error(
        `Data ${detail.sumber} bukan berasal dari proyek tagihan.`,
      );
    }

    /* =================================================
       CEGAH DUPLIKAT
    ================================================= */

    const { data: existing, error: existingError } = await db
      .from("proyek_tagihan_detail")
      .select("id")
      .eq("id_tagihan", tagihan.id)
      .eq("sumber", detail.sumber)
      .eq("id_referensi", detail.id_referensi)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Gagal mengecek detail: ${existingError.message}`);
    }

    if (existing) {
      throw new Error(
        `Sumber ${detail.sumber} tersebut sudah masuk ke tagihan.`,
      );
    }

    /* =================================================
       TOTAL DETAIL
    ================================================= */

    const total = Number(detail.total ?? source.total ?? 0);

    if (!Number.isFinite(total) || total < 0) {
      throw new Error("Total detail tidak valid.");
    }

    /* =================================================
       INSERT DETAIL
    ================================================= */

    const { data: inserted, error: insertError } = await db
      .from("proyek_tagihan_detail")
      .insert({
        id_tagihan: tagihan.id,
        sumber: detail.sumber,
        id_referensi: detail.id_referensi,
        no_bukti: detail.no_bukti ?? source.no_bukti ?? null,
        uraian: detail.uraian ?? source.uraian ?? null,
        qty: detail.qty ?? source.qty ?? null,
        satuan: detail.satuan ?? source.satuan ?? null,
        harga: detail.harga ?? source.harga ?? null,

        total,

        id_jurnal: detail.id_jurnal ?? source.id_jurnal ?? null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(
        insertError?.message ?? "Gagal menyimpan detail tagihan.",
      );
    }

    /* =================================================
       HITUNG ULANG TOTAL HEADER
    ================================================= */

    await recalculateTagihanTotals(tagihan.id);

    return NextResponse.json(
      {
        message: "Detail tagihan berhasil ditambahkan.",
        data: inserted,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST TAGIHAN DETAIL ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan detail tagihan.",
      },
      {
        status: 400,
      },
    );
  }
}

/* =====================================================
   AMBIL DATA SUMBER
   ===================================================== */

async function getSourceData(
  sumber: TagihanProyekDetailInput["sumber"],
  idReferensi: string,
): Promise<SourceData | null> {
  const tableMap: Record<TagihanProyekDetailInput["sumber"], string> = {
    MATERIAL: "proyek_material",
    ALAT_BERAT: "proyek_alat_berat",
    TENAGA_KERJA: "proyek_tenaga_kerja",
    OPERASIONAL: "proyek_operasional",
    REALISASI: "proyek_realisasi",
    SUBKON: "proyek_subkon",
    PROGRESS: "proyek_progress",
  };

  const table = tableMap[sumber];

  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("id", idReferensi)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as Record<string, unknown>;

  const getString = (value: unknown): string | null => {
    return typeof value === "string" ? value : null;
  };

  const getNumber = (value: unknown): number | null => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const id = getString(row.id);
  const idProyek = getString(row.id_proyek);

  if (!id || !idProyek) {
    return null;
  }

  const qty =
    getNumber(row.qty) ??
    getNumber(row.volume) ??
    getNumber(row.jam_operasi) ??
    getNumber(row.target_volume) ??
    getNumber(row.realisasi_volume);

  const total =
    getNumber(row.total) ??
    getNumber(row.nilai_progress) ??
    getNumber(row.nilai_kontrak) ??
    getNumber(row.upah);

  const harga =
    getNumber(row.harga) ??
    getNumber(row.harga_satuan) ??
    getNumber(row.tarif_sewa_internal) ??
    getNumber(row.upah);

  const noBukti = getString(row.no_bukti) ?? getString(row.nomor_invoice);

  const uraian =
    getString(row.uraian) ??
    getString(row.pekerjaan) ??
    getString(row.keterangan) ??
    getString(row.nama);

  const satuan = getString(row.satuan);

  const idJurnal = getNumber(row.id_jurnal);

  return {
    id,
    id_proyek: idProyek,
    no_bukti: noBukti,
    uraian,
    qty,
    satuan,
    harga,
    total,
    id_jurnal: idJurnal,
  };
}

/* =====================================================
   RECALCULATE TOTAL TAGIHAN
   ===================================================== */

async function recalculateTagihanTotals(idTagihan: string): Promise<void> {
  const { data, error } = await db
    .from("proyek_tagihan_detail")
    .select(
      `
      sumber,
      total
      `,
    )
    .eq("id_tagihan", idTagihan);

  if (error) {
    throw new Error(`Gagal mengambil detail tagihan: ${error.message}`);
  }

  const totals: Record<TagihanProyekDetailInput["sumber"], number> = {
    MATERIAL: 0,
    ALAT_BERAT: 0,
    TENAGA_KERJA: 0,
    OPERASIONAL: 0,
    REALISASI: 0,
    SUBKON: 0,
    PROGRESS: 0,
  };

  for (const row of (data ?? []) as DetailRow[]) {
    const total = Number(row.total ?? 0);

    if (!Number.isFinite(total) || total < 0) {
      throw new Error("Terdapat total detail yang tidak valid.");
    }

    totals[row.sumber] += total;
  }

  /* =================================================
     UPDATE HEADER
  ================================================= */

  const { error: updateError } = await db
    .from("proyek_tagihan")
    .update({
      total_material: totals.MATERIAL,

      total_alat_berat: totals.ALAT_BERAT,

      total_tenaga_kerja: totals.TENAGA_KERJA,

      total_operasional: totals.OPERASIONAL,

      total_realisasi: totals.REALISASI,

      total_subkon: totals.SUBKON,

      total_progress: totals.PROGRESS,
    })
    .eq("id", idTagihan);

  if (updateError) {
    throw new Error(`Gagal memperbarui total tagihan: ${updateError.message}`);
  }
}
