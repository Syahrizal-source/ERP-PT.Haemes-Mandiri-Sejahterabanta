import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { pph4Schema, type Pph4Input, hitungPph4 } from "@/lib/validators/pph4";

import { postPph4 } from "@/lib/accounting/postPph4";

/* =========================
   TYPE
========================= */

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
  ppn: number;

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
    const { data: pph4Data, error: pph4Error } = await db
      .from("pph4")
      .select(
        `
        id,
        id_vendor,
        jenis_objek,
        npwp_pembeli,
        nama_pembeli,
        nomor_faktur_pajak,
        tanggal_faktur_pajak,
        nilai_transaksi,
        dpp_nilai_lain,
        ppn,
        tarif_pph4,
        potongan,
        pph4_terutang,
        tanggal_transaksi,
        created_at
      `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (pph4Error) {
      console.error("PPH4 GET ERROR:", pph4Error);

      return NextResponse.json(
        {
          error: pph4Error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows = pph4Data ?? [];

    /*
     * Ambil ID vendor dari transaksi PPh4.
     */
    const vendorIds: number[] = Array.from(
      new Set(
        rows
          .map((row) => row.id_vendor)
          .filter(
            (id): id is number =>
              typeof id === "number" && Number.isInteger(id) && id > 0,
          ),
      ),
    );

    /*
     * Ambil vendor secara terpisah.
     *
     * Tidak menggunakan:
     * vendors!pph4_id_vendor_fkey
     *
     * supaya tidak terkena masalah relationship/schema cache.
     */
    const vendorMap = new Map<
      number,
      {
        id: number;
        kode_vendor: string | null;
        nama_vendor: string;
        npwp: string | null;
        nama_npwp: string | null;
      }
    >();

    if (vendorIds.length > 0) {
      const { data: vendorData, error: vendorError } = await db
        .from("vendors")
        .select(
          `
          id,
          kode_vendor,
          nama_vendor,
          npwp,
          nama_npwp
        `,
        )
        .in("id", vendorIds);

      if (vendorError) {
        console.error("PPH4 VENDOR GET ERROR:", vendorError);

        return NextResponse.json(
          {
            error: vendorError.message,
          },
          {
            status: 500,
          },
        );
      }

      for (const vendor of vendorData ?? []) {
        vendorMap.set(vendor.id, vendor);
      }
    }

    /*
     * Gabungkan transaksi PPh4 dengan vendor.
     */
    const result = rows.map((row) => {
      const vendor = vendorMap.get(row.id_vendor);

      return {
        ...row,

        vendors: vendor ?? null,

        /*
         * Jika NPWP pembeli kosong,
         * gunakan NPWP vendor.
         */
        npwp_pembeli: row.npwp_pembeli ?? vendor?.npwp ?? null,

        /*
         * Jika nama pembeli kosong,
         * gunakan nama vendor.
         */
        nama_pembeli: row.nama_pembeli ?? vendor?.nama_vendor ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("PPH4 GET ERROR:", error);

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
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* =========================
       PARSE BODY
    ========================= */

    const body: unknown = await req.json();

    const parsed = pph4Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: Pph4Input = parsed.data;

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
       HITUNG PPH4 OTOMATIS
       
       PENTING:
       Tidak mengambil potongan
       dari request.

       Rumus:

       Nilai Transaksi × Tarif / 100
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

    /*
     * Potongan otomatis sama dengan
     * hasil perhitungan PPh4.
     *
     * Jadi tidak ada lagi:
     *
     * input.potongan
     */

    const potongan: number = pph4Terutang;

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
       INSERT PPH4
       
       Potongan:
       hasil hitung otomatis.

       PPh4 Terutang:
       hasil hitung otomatis.
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
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal insert PPh4");
    }

    /* =========================
       POST JURNAL
       
       postPph4() juga menghitung
       ulang PPh4 dari input.
    ========================= */

    try {
      await postPph4(input, data.id);
    } catch (error: unknown) {
      console.error("JURNAL PPH4 ERROR:", error);

      /*
       * Dipertahankan sesuai pola
       * API sebelumnya:
       *
       * transaksi PPh4 tetap tersimpan
       * walaupun posting jurnal gagal.
       */
    }

    /* =========================
       RESPONSE
    ========================= */

    return NextResponse.json(
      {
        message: "PPh4 berhasil dibuat",
        data,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("PPH4 ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memproses PPh4",
      },
      {
        status: 500,
      },
    );
  }
}
