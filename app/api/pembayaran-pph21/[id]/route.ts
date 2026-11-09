import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPph21Schema,
  type PembayaranPph21Input,
} from "@/lib/validators/pembayaran-pph21";

import { getCoaPembayaranPph21 } from "@/lib/accounting/getcoamapping";

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

interface PembayaranPph21Row {
  id: number;
  tanggal: string;
  id_pph21: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface Pph21Data {
  id: number;
  id_payroll: number;
  nama: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  nilai_pph21: number;
  tanggal: string;
  created_at: string;
  thr: number;
  penghasilan_bruto: number;
  status_ptkp: string;
}

interface PembayaranTotalRow {
  nominal: number | null;
}

/**
 * ============================================================
 * CONSTANT
 * ============================================================
 *
 * COA PPh21 pembayaran:
 *
 * PAJAK / HUTANG
 *        ↓
 * 54 - 21302 Hutang Pajak PPh 21
 *
 * COA 2263:
 * 62001 Beban Pajak PPh21
 *
 * BUKAN COA pembayaran.
 *
 * COA 1212:
 * 21307 Hutang PPh21 Proyek
 *
 * BUKAN COA PPh21 umum.
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
 *
 * ============================================================
 */

const PPH21_HUTANG_COA_ID = 54;
const PPH21_KAS_HEADER_COA_ID = 3;

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
 * /api/pembayaran-pph21/[id]
 *
 * Mengambil satu pembayaran PPh21 berdasarkan ID.
 *
 * Database:
 *
 * pembayaran_pph21
 *
 * Tidak menggunakan:
 *
 * - ppn
 * - pph23
 * - pph4
 * - total
 * - id_coa_hutang
 *
 * karena field tersebut bukan bagian dari payload
 * pembayaran PPh21.
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
          error: "ID pembayaran PPh21 tidak valid",
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
      .from("pembayaran_pph21")
      .select(
        "id, tanggal, id_pph21, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
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
          error: "Pembayaran PPh21 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const result: PembayaranPph21Row = {
      id: Number(data.id),
      tanggal: String(data.tanggal),
      id_pph21: Number(data.id_pph21),
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
    console.error("GET PEMBAYARAN PPH21 BY ID ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pembayaran PPh21";

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
 * Update pembayaran PPh21.
 *
 * Payload:
 *
 * {
 *   tanggal,
 *   id_pph21,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 *
 * - ppn
 * - pph23
 * - pph4
 * - total
 * - id_coa_hutang
 *
 * COA hutang PPh21 tetap ditentukan backend:
 *
 * PAJAK / HUTANG
 *        ↓
 * 54 - 21302 Hutang Pajak PPh 21
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
          error: "ID pembayaran PPh21 tidak valid",
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

    const parsedBody = pembayaranPph21Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh21 tidak valid",
          details: parsedBody.error.flatten().fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph21Input = parsedBody.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_pph21) || input.id_pph21 <= 0) {
      return NextResponse.json(
        {
          error: "ID PPh21 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran PPh21 wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran PPh21 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!input.keterangan.trim()) {
      return NextResponse.json(
        {
          error: "Keterangan pembayaran PPh21 wajib diisi",
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
      .from("pembayaran_pph21")
      .select(
        "id, tanggal, id_pph21, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh21: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh21 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const existingPayment: PembayaranPph21Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph21: Number(existing.id_pph21),
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
            "Pembayaran PPh21 sudah memiliki jurnal POSTED dan tidak dapat diubah.",
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
     * PAJAK / HUTANG
     *        ↓
     * 54 - 21302 Hutang Pajak PPh 21
     *
     * Tidak pernah mengambil COA hutang
     * dari request frontend.
     */

    const coaPembayaran = await getCoaPembayaranPph21(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA HUTANG
     * ========================================================
     */

    if (coaPembayaran.id_coa_hutang !== PPH21_HUTANG_COA_ID) {
      throw new Error(
        `COA pembayaran PPh21 tidak sesuai. ` +
          `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `sedangkan yang diwajibkan adalah ` +
          `${PPH21_HUTANG_COA_ID} - 21302 Hutang Pajak PPh 21.`,
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
     * getCoaPembayaranPph21() juga melakukan validasi:
     *
     * - aktif
     * - is_cash = true
     * - is_header = false
     * - tipe = ASET
     * - normal_balance = DEBIT
     */

    if (coaPembayaran.id_coa_kas === PPH21_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA pembayaran PPh21 tidak boleh menggunakan " +
          "3 - 11100 Kas karena merupakan COA HEADER. " +
          "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK PPH21
     * ========================================================
     *
     * Database PPh21:
     *
     * pph21
     *
     * Kolom:
     *
     *   id
     *   id_payroll
     *   nama
     *   gaji_bruto
     *   biaya_jabatan
     *   iuran
     *   tarif_pph21
     *   nilai_pph21
     *   tanggal
     *   created_at
     *   thr
     *   penghasilan_bruto
     *   status_ptkp
     */

    const { data: pph21, error: pph21Error } = await db
      .from("pph21")
      .select(
        "id, id_payroll, nama, gaji_bruto, biaya_jabatan, iuran, tarif_pph21, nilai_pph21, tanggal, created_at, thr, penghasilan_bruto, status_ptkp",
      )
      .eq("id", input.id_pph21)
      .maybeSingle();

    if (pph21Error) {
      throw new Error(`Gagal memeriksa PPh21: ${pph21Error.message}`);
    }

    if (!pph21) {
      return NextResponse.json(
        {
          error: "Data PPh21 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const pph21Data: Pph21Data = {
      id: Number(pph21.id),
      id_payroll: Number(pph21.id_payroll),
      nama: String(pph21.nama ?? ""),
      gaji_bruto: Number(pph21.gaji_bruto ?? 0),
      biaya_jabatan: Number(pph21.biaya_jabatan ?? 0),
      iuran: Number(pph21.iuran ?? 0),
      tarif_pph21: Number(pph21.tarif_pph21 ?? 0),
      nilai_pph21: Number(pph21.nilai_pph21 ?? 0),
      tanggal: String(pph21.tanggal ?? ""),
      created_at: String(pph21.created_at ?? ""),
      thr: Number(pph21.thr ?? 0),
      penghasilan_bruto: Number(pph21.penghasilan_bruto ?? 0),
      status_ptkp: String(pph21.status_ptkp ?? "TK"),
    };

    if (!Number.isFinite(pph21Data.nilai_pph21) || pph21Data.nilai_pph21 <= 0) {
      return NextResponse.json(
        {
          error: "Nilai PPh21 terutang tidak valid",
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
      .from("pembayaran_pph21")
      .select("id, nominal")
      .eq("id_pph21", input.id_pph21)
      .neq("id", id);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh21 sebelumnya: ${pembayaranError.message}`,
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
     * HITUNG SISA PPH21
     * ========================================================
     */

    const sisaPph21: number = Math.max(
      pph21Data.nilai_pph21 - totalPembayaranSebelumnya,
      0,
    );

    if (sisaPph21 <= 0) {
      return NextResponse.json(
        {
          error: "PPh21 sudah lunas",
          pph21_terutang: pph21Data.nilai_pph21,
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

    if (input.nominal > sisaPph21) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh21 melebihi sisa kewajiban",
          pph21_terutang: pph21Data.nilai_pph21,
          total_pembayaran: totalPembayaranSebelumnya,
          nominal_pembayaran: input.nominal,
          sisa_pph21: sisaPph21,
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
     * pembayaran_pph21
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
     * - pph23
     * - pph4
     * - total
     * - id_coa_hutang dari frontend
     */

    const { data, error: updateError } = await db
      .from("pembayaran_pph21")
      .update({
        tanggal: input.tanggal,
        id_pph21: input.id_pph21,
        nominal: input.nominal,
        keterangan: input.keterangan.trim(),
        id_coa_kas: coaPembayaran.id_coa_kas,
      })
      .eq("id", id)
      .select(
        "id, tanggal, id_pph21, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Gagal update pembayaran PPh21");
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json({
      message: "Pembayaran PPh21 berhasil diupdate",

      data,

      accounting: {
        /**
         * COA hutang PPh21:
         *
         * PAJAK / HUTANG
         *        ↓
         * 54 - 21302 Hutang Pajak PPh 21
         */

        id_coa_hutang: coaPembayaran.id_coa_hutang,

        /**
         * COA kas/bank DETAIL.
         */

        id_coa_kas: coaPembayaran.id_coa_kas,

        /**
         * Nilai kewajiban PPh21
         * dari tabel pph21.
         */

        pph21_terutang: pph21Data.nilai_pph21,

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
         * Sisa setelah nominal baru
         * diperhitungkan.
         */

        sisa_pph21: Math.max(
          pph21Data.nilai_pph21 - totalPembayaranSebelumnya - input.nominal,
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
    console.error("PUT PEMBAYARAN PPH21 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate pembayaran PPh21";

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
 * Hapus pembayaran PPh21.
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
          error: "ID pembayaran PPh21 tidak valid",
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
      .from("pembayaran_pph21")
      .select(
        "id, tanggal, id_pph21, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa pembayaran PPh21: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh21 tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const payment: PembayaranPph21Row = {
      id: Number(existing.id),
      tanggal: String(existing.tanggal),
      id_pph21: Number(existing.id_pph21),
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
            "Pembayaran PPh21 sudah memiliki jurnal POSTED dan tidak dapat dihapus.",
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
      .from("pembayaran_pph21")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(
        `Gagal menghapus pembayaran PPh21: ${deleteError.message}`,
      );
    }

    return NextResponse.json({
      message: "Pembayaran PPh21 berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN PPH21 ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal menghapus pembayaran PPh21";

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
