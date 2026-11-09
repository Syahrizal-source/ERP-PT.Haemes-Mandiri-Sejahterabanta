import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPph4Schema,
  type PembayaranPph4Input,
} from "@/lib/validators/pembayaran-pph4";

import { getCoaPembayaranPph4 } from "@/lib/accounting/getcoamapping";

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

interface PembayaranPph4Row {
  id: number;
  tanggal: string;
  id_pph4: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface Pph4Data {
  id: number;
  tanggal: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
}

interface PembayaranTotalRow {
  nominal: number | null;
}

/**
 * ============================================================
 * HELPER
 * ============================================================
 */

/**
 * Memastikan parameter [id] benar-benar berupa integer positif.
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
 *   /api/pembayaran-pph4/[id]
 *
 * Mengambil satu pembayaran PPh4 berdasarkan ID.
 *
 * Database:
 *
 *   pembayaran_pph4
 *
 * Tidak menggunakan:
 *
 *   - ppn
 *   - pph23
 *   - total
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
          error: "ID pembayaran PPh4 tidak valid",
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
      .from("pembayaran_pph4")
      .select(
        "id, tanggal, id_pph4, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
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
          error: "Pembayaran PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const result: PembayaranPph4Row = {
      id: Number(data.id),
      tanggal: String(data.tanggal),
      id_pph4: Number(data.id_pph4),
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
    console.error("GET PEMBAYARAN PPH4 BY ID ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pembayaran PPh4";

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
 * Update pembayaran PPh4.
 *
 * Payload:
 *
 * {
 *   tanggal,
 *   id_pph4,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 *
 *   - ppn
 *   - pph23
 *   - total
 *   - id_coa_hutang
 *
 * COA hutang PPh4 tetap ditentukan backend:
 *
 *   PAJAK_PPH4 / HUTANG
 *          ↓
 *   2504 - 21304 Hutang Pajak PPh4
 *
 * COA kas:
 *
 *   id_coa_kas
 *          ↓
 *   harus COA kas/bank DETAIL
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
          error: "ID pembayaran PPh4 tidak valid",
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

    const parsedBody = pembayaranPph4Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh4 tidak valid",
          details: parsedBody.error.flatten().fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph4Input = parsedBody.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_pph4) || input.id_pph4 <= 0) {
      return NextResponse.json(
        {
          error: "ID PPh4 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran PPh4 wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran PPh4 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!input.keterangan.trim()) {
      return NextResponse.json(
        {
          error: "Keterangan pembayaran PPh4 wajib diisi",
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
      .from("pembayaran_pph4")
      .select(
        "id, tanggal, id_pph4, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh4: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const existingPayment: PembayaranPph4Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph4: Number(existing.id_pph4),
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
            "Pembayaran PPh4 sudah memiliki jurnal POSTED dan tidak dapat diubah.",
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
     *   PAJAK_PPH4 / HUTANG
     *          ↓
     *   2504 - 21304 Hutang Pajak PPh4
     *
     * Tidak pernah mengambil COA hutang
     * dari request frontend.
     */

