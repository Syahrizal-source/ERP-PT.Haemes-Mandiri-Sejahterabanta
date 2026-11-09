import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPph4Schema,
  type PembayaranPph4Input,
} from "@/lib/validators/pembayaran-pph4";

import { getCoaPembayaranPph4 } from "@/lib/accounting/getcoamapping";

import { postPembayaranPph4 } from "@/lib/accounting/postPembayaranPph4";

/* ============================================================
 * TYPE
 * ============================================================ */

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

interface Pph4Row {
  id: number;
  id_vendor: number;
  jenis_objek: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
  tanggal_transaksi: string;
}

interface VendorRow {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

/* ============================================================
 * CONSTANT COA
 * ============================================================ */

/**
 * Pembayaran PPh4:
 *
 * DEBIT:
 * 2504 - 21304 Hutang Pajak PPh4
 *
 * KREDIT:
 * COA Kas/Bank DETAIL pilihan pengguna.
 *
 * COA 2265 adalah Beban PPh4, bukan akun pelunasan hutang.
 * COA 3 adalah 11100 Kas HEADER dan tidak boleh digunakan.
 */
const PPH4_HUTANG_COA_ID = 2504;
const PPH4_KAS_HEADER_COA_ID = 3;

/* ============================================================
 * GET
 *
 * Mengambil riwayat pembayaran PPh4 beserta:
 * - Data PPh4
 * - Data vendor
 * - Data COA kas/bank
 * - Total pembayaran
 * - Sisa kewajiban
 * - Status pembayaran
 * ============================================================ */

export async function GET(): Promise<NextResponse> {
  try {
    const { data: paymentData, error: paymentError } = await db
      .from("pembayaran_pph4")
      .select(
        `
        id,
        tanggal,
        id_pph4,
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
        `Gagal mengambil pembayaran PPh4: ${paymentError.message}`,
      );
    }

    const rows: PembayaranPph4Row[] = (paymentData ?? []).map(
      (row): PembayaranPph4Row => ({
        id: Number(row.id),
        tanggal: String(row.tanggal),
        id_pph4: Number(row.id_pph4),
        nominal: Number(row.nominal),
        keterangan: String(row.keterangan ?? ""),
        id_coa_kas: Number(row.id_coa_kas),
        id_jurnal:
          row.id_jurnal === null || row.id_jurnal === undefined
            ? null
            : Number(row.id_jurnal),
        created_at: String(row.created_at),
      }),
    );

    /*
     * Ambil PPh4 berdasarkan ID yang ditemukan pada pembayaran.
     *
     * Kolom tanggal yang benar pada tabel pph4 adalah
     * tanggal_transaksi, bukan tanggal.
     */
    const pph4Ids: number[] = Array.from(
      new Set(
        rows
          .map((row): number => row.id_pph4)
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    const pph4Map = new Map<number, Pph4Row>();

    if (pph4Ids.length > 0) {
      const { data: pph4Data, error: pph4Error } = await db
        .from("pph4")
        .select(
          `
          id,
          id_vendor,
          jenis_objek,
          nilai_transaksi,
          tarif_pph4,
          pph4_terutang,
          tanggal_transaksi
          `,
        )
        .in("id", pph4Ids);

      if (pph4Error) {
        throw new Error(`Gagal mengambil PPh4: ${pph4Error.message}`);
      }

      for (const row of pph4Data ?? []) {
        pph4Map.set(Number(row.id), {
          id: Number(row.id),
          id_vendor: Number(row.id_vendor),
          jenis_objek: String(row.jenis_objek ?? ""),
          nilai_transaksi: Number(row.nilai_transaksi ?? 0),
          tarif_pph4: Number(row.tarif_pph4 ?? 0),
          pph4_terutang: Number(row.pph4_terutang ?? 0),
          tanggal_transaksi: String(row.tanggal_transaksi ?? ""),
        });
      }
    }

    /*
     * Ambil COA kas/bank yang digunakan oleh pembayaran.
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
          `Gagal mengambil COA pembayaran PPh4: ${coaError.message}`,
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

    /*
     * Ambil vendor berdasarkan data PPh4.
     */
    const vendorIds: number[] = Array.from(
      new Set(
        Array.from(pph4Map.values())
          .map((row): number => row.id_vendor)
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    const vendorMap = new Map<number, VendorRow>();

    if (vendorIds.length > 0) {
      const { data: vendorData, error: vendorError } = await db
        .from("vendors")
        .select(
          `
          id,
          kode_vendor,
          nama_vendor,
          npwp
          `,
        )
        .in("id", vendorIds);

      if (vendorError) {
        throw new Error(`Gagal mengambil vendor PPh4: ${vendorError.message}`);
      }

      for (const row of vendorData ?? []) {
        vendorMap.set(Number(row.id), {
          id: Number(row.id),
          kode_vendor:
            row.kode_vendor === null || row.kode_vendor === undefined
              ? null
              : String(row.kode_vendor),
          nama_vendor: String(row.nama_vendor ?? ""),
          npwp:
            row.npwp === null || row.npwp === undefined
              ? null
              : String(row.npwp),
        });
      }
    }

    /*
     * Hitung total pembayaran untuk setiap PPh4.
     */
    const totalPembayaranMap = new Map<number, number>();

    for (const payment of rows) {
      const current: number = totalPembayaranMap.get(payment.id_pph4) ?? 0;

      totalPembayaranMap.set(payment.id_pph4, current + payment.nominal);
    }

    /*
     * Gabungkan data pembayaran dan data relasinya.
     */
    const result = rows.map((payment): Record<string, unknown> => {
      const pph4: Pph4Row | undefined = pph4Map.get(payment.id_pph4);

      const vendor: VendorRow | undefined = pph4
        ? vendorMap.get(pph4.id_vendor)
        : undefined;

      const coa: CoaRow | undefined = coaMap.get(payment.id_coa_kas);

      const totalPembayaran: number =
        totalPembayaranMap.get(payment.id_pph4) ?? 0;

      const pph4Terutang: number = Number(pph4?.pph4_terutang ?? 0);

      const sisa: number = Math.max(pph4Terutang - totalPembayaran, 0);

      const status: string =
        sisa <= 0 ? "PAID" : totalPembayaran > 0 ? "PARTIAL" : "UNPAID";

      return {
        ...payment,
        pph4: pph4 ?? null,
        vendor: vendor ?? null,
        coa_kas: coa ?? null,
        pph4_terutang: pph4Terutang,
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
    console.error("GET PEMBAYARAN PPH4 ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pembayaran PPh4",
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
 * POST
 *
 * Payload:
 * {
 *   tanggal,
 *   id_pph4,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Jurnal:
 * Dr 2504 - 21304 Hutang Pajak PPh4
 * Cr COA Kas/Bank DETAIL pilihan pengguna
 * ============================================================ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* ========================================================
     * PARSE BODY
     * ======================================================== */

    const body: unknown = await req.json();

    const parsed = pembayaranPph4Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh4 tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPph4Input = parsed.data;

    /* ========================================================
     * VALIDASI DASAR
     * ======================================================== */

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
          error: "Nominal pembayaran PPh4 tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
     * VALIDASI COA
     *
     * Backend tetap menjadi penjaga utama COA.
     *
     * id_coa_hutang harus 2504.
     * id_coa_kas harus COA kas/bank DETAIL.
     * ======================================================== */

    const coaPembayaran = await getCoaPembayaranPph4(input.id_coa_kas);

    if (coaPembayaran.id_coa_hutang !== PPH4_HUTANG_COA_ID) {
      throw new Error(
        `COA hutang PPh4 tidak sesuai. ` +
          `Diperoleh id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `wajib ${PPH4_HUTANG_COA_ID} - 21304 Hutang Pajak PPh4.`,
      );
    }

    if (coaPembayaran.id_coa_kas === PPH4_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA 3 - 11100 Kas adalah HEADER. " + "Gunakan COA kas/bank DETAIL.",
      );
    }

