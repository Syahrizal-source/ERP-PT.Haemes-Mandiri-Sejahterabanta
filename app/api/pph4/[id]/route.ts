import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/supabase/server";

import { pph4Schema, type Pph4Input, hitungPph4 } from "@/lib/validators/pph4";

/* =========================
   PARAMETER
========================= */

const paramSchema = z.object({
  id: z.string().min(1),
});

type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   HELPER ID
========================= */

function parseId(params: { id: string }): number | null {
  const id: number = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsed = paramSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const id: number | null = parseId(parsed.data);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

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
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal mengambil data PPh4",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   PUT
========================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    /* =========================
       VALIDASI ID
    ========================= */

    const params = await ctx.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const id: number | null = parseId(parsedParams.data);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       PARSE BODY
    ========================= */

    const body: unknown = await req.json();

    const parsedBody = pph4Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak valid",
          details: parsedBody.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: Pph4Input = parsedBody.data;

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
        {
          error: "Vendor tidak ditemukan",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       VALIDASI NILAI TRANSAKSI
    ========================= */

    if (!Number.isFinite(input.nilai_transaksi)) {
      return NextResponse.json(
        {
          error: "Nilai transaksi tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (input.nilai_transaksi < 0) {
      return NextResponse.json(
        {
          error: "Nilai transaksi tidak boleh minus",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       VALIDASI TARIF
    ========================= */

    if (!Number.isFinite(input.tarif_pph4)) {
      return NextResponse.json(
        {
          error: "Tarif PPh4 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (input.tarif_pph4 < 0) {
      return NextResponse.json(
        {
          error: "Tarif PPh4 tidak boleh minus",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       NORMALISASI DPP NILAI LAIN
    ========================= */

    const dppNilaiLain: number = Math.max(0, input.dpp_nilai_lain ?? 0);

    if (!Number.isFinite(dppNilaiLain)) {
      return NextResponse.json(
        {
          error: "DPP Nilai Lain tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       NORMALISASI PPN
    ========================= */

    const ppn: number = Math.max(0, input.ppn ?? 0);

    if (!Number.isFinite(ppn)) {
      return NextResponse.json(
        {
          error: "Nilai PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       HITUNG ULANG PPH4
       
       PENTING:
       Potongan TIDAK diambil
       dari input.potongan.

       Nilai dihitung otomatis
       berdasarkan:

       Nilai Transaksi × Tarif PPh4
    ========================= */

    const pph4Terutang: number = hitungPph4(input);

    if (!Number.isFinite(pph4Terutang) || pph4Terutang <= 0) {
      return NextResponse.json(
        {
          error: "Nilai PPh4 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       POTONGAN OTOMATIS
       
       Potongan PPh4 =
       PPh4 Terutang
    ========================= */

    const potongan: number = pph4Terutang;

    /* =========================
       CEK DATA
    ========================= */

    const { data: existing, error: existingError } = await db
      .from("pph4")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================
       UPDATE
       
       Potongan dan PPh4 Terutang
       berasal dari hitungan otomatis.
    ========================= */

    const { data, error } = await db
      .from("pph4")
      .update({
        id_vendor: input.id_vendor,

        jenis_objek: input.jenis_objek,

        npwp_pembeli: input.npwp_pembeli ?? null,

        nama_pembeli: input.nama_pembeli ?? null,

        nomor_faktur_pajak: input.nomor_faktur_pajak ?? null,

        tanggal_faktur_pajak: input.tanggal_faktur_pajak ?? null,

        nilai_transaksi: input.nilai_transaksi,

        dpp_nilai_lain: dppNilaiLain,

        ppn,

        tarif_pph4: input.tarif_pph4,

        /*
         * OTOMATIS
         */
        potongan,

        /*
         * OTOMATIS
         */
        pph4_terutang: pph4Terutang,

        tanggal_transaksi: input.tanggal_transaksi,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update PPh4");
    }

    return NextResponse.json({
      message: "PPh4 berhasil diupdate",
      data,
    });
  } catch (error: unknown) {
    console.error("PPH4 UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal update PPh4",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsed = paramSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const id: number | null = parseId(parsed.data);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       CEK DATA
    ========================= */

    const { data: existing, error: existingError } = await db
      .from("pph4")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================
       DELETE
    ========================= */

    const { error } = await db.from("pph4").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      message: "PPh4 berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("PPH4 DELETE ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal menghapus PPh4",
      },
      {
        status: 500,
      },
    );
  }
}
