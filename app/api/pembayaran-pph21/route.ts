import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPph21Schema,
  type PembayaranPph21Input,
} from "@/lib/validators/pembayaran-pph21";

import { getCoaPembayaranPph21 } from "@/lib/accounting/getcoamapping";

import { postPembayaranPph21 } from "@/lib/accounting/postPembayaranPph21";

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

interface Pph21Row {
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

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

/**
 * ============================================================
 * CONSTANT COA
 * ============================================================
 *
 * Pembayaran PPh21:
 *
 * DEBIT
 *   54 - 21302 Hutang Pajak PPh 21
 *
 * KREDIT
 *   COA Kas/Bank DETAIL pilihan user
 *
 * Source of truth tetap:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PAJAK / HUTANG
 *       -> 54
 *       -> 21302 Hutang Pajak PPh 21
 *
 * COA yang TIDAK digunakan:
 *
 *   2263 - 62001 Beban Pajak PPh21
 *   1212 - 21307 Hutang PPh21 Proyek
 *   2722 - 21300 Utang Pajak HEADER
 *   3 - 11100 Kas HEADER
 */

const PPH21_HUTANG_COA_ID = 54;
const PPH21_KAS_HEADER_COA_ID = 3;

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Mengambil riwayat pembayaran PPh21.
 *
 * Struktur:
 *
 * public.pembayaran_pph21
 *
 *   id
 *   tanggal
 *   id_pph21
 *   nominal
 *   keterangan
 *   id_coa_kas
 *   id_jurnal
 *   created_at
 *
 * Relasi:
 *
 * pembayaran_pph21.id_pph21
 *       ↓
 * pph21.id
 *
 * Tidak menggunakan:
 *
 *   ppn
 *   pph23
 *   pph4
 *   total
 *   id_coa_hutang
 *
 * karena kolom tersebut tidak ada pada
 * tabel pembayaran_pph21.
 */

export async function GET(): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * AMBIL PEMBAYARAN PPH21
     * ========================================================
     */