    /* ========================================================
     * CEK DATA PPH4
     *
     * Kolom tanggal pada tabel pph4 adalah tanggal_transaksi.
     * ======================================================== */

    const { data: pph4, error: pph4Error } = await db
      .from("pph4")
      .select(
        `
        id,
        id_vendor,
        jenis_objek,
        nilai_transaksi,
        tarif_pph4,
        pph4_terutang,
        tanggal_transaksi
        `,
      )
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

    const pph4Terutang: number = Number(pph4.pph4_terutang);

    if (!Number.isFinite(pph4Terutang) || pph4Terutang <= 0) {
      return NextResponse.json(
        {
          error: "Nilai PPh4 terutang tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
     * HITUNG PEMBAYARAN SEBELUMNYA
     * ======================================================== */

    const { data: pembayaranSebelumnya, error: pembayaranSebelumnyaError } =
      await db
        .from("pembayaran_pph4")
        .select("id, nominal")
        .eq("id_pph4", input.id_pph4);

    if (pembayaranSebelumnyaError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh4 sebelumnya: ` +
          pembayaranSebelumnyaError.message,
      );
    }

    const totalPembayaranSebelumnya: number = (
      pembayaranSebelumnya ?? []
    ).reduce(
      (total: number, row): number => total + Number(row.nominal ?? 0),
      0,
    );

    const sisaPph4: number = Math.max(
      pph4Terutang - totalPembayaranSebelumnya,
      0,
    );

    /* ========================================================
     * VALIDASI STATUS PEMBAYARAN
     * ======================================================== */

    if (sisaPph4 <= 0) {
      return NextResponse.json(
        {
          error: "PPh4 sudah lunas",
          pph4_terutang: pph4Terutang,
          total_pembayaran: totalPembayaranSebelumnya,
          sisa: 0,
        },
        {
          status: 400,
        },
      );
    }

    if (input.nominal > sisaPph4 + 0.01) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh4 melebihi sisa kewajiban",
          pph4_terutang: pph4Terutang,
          total_pembayaran: totalPembayaranSebelumnya,
          sisa: sisaPph4,
          nominal_diminta: input.nominal,
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
     * SIMPAN PEMBAYARAN
     *
     * Hanya memakai kolom yang tersedia pada tabel:
     * public.pembayaran_pph4.
     * ======================================================== */

    const { data: pembayaran, error: insertError } = await db
      .from("pembayaran_pph4")
      .insert({
        tanggal: input.tanggal,
        id_pph4: input.id_pph4,
        nominal: input.nominal,
        keterangan: input.keterangan,
        id_coa_kas: input.id_coa_kas,
      })
      .select(
        `
          id,
          tanggal,
          id_pph4,
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
        insertError?.message ?? "Gagal menyimpan pembayaran PPh4",
      );
    }

    /* ========================================================
     * POST JURNAL
     *
     * Dr 2504 Hutang Pajak PPh4
     * Cr COA Kas/Bank DETAIL
     *
     * Tidak menggunakan:
     * - 2265 Beban Pajak PPh4
     * - 3 Kas HEADER
     * - PPN
     * - PPh23
     * ======================================================== */

    let jurnalId: number;

    try {
      jurnalId = await postPembayaranPph4(
        input.tanggal,
        `BYR-PPH4-${pembayaran.id}`,
        input.keterangan,
        input.nominal,
        input.id_pph4,
        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      /*
       * Pertahankan mekanisme rollback yang sudah ada:
       * jika posting jurnal gagal, hapus pembayaran baru
       * agar tidak tersisa transaksi tanpa jurnal.
       */
      const { error: deleteError } = await db
        .from("pembayaran_pph4")
        .delete()
        .eq("id", pembayaran.id);

      if (deleteError) {
        console.error("ROLLBACK PEMBAYARAN PPH4 GAGAL:", deleteError.message);
      }

      throw journalError;
    }

    /* ========================================================
     * SIMPAN ID JURNAL
     * ======================================================== */

    const { data: updatedPayment, error: updateError } = await db
      .from("pembayaran_pph4")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", pembayaran.id)
      .select(
        `
          id,
          tanggal,
          id_pph4,
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

    /* ========================================================
     * HITUNG STATUS AKHIR
     * ======================================================== */

    const totalPembayaranAkhir: number =
      totalPembayaranSebelumnya + input.nominal;

    const sisaSetelahBayar: number = Math.max(
      pph4Terutang - totalPembayaranAkhir,
      0,
    );

    const status: string = sisaSetelahBayar <= 0 ? "PAID" : "PARTIAL";

    /* ========================================================
     * RESPONSE
     * ======================================================== */

    return NextResponse.json(
      {
        message: "Pembayaran PPh4 dan jurnal berhasil dibuat",
        data: {
          ...updatedPayment,
          id_coa_hutang: PPH4_HUTANG_COA_ID,
          id_coa_kas: input.id_coa_kas,
          pph4_terutang: pph4Terutang,
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
    console.error("POST PEMBAYARAN PPH4 ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses pembayaran PPh4",
      },
      {
        status: 500,
      },
    );
  }
}
