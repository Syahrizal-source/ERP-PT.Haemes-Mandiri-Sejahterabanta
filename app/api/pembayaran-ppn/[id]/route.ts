import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPpnSchema,
  type PembayaranPpnInput,
} from "@/lib/validators/pembayaran-ppn";

import { getCoaPembayaranPpn } from "@/lib/accounting/getcoamapping";

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

interface PembayaranPpnRow {
  id: number;
  tanggal: string;
  id_ppn: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

type JenisPpn = "keluaran" | "masukan";

interface PembayaranTotalRow {
  nominal: number | null;
}

/**
 * ============================================================
 * CONSTANT
 * ============================================================
 *
 * 53 = 21301 Hutang Pajak PPN
 * 3  = 11100 Kas HEADER
 *
 * COA hutang tidak boleh datang dari frontend.
 * Backend mengambilnya dari coa_mapping:
 *
 *   PPN / HUTANG
 *        ↓
 *   53 - 21301 Hutang Pajak PPN
 */

const PPN_HUTANG_COA_ID = 53;
const PPN_KAS_HEADER_COA_ID = 3;

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
 *   /api/pembayaran-ppn/[id]
 *
 * Mengambil satu pembayaran PPN berdasarkan ID.
 *
 * Database:
 *
 *   pembayaran_ppn
 *
 * Tidak menggunakan:
 *
 *   - pembayaran_pph4
 *   - pembayaran_pph23
 *   - tabel proyek
 *
 * COA pembayaran hanya direferensikan melalui:
 *
 *   id_coa_kas
 *
 * Sedangkan COA hutang PPN ditentukan backend melalui
 * coa_mapping PPN / HUTANG.
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
          error: "ID pembayaran PPN tidak valid",
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
      .from("pembayaran_ppn")
      .select(
        "id, tanggal, id_ppn, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
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
          error: "Pembayaran PPN tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ========================================================
     * NORMALISASI RESPONSE
     * ========================================================
     */

    const result: PembayaranPpnRow = {
      id: Number(data.id),
      tanggal: String(data.tanggal),
      id_ppn: Number(data.id_ppn),
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
    console.error("GET PEMBAYARAN PPN BY ID ERROR:", error);

    const message: string =
      error instanceof Error ? error.message : "Gagal mengambil pembayaran PPN";

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
 * Update pembayaran PPN yang BELUM memiliki jurnal.
 *
 * Payload:
 *
 * {
 *   tanggal,
 *   id_ppn,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 *
 *   - id_coa_hutang
 *   - id_coa_ppn
 *   - ppn_masukan
 *   - ppn_keluaran sebagai COA
 *
 * COA hutang PPN tetap ditentukan backend:
 *
 *   PPN / HUTANG
 *        ↓
 *   53 - 21301 Hutang Pajak PPN
 *
 * COA kas:
 *
 *   id_coa_kas
 *        ↓
 *   harus COA kas/bank DETAIL
 *
 * IMPORTANT:
 *
 * Pembayaran yang sudah mempunyai id_jurnal tidak boleh
 * diedit karena jurnal accounting sudah POSTED.
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
          error: "ID pembayaran PPN tidak valid",
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

    const parsedBody = pembayaranPpnSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPN tidak valid",
          details: parsedBody.error.flatten().fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPpnInput = parsedBody.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_ppn) || input.id_ppn <= 0) {
      return NextResponse.json(
        {
          error: "ID PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran PPN wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!input.keterangan.trim()) {
      return NextResponse.json(
        {
          error: "Keterangan pembayaran PPN wajib diisi",
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
      .from("pembayaran_ppn")
      .select(
        "id, tanggal, id_ppn, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPN: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPN tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const existingPayment: PembayaranPpnRow = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_ppn: Number(existing.id_ppn),
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
            "Pembayaran PPN sudah memiliki jurnal POSTED dan tidak dapat diubah.",
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
     *   PPN / HUTANG
     *        ↓
     *   53 - 21301 Hutang Pajak PPN
     *
     * Tidak pernah mengambil COA hutang
     * dari request frontend.
     */

    const coaPembayaran = await getCoaPembayaranPpn(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA HUTANG PPN
     * ========================================================
     */

    if (coaPembayaran.id_coa_hutang !== PPN_HUTANG_COA_ID) {
      throw new Error(
        `COA pembayaran PPN tidak sesuai. ` +
          `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `sedangkan yang diwajibkan adalah ${PPN_HUTANG_COA_ID} - 21301 Hutang Pajak PPN.`,
      );
    }

    /**
     * ========================================================
     * SAFETY GUARD COA KAS
     * ========================================================
     *
     * 3 = 11100 Kas HEADER.
     *
     * COA header tidak boleh masuk jurnal_detail.
     */

    if (coaPembayaran.id_coa_kas === PPN_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA pembayaran PPN tidak boleh menggunakan " +
          "3 - 11100 Kas karena merupakan COA HEADER. " +
          "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK DATA PPN
     * ========================================================
     *
     * Struktur tabel public.ppn:
     *
     *   id
     *   id_transaksi
     *   jenis_ppn
     *   nilai_dasar
     *   tarif_ppn
     *   nilai_ppn
     *   tanggal_transaksi
     *   nomor_seri
     *   vendor_id
     *   keterangan
     *   nilai_transaksi
     *
     * Tidak menggunakan kolom "tanggal" karena tabel PPN
     * menggunakan "tanggal_transaksi".
     */

    const { data: ppn, error: ppnError } = await db
      .from("ppn")
      .select("id, id_transaksi, jenis_ppn, nilai_dasar, tarif_ppn, nilai_ppn")
      .eq("id", input.id_ppn)
      .maybeSingle();

    if (ppnError) {
      throw new Error(`Gagal memeriksa PPN: ${ppnError.message}`);
    }

    if (!ppn) {
      return NextResponse.json(
        {
          error: "Data PPN tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ========================================================
     * DATA PPN
     * ========================================================
     *
     * Hasil query Supabase dinormalisasi ke primitive TypeScript.
     * Ini menghindari konflik narrowing pada object hasil query.
     */

    interface PpnDbRow {
      id: number;
      id_transaksi: number;
      jenis_ppn: JenisPpn;
      nilai_dasar: number;
      tarif_ppn: number;
      nilai_ppn: number;
    }

    const ppnData: PpnDbRow = {
      id: Number(ppn.id),
      id_transaksi: Number(ppn.id_transaksi),
      jenis_ppn:
        ppn.jenis_ppn === "keluaran" || ppn.jenis_ppn === "masukan"
          ? ppn.jenis_ppn
          : (() => {
              throw new Error(
                `Jenis PPN tidak valid pada database: ${String(ppn.jenis_ppn ?? "")}`,
              );
            })(),
      nilai_dasar: Number(ppn.nilai_dasar),
      tarif_ppn: Number(ppn.tarif_ppn),
      nilai_ppn: Number(ppn.nilai_ppn),
    };

    if (!Number.isInteger(ppnData.id) || ppnData.id <= 0) {
      throw new Error("ID PPN pada database tidak valid");
    }

    if (!Number.isInteger(ppnData.id_transaksi) || ppnData.id_transaksi <= 0) {
      throw new Error("ID transaksi PPN pada database tidak valid");
    }

    /**
     * ========================================================
     * VALIDASI NILAI PPN
     * ========================================================
     */

    if (!Number.isFinite(ppnData.nilai_ppn) || ppnData.nilai_ppn <= 0) {
      return NextResponse.json(
        {
          error: "Nilai PPN terutang tidak valid",
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
      .from("pembayaran_ppn")
      .select("id, nominal")
      .eq("id_ppn", input.id_ppn)
      .neq("id", id);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran PPN sebelumnya: ${pembayaranError.message}`,
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
     * HITUNG SISA PPN
     * ========================================================
     */

    const sisaPpn: number = Math.max(
      ppnData.nilai_ppn - totalPembayaranSebelumnya,
      0,
    );

    /**
     * ========================================================
     * CEK SUDAH LUNAS
     * ========================================================
     */

    if (sisaPpn <= 0) {
      return NextResponse.json(
        {
          error: "PPN sudah lunas",
          nilai_ppn: ppnData.nilai_ppn,
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

    if (input.nominal > sisaPpn) {
      return NextResponse.json(
        {
          error: "Pembayaran PPN melebihi sisa kewajiban",
          nilai_ppn: ppnData.nilai_ppn,
          total_pembayaran: totalPembayaranSebelumnya,
          nominal_pembayaran: input.nominal,
          sisa_ppn: sisaPpn,
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
     * Hanya tabel pembayaran_ppn.
     *
     * Tidak mengubah:
     *
     *   - id
     *   - id_jurnal
     *   - created_at
     *
     * Tidak mengubah tabel:
     *
     *   - ppn
     *   - jurnal
     *   - jurnal_detail
     *
     * Karena transaksi ini belum mempunyai jurnal.
     */

    const { data, error: updateError } = await db
      .from("pembayaran_ppn")
      .update({
        tanggal: input.tanggal,
        id_ppn: input.id_ppn,
        nominal: input.nominal,
        keterangan: input.keterangan.trim(),
        id_coa_kas: coaPembayaran.id_coa_kas,
      })
      .eq("id", id)
      .select(
        "id, tanggal, id_ppn, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Gagal update pembayaran PPN");
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      message: "Pembayaran PPN berhasil diupdate",

      data,

      accounting: {
        /**
         * COA hutang PPN:
         *
         * PPN / HUTANG
         *      ↓
         * 53 - 21301 Hutang Pajak PPN
         */
        id_coa_hutang: coaPembayaran.id_coa_hutang,

        /**
         * COA kas/bank DETAIL.
         */
        id_coa_kas: coaPembayaran.id_coa_kas,

        /**
         * Informasi PPN.
         */
        id_ppn: ppnData.id,
        id_transaksi: ppnData.id_transaksi,
        jenis_ppn: ppnData.jenis_ppn,
        nilai_dasar: ppnData.nilai_dasar,
        tarif_ppn: ppnData.tarif_ppn,
        nilai_ppn: ppnData.nilai_ppn,

        /**
         * Informasi pembayaran.
         */
        total_pembayaran_sebelumnya: totalPembayaranSebelumnya,
        nominal_pembayaran: input.nominal,

        sisa_ppn: Math.max(
          ppnData.nilai_ppn - totalPembayaranSebelumnya - input.nominal,
          0,
        ),

        /**
         * Karena transaksi belum mempunyai jurnal,
         * accounting akan diposting melalui proses
         * POST pembayaran PPN.
         */
        id_jurnal: null,
      },
    });
  } catch (error: unknown) {
    console.error("PUT PEMBAYARAN PPN ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate pembayaran PPN";

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
 * Hapus pembayaran PPN.
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
          error: "ID pembayaran PPN tidak valid",
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
      .from("pembayaran_ppn")
      .select(
        "id, tanggal, id_ppn, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPN: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPN tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const payment: PembayaranPpnRow = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_ppn: Number(existing.id_ppn),
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
            "Pembayaran PPN sudah memiliki jurnal POSTED dan tidak dapat dihapus.",
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
     *
     * Karena id_jurnal masih NULL, transaksi belum
     * masuk jurnal accounting.
     */

    const { error: deleteError } = await db
      .from("pembayaran_ppn")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Gagal menghapus pembayaran PPN: ${deleteError.message}`);
    }

    return NextResponse.json({
      message: "Pembayaran PPN berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN PPN ERROR:", error);

    const message: string =
      error instanceof Error ? error.message : "Gagal menghapus pembayaran PPN";

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