    const { data: paymentData, error: paymentError } = await db
      .from("pembayaran_pph21")
      .select(
        `
        id,
        tanggal,
        id_pph21,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .order("tanggal", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (paymentError) {
      throw new Error(
        `Gagal mengambil pembayaran PPh21: ${paymentError.message}`,
      );
    }

    const rows: PembayaranPph21Row[] = (paymentData ?? []).map(
      (row): PembayaranPph21Row => ({
        id: Number(row.id),
        tanggal: String(row.tanggal),
        id_pph21: Number(row.id_pph21),
        nominal: Number(row.nominal),
        keterangan: String(row.keterangan ?? ""),
        id_coa_kas: Number(row.id_coa_kas),
        id_jurnal:
          row.id_jurnal === null || row.id_jurnal === undefined
            ? null
            : Number(row.id_jurnal),
        created_at: String(row.created_at ?? ""),
      }),
    );

    /**
     * ========================================================
     * AMBIL ID PPH21
     * ========================================================
     */

    const pph21Ids: number[] = Array.from(
      new Set(
        rows
          .map((row): number => row.id_pph21)
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    /**
     * ========================================================
     * MAP PPH21
     * ========================================================
     */

    const pph21Map = new Map<number, Pph21Row>();

    if (pph21Ids.length > 0) {
      const { data: pph21Data, error: pph21Error } = await db
        .from("pph21")
        .select(
          `
            id,
            id_payroll,
            nama,
            gaji_bruto,
            biaya_jabatan,
            iuran,
            tarif_pph21,
            nilai_pph21,
            tanggal,
            created_at,
            thr,
            penghasilan_bruto,
            status_ptkp
            `,
        )
        .in("id", pph21Ids);

      if (pph21Error) {
        throw new Error(`Gagal mengambil PPh21: ${pph21Error.message}`);
      }

      for (const row of pph21Data ?? []) {
        pph21Map.set(Number(row.id), {
          id: Number(row.id),
          id_payroll: Number(row.id_payroll),
          nama: String(row.nama ?? ""),
          gaji_bruto: Number(row.gaji_bruto ?? 0),
          biaya_jabatan: Number(row.biaya_jabatan ?? 0),
          iuran: Number(row.iuran ?? 0),
          tarif_pph21: Number(row.tarif_pph21 ?? 0),
          nilai_pph21: Number(row.nilai_pph21 ?? 0),
          tanggal: String(row.tanggal ?? ""),
          created_at: String(row.created_at ?? ""),
          thr: Number(row.thr ?? 0),
          penghasilan_bruto: Number(row.penghasilan_bruto ?? 0),
          status_ptkp: String(row.status_ptkp ?? "TK"),
        });
      }
    }

    /**
     * ========================================================
     * AMBIL COA KAS/BANK
     * ========================================================
     *
     * Tidak hardcode nama rekening.
     *
     * COA diambil berdasarkan id_coa_kas
     * yang tersimpan pada pembayaran_pph21.
     */

    const coaIds: number[] = Array.from(
      new Set(
        rows
          .map((row): number => row.id_coa_kas)
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    const coaMap = new Map<number, CoaRow>();

    if (coaIds.length > 0) {
      const { data: coaData, error: coaError } = await db
        .from("coa")
        .select(
          `
            id_coa,
            kode,
            nama,
            aktif,
            is_cash,
            is_header
            `,
        )
        .in("id_coa", coaIds);

      if (coaError) {
        throw new Error(
          `Gagal mengambil COA pembayaran PPh21: ${coaError.message}`,
        );
      }

      for (const row of coaData ?? []) {
        coaMap.set(Number(row.id_coa), {
          id_coa: Number(row.id_coa),
          kode: String(row.kode ?? ""),
          nama: String(row.nama ?? ""),
          aktif: row.aktif === true,
          is_cash: row.is_cash === true,
          is_header: row.is_header === true,
        });
      }
    }

    /**
     * ========================================================
     * HITUNG TOTAL PEMBAYARAN PER PPH21
     * ========================================================
     */

    const totalPembayaranMap = new Map<number, number>();

    for (const payment of rows) {
      const current: number = totalPembayaranMap.get(payment.id_pph21) ?? 0;

      totalPembayaranMap.set(payment.id_pph21, current + payment.nominal);
    }

    /**
     * ========================================================
     * HASIL
     * ========================================================
     */

    const result = rows.map((payment): Record<string, unknown> => {
      const pph21: Pph21Row | undefined = pph21Map.get(payment.id_pph21);

      const coa: CoaRow | undefined = coaMap.get(payment.id_coa_kas);

      const totalPembayaran: number =
        totalPembayaranMap.get(payment.id_pph21) ?? 0;

      /**
       * Untuk pembayaran PPh21:
       *
       * nilai_pph21 = kewajiban PPh21
       */

      const pph21Terutang: number = Number(pph21?.nilai_pph21 ?? 0);

      const sisa: number = Math.max(pph21Terutang - totalPembayaran, 0);

      const status: string =
        sisa <= 0 ? "PAID" : totalPembayaran > 0 ? "PARTIAL" : "UNPAID";

      return {
        ...payment,

        pph21: pph21 ?? null,

        coa_kas: coa ?? null,

        pph21_terutang: pph21Terutang,

        total_pembayaran: totalPembayaran,

        sisa,

        status,

        status_label:
          status === "PAID"
            ? "Lunas"
            : status === "PARTIAL"
              ? "Sebagian"
              : "Belum Dibayar",
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN PPH21 ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pembayaran PPh21",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Membuat pembayaran PPh21.
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
 *   ppn
 *   pph23
 *   pph4
 *   total
 *   id_coa_hutang
 *
 * COA hutang ditentukan backend.
 *
 * Jurnal:
 *
 *   Dr 54 - 21302 Hutang Pajak PPh 21
 *   Cr COA Kas/Bank DETAIL
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * PARSE BODY
     * ========================================================
     */

    const body: unknown = await req.json();

    const parsed = pembayaranPph21Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh21 tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph21Input = parsed.data;

    /**
     * ========================================================
     * VALIDASI DASAR
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
          error: "COA kas/bank wajib dipilih",
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

    /**
     * ========================================================
     * VALIDASI COA
     * ========================================================
     *
     * Backend tetap menjadi penjaga utama COA.
     *
     * Hasil wajib:
     *
     *   id_coa_hutang = 54
     *   id_coa_kas    = COA kas/bank DETAIL
     *
     * Source of truth:
     *
     *   public.coa_mapping
     */

    const coaPembayaran = await getCoaPembayaranPph21(input.id_coa_kas);

    /**
     * ========================================================
     * SAFETY GUARD COA HUTANG PPH21
     * ========================================================
     *
     * Wajib:
     *
     *   54 - 21302 Hutang Pajak PPh 21
     */

    if (coaPembayaran.id_coa_hutang !== PPH21_HUTANG_COA_ID) {
      throw new Error(
        `COA hutang PPh21 tidak sesuai. ` +
          `Diperoleh id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `wajib ${PPH21_HUTANG_COA_ID} - ` +
          `21302 Hutang Pajak PPh 21.`,
      );
    }

    /**
     * ========================================================
     * SAFETY GUARD COA KAS HEADER
     * ========================================================
     *
     * COA:
     *
     *   3 - 11100 Kas
     *
     * adalah HEADER.
     *
     * Tidak boleh menjadi jurnal_detail.
     */

    if (coaPembayaran.id_coa_kas === PPH21_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA 3 - 11100 Kas adalah HEADER. " + "Gunakan COA kas/bank DETAIL.",
      );
    }

    /**
     * ========================================================
     * CEK PPH21
     * ========================================================
     *
     * Struktur public.pph21:
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
        `
        id,
        id_payroll,
        nama,
        gaji_bruto,
        biaya_jabatan,
        iuran,
        tarif_pph21,
        nilai_pph21,
        tanggal,
        created_at,
        thr,
        penghasilan_bruto,
        status_ptkp
        `,
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

    /**
     * ========================================================
     * VALIDASI PPH21 TERUTANG
     * ========================================================
     *
     * Pada database PPh21:
     *
     *   nilai_pph21
     *
     * merupakan nilai PPh21 yang harus dilunasi.
     */

    const pph21Terutang: number = Number(pph21.nilai_pph21);

    if (!Number.isFinite(pph21Terutang) || pph21Terutang <= 0) {
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
     */

    const { data: pembayaranSebelumnya, error: pembayaranSebelumnyaError } =
      await db
        .from("pembayaran_pph21")
        .select("id, nominal")
        .eq("id_pph21", input.id_pph21);

    if (pembayaranSebelumnyaError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh21 sebelumnya: ` +
          `${pembayaranSebelumnyaError.message}`,
      );
    }

    const totalPembayaranSebelumnya: number = (
      pembayaranSebelumnya ?? []
    ).reduce(
      (total: number, row): number => total + Number(row.nominal ?? 0),
      0,
    );

    /**
     * ========================================================
     * HITUNG SISA PPH21
     * ========================================================
     */

    const sisaPph21: number = Math.max(
      pph21Terutang - totalPembayaranSebelumnya,
      0,
    );

    /**
     * ========================================================
     * VALIDASI STATUS
     * ========================================================
     */

    if (sisaPph21 <= 0) {
      return NextResponse.json(
        {
          error: "PPh21 sudah lunas",

          pph21_terutang: pph21Terutang,

          total_pembayaran: totalPembayaranSebelumnya,

          sisa: 0,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Jangan sampai pembayaran melebihi
     * kewajiban PPh21.
     */

    if (input.nominal > sisaPph21 + 0.01) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh21 melebihi sisa kewajiban",

          pph21_terutang: pph21Terutang,

          total_pembayaran: totalPembayaranSebelumnya,

          sisa: sisaPph21,

          nominal_diminta: input.nominal,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * SIMPAN PEMBAYARAN
     * ========================================================
     *
     * Hanya kolom yang benar-benar ada
     * pada public.pembayaran_pph21.
     *
     * Tidak menyimpan:
     *
     *   ppn
     *   pph23
     *   pph4
     *   total
     *   id_coa_hutang
     */

    const { data: pembayaran, error: insertError } = await db
      .from("pembayaran_pph21")
      .insert({
        tanggal: input.tanggal,
        id_pph21: input.id_pph21,
        nominal: input.nominal,
        keterangan: input.keterangan,
        id_coa_kas: input.id_coa_kas,
      })
      .select(
        `
        id,
        tanggal,
        id_pph21,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .single();

    if (insertError || !pembayaran) {
      throw new Error(
        insertError?.message ?? "Gagal menyimpan pembayaran PPh21",
      );
    }

    /**
     * ========================================================
     * POST JURNAL
     * ========================================================
     *
     * postPembayaranPph21:
     *
     *   Dr 54 - 21302 Hutang Pajak PPh 21
     *   Cr COA Kas/Bank DETAIL
     *
     * Tidak menggunakan:
     *
     *   - 2263 Beban Pajak PPh21
     *   - 1212 Hutang PPh21 Proyek
     *   - 3 Kas HEADER
     *   - 2722 Utang Pajak HEADER
     *   - PPN
     *   - PPh23
     *   - PPh4
     */

    let jurnalId: number;

    try {
      jurnalId = await postPembayaranPph21(
        input.tanggal,

        `BYR-PPH21-${pembayaran.id}`,

        input.keterangan,

        input.nominal,

        input.id_pph21,

        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      /**
       * Jika posting jurnal gagal,
       * hapus transaksi pembayaran yang baru dibuat
       * supaya tidak ada pembayaran tanpa jurnal.
       */

      await db.from("pembayaran_pph21").delete().eq("id", pembayaran.id);

      throw journalError;
    }

    /**
     * ========================================================
     * SIMPAN ID JURNAL
     * ========================================================
     */

    const { data: updatedPayment, error: updateError } = await db
      .from("pembayaran_pph21")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", pembayaran.id)
      .select(
        `
        id,
        tanggal,
        id_pph21,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .single();

    if (updateError || !updatedPayment) {
      throw new Error(
        updateError?.message ??
          "Jurnal berhasil dibuat tetapi id_jurnal gagal disimpan",
      );
    }

    /**
     * ========================================================
     * STATUS AKHIR
     * ========================================================
     */

    const totalPembayaranAkhir: number =
      totalPembayaranSebelumnya + input.nominal;

    const sisaSetelahBayar: number = Math.max(
      pph21Terutang - totalPembayaranAkhir,
      0,
    );

    const status: string = sisaSetelahBayar <= 0 ? "PAID" : "PARTIAL";

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json(
      {
        message: "Pembayaran PPh21 dan jurnal berhasil dibuat",

        data: {
          ...updatedPayment,

          /**
           * COA hutang ditentukan backend.
           *
           * Database:
           *
           * PAJAK / HUTANG
           *       ↓
           * 54
           *       ↓
           * 21302 Hutang Pajak PPh 21
           */

          id_coa_hutang: PPH21_HUTANG_COA_ID,

          /**
           * COA kas/bank DETAIL pilihan user.
           */

          id_coa_kas: input.id_coa_kas,

          pph21_terutang: pph21Terutang,

          total_pembayaran: totalPembayaranAkhir,

          sisa: sisaSetelahBayar,

          status,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN PPH21 ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses pembayaran PPh21",
      },
      {
        status: 500,
      },
    );
  }
}
