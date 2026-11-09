import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPph25Schema,
  type PembayaranPph25Input,
} from "@/lib/validators/pembayaran-pph25";

import { getCoaPembayaranPph25 } from "@/lib/accounting/getcoamapping";

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

/**
 * Struktur EXACT public.pembayaran_pph25
 */
interface PembayaranPph25Row {
  id: number;
  tanggal: string;
  id_pph25: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

/**
 * Struktur EXACT public.pph25
 *
 * public.pph25:
 *
 *   id
 *   tahun
 *   bulan
 *   nilai_angsuran
 *   tanggal_setor
 *   tanggal_transaksi
 *   keterangan
 *   id_jurnal
 *   created_at
 */
interface Pph25Data {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  keterangan: string | null;
  id_jurnal: number | null;
  created_at: string;
}

interface PembayaranTotalRow {
  nominal: number | null;
}

/**
 * ============================================================
 * CONSTANT COA
 * ============================================================
 *
 * COA pembayaran PPh25:
 *
 * PAJAK_PPH25 / HUTANG
 *        ↓
 * 2508 - 21305 Hutang Pajak PPh25
 *
 * COA 2507:
 * 62005 Beban Pajak PPh25
 *
 * BUKAN COA pembayaran.
 *
 * COA 3:
 * 11100 Kas
 *
 * HEADER.
 *
 * Tidak boleh menjadi jurnal_detail.
 */

const PPH25_HUTANG_COA_ID = 2508;
const PPH25_KAS_HEADER_COA_ID = 3;

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
 * /api/pembayaran-pph25/[id]
 *
 * Mengambil satu pembayaran PPh25 berdasarkan ID.
 *
 * Database:
 *
 * public.pembayaran_pph25
 *
 * Tidak mengambil kolom yang tidak ada.
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
          error: "ID pembayaran PPh25 tidak valid",
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
      .from("pembayaran_pph25")
      .select(
        `
        id,
        tanggal,
        id_pph25,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
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
          error: "Pembayaran PPh25 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ========================================================
     * MAP RESULT
     * ========================================================
     */

    const result: PembayaranPph25Row = {
      id: Number(data.id),

      tanggal: String(data.tanggal),

      id_pph25: Number(data.id_pph25),

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
    console.error("GET PEMBAYARAN PPH25 BY ID ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pembayaran PPh25";

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
 * Update pembayaran PPh25.
 *
 * Payload:
 *
 * {
 *   tanggal,
 *   id_pph25,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 *
 * - id_coa_hutang
 * - tahun
 * - bulan
 * - nilai_angsuran
 * - tanggal_setor
 *
 * COA hutang PPh25 tetap ditentukan backend:
 *
 * PAJAK_PPH25 / HUTANG
 *        ↓
 * 2508 - 21305 Hutang Pajak PPh25
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
          error: "ID pembayaran PPh25 tidak valid",
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

    const parsedBody = pembayaranPph25Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh25 tidak valid",
          details: parsedBody.error.flatten().fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph25Input = parsedBody.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_pph25) || input.id_pph25 <= 0) {
      return NextResponse.json(
        {
          error: "ID PPh25 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran PPh25 wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran PPh25 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!input.keterangan.trim()) {
      return NextResponse.json(
        {
          error: "Keterangan pembayaran PPh25 wajib diisi",
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
      .from("pembayaran_pph25")
      .select(
        `
        id,
        tanggal,
        id_pph25,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh25: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh25 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const existingPayment: PembayaranPph25Row = {
      id: Number(existing.id),

      tanggal: String(existing.tanggal),

      id_pph25: Number(existing.id_pph25),

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
     * Jika id_jurnal sudah ada,
     * pembayaran sudah mempunyai jurnal accounting.
     *
     * Jangan mengubah transaksi tersebut.
     */

    if (existingPayment.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pembayaran PPh25 sudah memiliki jurnal POSTED dan tidak dapat diubah.",
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
     * PAJAK_PPH25 / HUTANG
     *        ↓
     * 2508 - 21305 Hutang Pajak PPh25
     *
     * Tidak pernah mengambil COA hutang
     * dari request frontend.
     */

    const coaPembayaran = await getCoaPembayaranPph25(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA HUTANG PPH25
     * ========================================================
     */

    if (coaPembayaran.id_coa_hutang !== PPH25_HUTANG_COA_ID) {
      throw new Error(
        `COA pembayaran PPh25 tidak sesuai. ` +
          `COA hutang yang diperoleh adalah ` +
          `id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `sedangkan yang diwajibkan adalah ` +
          `${PPH25_HUTANG_COA_ID} - ` +
          `21305 Hutang Pajak PPh25.`,
      );
    }

    /**
     * ========================================================
     * SAFETY GUARD COA KAS
     * ========================================================
     *
     * COA 3 = 11100 Kas adalah HEADER.
     *
     * Pembayaran harus menggunakan
     * COA kas/bank DETAIL.
     *
     * getCoaPembayaranPph25() juga melakukan
     * validasi:
     *
     * - aktif
     * - is_cash = true
     * - is_header = false
     * - tipe = ASET
     * - normal_balance = DEBIT
     */

    if (coaPembayaran.id_coa_kas === PPH25_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA pembayaran PPh25 tidak boleh menggunakan " +
          "3 - 11100 Kas karena merupakan COA HEADER. " +
          "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK PPH25
     * ========================================================
     *
     * Database EXACT public.pph25:
     *
     *   id
     *   tahun
     *   bulan
     *   nilai_angsuran
     *   tanggal_setor
     *   tanggal_transaksi
     *   keterangan
     *   id_jurnal
     *   created_at
     *
     * Tidak menggunakan:
     *
     *   id_vendor
     *   jenis_jasa
     *   nilai_transaksi
     *   tarif_pph25
     *   pph25_terutang
     *
     * karena kolom tersebut tidak ada
     * pada public.pph25 yang Anda berikan.
     */

    const { data: pph25, error: pph25Error } = await db
      .from("pph25")
      .select(
        `
        id,
        tahun,
        bulan,
        nilai_angsuran,
        tanggal_setor,
        tanggal_transaksi,
        keterangan,
        id_jurnal,
        created_at
        `,
      )
      .eq("id", input.id_pph25)
      .maybeSingle();

    if (pph25Error) {
      throw new Error(`Gagal memeriksa PPh25: ${pph25Error.message}`);
    }

    if (!pph25) {
      return NextResponse.json(
        {
          error: "Data PPh25 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ========================================================
     * MAP DATA PPH25
     * ========================================================
     */

    const pph25Data: Pph25Data = {
      id: Number(pph25.id),

      tahun: Number(pph25.tahun),

      bulan: Number(pph25.bulan),

      nilai_angsuran: Number(pph25.nilai_angsuran ?? 0),

      tanggal_setor:
        pph25.tanggal_setor === null || pph25.tanggal_setor === undefined
          ? null
          : String(pph25.tanggal_setor),

      tanggal_transaksi: String(pph25.tanggal_transaksi ?? ""),

      keterangan:
        pph25.keterangan === null || pph25.keterangan === undefined
          ? null
          : String(pph25.keterangan),

      id_jurnal:
        pph25.id_jurnal === null || pph25.id_jurnal === undefined
          ? null
          : Number(pph25.id_jurnal),

      created_at: String(pph25.created_at ?? ""),
    };

    /**
     * ========================================================
     * VALIDASI NILAI ANGSURAN
     * ========================================================
     *
     * public.pph25:
     *
     *   nilai_angsuran >= 0
     *
     * Pembayaran tidak boleh dilakukan
     * terhadap kewajiban bernilai 0.
     */

    if (
      !Number.isFinite(pph25Data.nilai_angsuran) ||
      pph25Data.nilai_angsuran <= 0
    ) {
      return NextResponse.json(
        {
          error: "Nilai angsuran PPh25 tidak valid",
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
     * Pembayaran yang sedang diedit
     * TIDAK boleh dihitung sebagai pembayaran lain.
     */

    const { data: pembayaranSebelumnya, error: pembayaranError } = await db
      .from("pembayaran_pph25")
      .select(
        `
        id,
        nominal
        `,
      )
      .eq("id_pph25", input.id_pph25)
      .neq("id", id);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh25 sebelumnya: ${pembayaranError.message}`,
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
     * HITUNG SISA PPH25
     * ========================================================
     */

    const sisaPph25: number = Math.max(
      pph25Data.nilai_angsuran - totalPembayaranSebelumnya,
      0,
    );

    /**
     * ========================================================
     * VALIDASI SUDAH LUNAS
     * ========================================================
     */

    if (sisaPph25 <= 0) {
      return NextResponse.json(
        {
          error: "PPh25 sudah lunas",

          nilai_angsuran: pph25Data.nilai_angsuran,

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
     *
     * Nominal baru tidak boleh melebihi
     * sisa kewajiban setelah transaksi
     * yang sedang diedit dikeluarkan.
     */

    if (input.nominal > sisaPph25) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh25 melebihi sisa kewajiban",

          nilai_angsuran: pph25Data.nilai_angsuran,

          total_pembayaran: totalPembayaranSebelumnya,

          nominal_pembayaran: input.nominal,

          sisa_pph25: sisaPph25,
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
     *   pembayaran_pph25
     *
     * yang diubah.
     *
     * Tidak mengubah:
     *
     *   - id
     *   - id_jurnal
     *   - created_at
     *
     * Tidak mengubah public.pph25.
     *
     * Tidak ada:
     *
     *   - id_coa_hutang dari frontend
     *   - 2507 Beban PPh25
     *   - COA 3 Kas HEADER
     */

    const { data, error: updateError } = await db
      .from("pembayaran_pph25")
      .update({
        tanggal: input.tanggal,

        id_pph25: input.id_pph25,

        nominal: input.nominal,

        keterangan: input.keterangan.trim(),

        id_coa_kas: coaPembayaran.id_coa_kas,
      })
      .eq("id", id)
      .select(
        `
        id,
        tanggal,
        id_pph25,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Gagal update pembayaran PPh25");
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      message: "Pembayaran PPh25 berhasil diupdate",

      data,

      accounting: {
        /**
         * COA hutang PPh25:
         *
         * PAJAK_PPH25 / HUTANG
         *        ↓
         * 2508 - 21305 Hutang Pajak PPh25
         */

        id_coa_hutang: coaPembayaran.id_coa_hutang,

        /**
         * COA kas/bank DETAIL.
         */

        id_coa_kas: coaPembayaran.id_coa_kas,

        /**
         * Nilai kewajiban PPh25
         * dari tabel public.pph25.
         */

        nilai_angsuran: pph25Data.nilai_angsuran,

        /**
         * Total pembayaran LAIN
         * selain transaksi yang sedang diedit.
         */

        total_pembayaran_sebelumnya: totalPembayaranSebelumnya,

        /**
         * Nominal baru transaksi
         * yang diedit.
         */

        nominal_pembayaran: input.nominal,

        /**
         * Sisa setelah nominal baru
         * diperhitungkan.
         */

        sisa_pph25: Math.max(
          pph25Data.nilai_angsuran - totalPembayaranSebelumnya - input.nominal,
          0,
        ),

        /**
         * Karena transaksi belum mempunyai
         * jurnal, id_jurnal tetap null.
         *
         * Posting accounting dilakukan
         * melalui POST pembayaran.
         */

        id_jurnal: null,
      },
    });
  } catch (error: unknown) {
    console.error("PUT PEMBAYARAN PPH25 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate pembayaran PPh25";

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
 * Hapus pembayaran PPh25.
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
          error: "ID pembayaran PPh25 tidak valid",
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
      .from("pembayaran_pph25")
      .select(
        `
        id,
        tanggal,
        id_pph25,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh25: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh25 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const payment: PembayaranPph25Row = {
      id: Number(existing.id),

      tanggal: String(existing.tanggal),

      id_pph25: Number(existing.id_pph25),

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
            "Pembayaran PPh25 sudah memiliki jurnal POSTED dan tidak dapat dihapus.",

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
      .from("pembayaran_pph25")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(
        `Gagal menghapus pembayaran PPh25: ${deleteError.message}`,
      );
    }

    return NextResponse.json({
      message: "Pembayaran PPh25 berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN PPH25 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal menghapus pembayaran PPh25";

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