    const coaPembayaran = await getCoaPembayaranPph4(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA
     * ========================================================
     */

    if (coaPembayaran.id_coa_hutang !== 2504) {
      throw new Error(
        `COA pembayaran PPh4 tidak sesuai. ` +
          `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `sedangkan yang diwajibkan adalah 2504 - 21304 Hutang Pajak PPh4.`,
      );
    }

    /**
     * 2265 = Beban Pajak PPh4.
     *
     * Karena COA hutang wajib 2504,
     * 2265 otomatis tidak dapat digunakan.
     */

    if (coaPembayaran.id_coa_kas === 3) {
      throw new Error(
        "COA pembayaran PPh4 tidak boleh menggunakan " +
          "3 - 11100 Kas karena merupakan COA HEADER. " +
          "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK PPH4
     * ========================================================
     */

    const { data: pph4, error: pph4Error } = await db
      .from("pph4")
      .select("id, tanggal, nilai_transaksi, tarif_pph4, pph4_terutang")
      .eq("id", input.id_pph4)
      .maybeSingle();

    if (pph4Error) {
      throw new Error(`Gagal memeriksa PPh4: ${pph4Error.message}`);
    }

    if (!pph4) {
      return NextResponse.json(
        {
          error: "Data PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const pph4Data: Pph4Data = {
      id: Number(pph4.id),
      tanggal: String(pph4.tanggal ?? ""),
      nilai_transaksi: Number(pph4.nilai_transaksi ?? 0),
      tarif_pph4: Number(pph4.tarif_pph4 ?? 0),
      pph4_terutang: Number(pph4.pph4_terutang ?? 0),
    };

    if (
      !Number.isFinite(pph4Data.pph4_terutang) ||
      pph4Data.pph4_terutang <= 0
    ) {
      return NextResponse.json(
        {
          error: "Nilai PPh4 terutang tidak valid",
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
      .from("pembayaran_pph4")
      .select("id, nominal")
      .eq("id_pph4", input.id_pph4)
      .neq("id", id);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh4 sebelumnya: ${pembayaranError.message}`,
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
     * HITUNG SISA PPH4
     * ========================================================
     */

    const sisaPph4: number = Math.max(
      pph4Data.pph4_terutang - totalPembayaranSebelumnya,
      0,
    );

    if (sisaPph4 <= 0) {
      return NextResponse.json(
        {
          error: "PPh4 sudah lunas",
          pph4_terutang: pph4Data.pph4_terutang,
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

    if (input.nominal > sisaPph4) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh4 melebihi sisa kewajiban",
          pph4_terutang: pph4Data.pph4_terutang,
          total_pembayaran: totalPembayaranSebelumnya,
          nominal_pembayaran: input.nominal,
          sisa_pph4: sisaPph4,
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
     * Hanya tabel pembayaran_pph4.
     *
     * Tidak mengubah:
     *
     *   - id
     *   - id_jurnal
     *   - created_at
     *
     * Tidak ada:
     *
     *   - ppn
     *   - pph23
     *   - total
     */

    const { data, error: updateError } = await db
      .from("pembayaran_pph4")
      .update({
        tanggal: input.tanggal,
        id_pph4: input.id_pph4,
        nominal: input.nominal,
        keterangan: input.keterangan.trim(),
        id_coa_kas: coaPembayaran.id_coa_kas,
      })
      .eq("id", id)
      .select(
        "id, tanggal, id_pph4, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Gagal update pembayaran PPh4");
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      message: "Pembayaran PPh4 berhasil diupdate",

      data,

      accounting: {
        /**
         * COA hutang PPh4:
         *
         * PAJAK_PPH4 / HUTANG
         *        ↓
         * 2504
         */
        id_coa_hutang: coaPembayaran.id_coa_hutang,

        /**
         * COA kas/bank DETAIL.
         */
        id_coa_kas: coaPembayaran.id_coa_kas,

        pph4_terutang: pph4Data.pph4_terutang,

        total_pembayaran_sebelumnya: totalPembayaranSebelumnya,

        nominal_pembayaran: input.nominal,

        sisa_pph4: Math.max(
          pph4Data.pph4_terutang - totalPembayaranSebelumnya - input.nominal,
          0,
        ),

        /**
         * Karena transaksi belum mempunyai
         * jurnal, accounting akan diposting
         * melalui proses POST pembayaran.
         */
        id_jurnal: null,
      },
    });
  } catch (error: unknown) {
    console.error("PUT PEMBAYARAN PPH4 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate pembayaran PPh4";

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
 * Hapus pembayaran PPh4.
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
          error: "ID pembayaran PPh4 tidak valid",
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
      .from("pembayaran_pph4")
      .select(
        "id, tanggal, id_pph4, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh4: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh4 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const payment: PembayaranPph4Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph4: Number(existing.id_pph4),
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
            "Pembayaran PPh4 sudah memiliki jurnal POSTED dan tidak dapat dihapus.",
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
      .from("pembayaran_pph4")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(
        `Gagal menghapus pembayaran PPh4: ${deleteError.message}`,
      );
    }

    return NextResponse.json({
      message: "Pembayaran PPh4 berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN PPH4 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal menghapus pembayaran PPh4";

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
