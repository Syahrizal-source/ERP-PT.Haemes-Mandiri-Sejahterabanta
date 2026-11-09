import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";
import {
  pembayaranPph23Schema,
  type PembayaranPph23Input,
} from "@/lib/validators/pembayaran-pph23";

import { getCoaPembayaranPph23 } from "@/lib/accounting/getcoamapping";

/**
 * ============================================================
 * PARAMETER
 * ============================================================
 */

const paramSchema = z.object({
  id: z.string().trim().min(1),
});

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

interface PembayaranPph23Row {
  id: number;
  tanggal: string;
  id_pph23: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface Pph23Data {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
  id_periode: number | null;
}

interface PembayaranTotalRow {
  nominal: number | null;
}

/**
 * ============================================================
 * CONSTANT
 * ============================================================
 *
 * COA PPh23 pembayaran:
 *
 * PAJAK_PPH23 / HUTANG
 *        ↓
 * 55 - 21303 Hutang Pajak PPh 23
 *
 * COA 2264:
 * 62002 Beban Pajak PPh23
 *
 * BUKAN COA pembayaran.
 *
 * COA 1213:
 * 21308 Hutang PPh23 Proyek
 *
 * BUKAN COA PPh23 umum.
 *
 * COA 2722:
 * 21300 Utang Pajak
 *
 * HEADER, tidak boleh menjadi jurnal detail.
 *
 * COA 3:
 * 11100 Kas
 *
 * HEADER, tidak boleh menjadi jurnal detail.
 * ============================================================
 */

const PPH23_HUTANG_COA_ID = 55;
const PPH23_KAS_HEADER_COA_ID = 3;

/**
 * ============================================================
 * HELPER
 * ============================================================
 */

/**
 * Memastikan parameter [id] benar-benar integer positif.
 */
function parseId(value: string): number | null {
  const id: number = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/**
 * ============================================================
 * GET BY ID
 * ============================================================
 *
 * Path:
 *
 * /api/pembayaran-pph23/[id]/edit
 *
 * Mengambil satu pembayaran PPh23 berdasarkan ID.
 *
 * Database:
 *
 * pembayaran_pph23
 *
 * Tidak menggunakan:
 *
 * - ppn
 * - pph4
 * - total
 */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * VALIDASI PARAMETER
     * ========================================================
     */

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

    const id: number | null = parseId(parsed.data.id);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID pembayaran PPh23 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * AMBIL PEMBAYARAN
     * ========================================================
     */

    const { data, error } = await db
      .from("pembayaran_pph23")
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

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
          error: "Pembayaran PPh23 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const result: PembayaranPph23Row = {
      id: Number(data.id),
      tanggal: String(data.tanggal),
      id_pph23: Number(data.id_pph23),
      nominal: Number(data.nominal ?? 0),
      keterangan: String(data.keterangan ?? ""),
      id_coa_kas: Number(data.id_coa_kas),
      id_jurnal:
        data.id_jurnal === null || data.id_jurnal === undefined
          ? null
          : Number(data.id_jurnal),
      created_at: String(data.created_at ?? ""),
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN PPH23 BY ID ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pembayaran PPh23";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * PUT
 * ============================================================
 *
 * Update pembayaran PPh23.
 *
 * Payload:
 *
 * {
 *   tanggal,
 *   id_pph23,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 *
 * - ppn
 * - pph4
 * - total
 * - id_coa_hutang
 *
 * COA hutang PPh23 tetap ditentukan backend:
 *
 * PAJAK_PPH23 / HUTANG
 *        ↓
 * 55 - 21303 Hutang Pajak PPh 23
 *
 * COA kas:
 *
 * id_coa_kas
 *        ↓
 * harus COA kas/bank DETAIL
 *
 * IMPORTANT:
 *
 * Pembayaran yang sudah mempunyai id_jurnal tidak boleh
 * diedit karena jurnal sudah POSTED dan dilindungi.
 */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * VALIDASI PARAMETER
     * ========================================================
     */

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

    const id: number | null = parseId(parsedParams.data.id);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID pembayaran PPh23 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * PARSE BODY
     * ========================================================
     */

    const body: unknown = await req.json();

    const parsedBody = pembayaranPph23Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh23 tidak valid",
          details: parsedBody.error.flatten().fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph23Input = parsedBody.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_pph23) || input.id_pph23 <= 0) {
      return NextResponse.json(
        {
          error: "ID PPh23 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran PPh23 wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran PPh23 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!input.keterangan.trim()) {
      return NextResponse.json(
        {
          error: "Keterangan pembayaran PPh23 wajib diisi",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * CEK PEMBAYARAN YANG AKAN DIUPDATE
     * ========================================================
     */

    const { data: existing, error: existingError } = await db
      .from("pembayaran_pph23")
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh23: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh23 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const existingPayment: PembayaranPph23Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph23: Number(existing.id_pph23),
      nominal: Number(existing.nominal ?? 0),
      keterangan: String(existing.keterangan ?? ""),
      id_coa_kas: Number(existing.id_coa_kas),
      id_jurnal:
        existing.id_jurnal === null || existing.id_jurnal === undefined
          ? null
          : Number(existing.id_jurnal),
      created_at: String(existing.created_at ?? ""),
    };

    /**
     * ========================================================
     * CEK JURNAL POSTED
     * ========================================================
     *
     * Jika id_jurnal sudah ada, pembayaran sudah
     * mempunyai jurnal accounting.
     *
     * Jangan mengubah transaksi tersebut.
     */

    if (existingPayment.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pembayaran PPh23 sudah memiliki jurnal POSTED dan tidak dapat diubah.",
          id_jurnal: existingPayment.id_jurnal,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * VALIDASI COA PEMBAYARAN
     * ========================================================
     *
     * Backend menentukan COA hutang:
     *
     * PAJAK_PPH23 / HUTANG
     *        ↓
     * 55 - 21303 Hutang Pajak PPh 23
     *
     * Tidak pernah mengambil COA hutang
     * dari request frontend.
     */

    const coaPembayaran = await getCoaPembayaranPph23(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA HUTANG
     * ========================================================
     */

    if (coaPembayaran.id_coa_hutang !== PPH23_HUTANG_COA_ID) {
      throw new Error(
        `COA pembayaran PPh23 tidak sesuai. ` +
          `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `sedangkan yang diwajibkan adalah ` +
          `${PPH23_HUTANG_COA_ID} - 21303 Hutang Pajak PPh 23.`,
      );
    }

    /**
     * ========================================================
     * SAFETY GUARD COA KAS
     * ========================================================
     *
     * COA 3 = 11100 Kas adalah HEADER.
     *
     * Pembayaran harus menggunakan COA kas/bank DETAIL.
     *
     * getCoaPembayaranPph23() juga melakukan validasi:
     * - aktif
     * - is_cash = true
     * - is_header = false
     * - tipe = ASET
     * - normal_balance = DEBIT
     */

    if (coaPembayaran.id_coa_kas === PPH23_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA pembayaran PPh23 tidak boleh menggunakan " +
          "3 - 11100 Kas karena merupakan COA HEADER. " +
          "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK PPH23
     * ========================================================
     *
     * Database PPh23:
     *
     * pph23
     *
     * Kolom tanggal adalah:
     *
     * tanggal_transaksi
     *
     * Bukan:
     *
     * tanggal
     */

    const { data: pph23, error: pph23Error } = await db
      .from("pph23")
      .select(
        "id, id_vendor, jenis_jasa, nilai_transaksi, tarif_pph23, pph23_terutang, tanggal_transaksi, id_periode",
      )
      .eq("id", input.id_pph23)
      .maybeSingle();

    if (pph23Error) {
      throw new Error(`Gagal memeriksa PPh23: ${pph23Error.message}`);
    }

    if (!pph23) {
      return NextResponse.json(
        {
          error: "Data PPh23 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const pph23Data: Pph23Data = {
      id: Number(pph23.id),
      id_vendor: Number(pph23.id_vendor),
      jenis_jasa: String(pph23.jenis_jasa ?? ""),
      nilai_transaksi: Number(pph23.nilai_transaksi ?? 0),
      tarif_pph23: Number(pph23.tarif_pph23 ?? 0),
      pph23_terutang: Number(pph23.pph23_terutang ?? 0),
      tanggal_transaksi: String(pph23.tanggal_transaksi ?? ""),
      id_periode:
        pph23.id_periode === null || pph23.id_periode === undefined
          ? null
          : Number(pph23.id_periode),
    };

    if (
      !Number.isFinite(pph23Data.pph23_terutang) ||
      pph23Data.pph23_terutang <= 0
    ) {
      return NextResponse.json(
        {
          error: "Nilai PPh23 terutang tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * HITUNG PEMBAYARAN SEBELUMNYA
     * ========================================================
     *
     * Pembayaran yang sedang diedit tidak boleh
     * dihitung sebagai pembayaran lain.
     */

    const { data: pembayaranSebelumnya, error: pembayaranError } = await db
      .from("pembayaran_pph23")
      .select("id, nominal")
      .eq("id_pph23", input.id_pph23)
      .neq("id", id);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh23 sebelumnya: ${pembayaranError.message}`,
      );
    }

    const pembayaranRows: PembayaranTotalRow[] = (
      pembayaranSebelumnya ?? []
    ).map(
      (payment): PembayaranTotalRow => ({
        nominal:
          payment.nominal === null || payment.nominal === undefined
            ? null
            : Number(payment.nominal),
      }),
    );

    const totalPembayaranSebelumnya: number = pembayaranRows.reduce(
      (sum: number, payment: PembayaranTotalRow): number => {
        return sum + Number(payment.nominal ?? 0);
      },
      0,
    );

    /**
     * ========================================================
     * HITUNG SISA PPH23
     * ========================================================
     */

    const sisaPph23: number = Math.max(
      pph23Data.pph23_terutang - totalPembayaranSebelumnya,
      0,
    );

    if (sisaPph23 <= 0) {
      return NextResponse.json(
        {
          error: "PPh23 sudah lunas",
          pph23_terutang: pph23Data.pph23_terutang,
          total_pembayaran: totalPembayaranSebelumnya,
          sisa: 0,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * VALIDASI NOMINAL
     * ========================================================
     */

    if (input.nominal > sisaPph23) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh23 melebihi sisa kewajiban",
          pph23_terutang: pph23Data.pph23_terutang,
          total_pembayaran: totalPembayaranSebelumnya,
          nominal_pembayaran: input.nominal,
          sisa_pph23: sisaPph23,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * UPDATE
     * ========================================================
     *
     * Hanya tabel:
     *
     * pembayaran_pph23
     *
     * yang diubah.
     *
     * Tidak mengubah:
     *
     * - id
     * - id_jurnal
     * - created_at
     *
     * Tidak ada:
     *
     * - ppn
     * - pph4
     * - total
     * - id_coa_hutang dari frontend
     */

    const { data, error: updateError } = await db
      .from("pembayaran_pph23")
      .update({
        tanggal: input.tanggal,
        id_pph23: input.id_pph23,
        nominal: input.nominal,
        keterangan: input.keterangan.trim(),
        id_coa_kas: coaPembayaran.id_coa_kas,
      })
      .eq("id", id)
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Gagal update pembayaran PPh23");
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      message: "Pembayaran PPh23 berhasil diupdate",

      data,

      accounting: {
        /**
         * COA hutang PPh23:
         *
         * PAJAK_PPH23 / HUTANG
         *        ↓
         * 55 - 21303 Hutang Pajak PPh 23
         */

        id_coa_hutang: coaPembayaran.id_coa_hutang,

        /**
         * COA kas/bank DETAIL.
         */

        id_coa_kas: coaPembayaran.id_coa_kas,

        /**
         * Nilai kewajiban PPh23 dari tabel pph23.
         */

        pph23_terutang: pph23Data.pph23_terutang,

        /**
         * Total pembayaran LAIN
         * selain transaksi yang sedang diedit.
         */

        total_pembayaran_sebelumnya: totalPembayaranSebelumnya,

        /**
         * Nominal baru transaksi yang diedit.
         */

        nominal_pembayaran: input.nominal,

        /**
         * Sisa setelah nominal baru diperhitungkan.
         */

        sisa_pph23: Math.max(
          pph23Data.pph23_terutang - totalPembayaranSebelumnya - input.nominal,
          0,
        ),

        /**
         * Karena transaksi belum mempunyai jurnal,
         * accounting akan diposting melalui proses
         * POST pembayaran.
         */

        id_jurnal: null,
      },
    });
  } catch (error: unknown) {
    console.error("PUT PEMBAYARAN PPH23 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate pembayaran PPh23";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * DELETE
 * ============================================================
 *
 * Hapus pembayaran PPh23.
 *
 * Pembayaran yang sudah mempunyai jurnal tidak boleh
 * dihapus karena jurnal POSTED harus tetap aman.
 */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * VALIDASI PARAMETER
     * ========================================================
     */

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

    const id: number | null = parseId(parsed.data.id);

    if (id === null) {
      return NextResponse.json(
        {
          error: "ID pembayaran PPh23 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * CEK PEMBAYARAN
     * ========================================================
     */

    const { data: existing, error: existingError } = await db
      .from("pembayaran_pph23")
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh23: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh23 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const payment: PembayaranPph23Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph23: Number(existing.id_pph23),
      nominal: Number(existing.nominal ?? 0),
      keterangan: String(existing.keterangan ?? ""),
      id_coa_kas: Number(existing.id_coa_kas),
      id_jurnal:
        existing.id_jurnal === null || existing.id_jurnal === undefined
          ? null
          : Number(existing.id_jurnal),
      created_at: String(existing.created_at ?? ""),
    };

    /**
     * ========================================================
     * CEK JURNAL
     * ========================================================
     *
     * Jika sudah ada id_jurnal, transaksi sudah
     * masuk accounting.
     *
     * Jangan hapus transaksi tersebut.
     */

    if (payment.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pembayaran PPh23 sudah memiliki jurnal POSTED dan tidak dapat dihapus.",
          id_jurnal: payment.id_jurnal,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * DELETE
     * ========================================================
     */

    const { error: deleteError } = await db
      .from("pembayaran_pph23")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(
        `Gagal menghapus pembayaran PPh23: ${deleteError.message}`,
      );
    }

    return NextResponse.json({
      message: "Pembayaran PPh23 berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN PPH23 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal menghapus pembayaran PPh23";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
