import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pembayaranPpnSchema,
  type PembayaranPpnInput,
} from "@/lib/validators/pembayaran-ppn";

import { getCoaPembayaranPpn } from "@/lib/accounting/getcoamapping";

import { postPembayaranPpn } from "@/lib/accounting/postPembayaranPpn";

/* ============================================================
 * TYPE
 * ============================================================ */

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

interface PpnRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
  nomor_seri: string | null;
  vendor_id: number | null;
  keterangan: string | null;
  nilai_transaksi: number;
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

/*
 * Pembayaran PPN:
 *
 * DEBIT
 *   53 - 21301 Hutang Pajak PPN
 *
 * KREDIT
 *   COA Kas/Bank DETAIL pilihan user
 *
 * COA yang tidak boleh digunakan:
 *
 *   2380 - 12020 PPN Masukan
 *   2266 - 62004 Beban Pajak PPN
 *   3    - 11100 Kas HEADER
 *   2722 - 21300 Utang Pajak HEADER
 *   1210 - 21306 Hutang PPN Proyek
 *
 * ID 53 tetap divalidasi kembali terhadap hasil
 * getCoaPembayaranPpn(), yang mengambil source of truth
 * dari coa_mapping.
 */

const PPN_HUTANG_COA_ID = 53;
const PPN_KAS_HEADER_COA_ID = 3;

/* ============================================================
 * GET
 *
 * Mengambil riwayat pembayaran PPN.
 *
 * Struktur public.pembayaran_ppn:
 *
 *   id
 *   tanggal
 *   id_ppn
 *   nominal
 *   keterangan
 *   id_coa_kas
 *   id_jurnal
 *   created_at
 *
 * Relasi:
 *
 *   pembayaran_ppn.id_ppn
 *       ↓
 *   ppn.id
 *
 *   pembayaran_ppn.id_coa_kas
 *       ↓
 *   coa.id_coa
 * ============================================================ */

export async function GET(): Promise<NextResponse> {
  try {
    // ========================================================
    // AMBIL PEMBAYARAN PPN
    // ========================================================

    const { data: paymentData, error: paymentError } = await db
      .from("pembayaran_ppn")
      .select(
        `
        id,
        tanggal,
        id_ppn,
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
        `Gagal mengambil pembayaran PPN: ${paymentError.message}`,
      );
    }

    // ========================================================
    // NORMALISASI PEMBAYARAN
    // ========================================================

    const rows: PembayaranPpnRow[] = (paymentData ?? []).map(
      (row): PembayaranPpnRow => ({
        id: Number(row.id),
        tanggal: String(row.tanggal),
        id_ppn: Number(row.id_ppn),
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

    // ========================================================
    // AMBIL DATA PPN TERKAIT
    // ========================================================

    const ppnIds: number[] = Array.from(
      new Set(
        rows
          .map((row): number => row.id_ppn)
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    const ppnMap = new Map<number, PpnRow>();

    if (ppnIds.length > 0) {
      const { data: ppnData, error: ppnError } = await db
        .from("ppn")
        .select(
          `
          id,
          id_transaksi,
          jenis_ppn,
          nilai_dasar,
          tarif_ppn,
          nilai_ppn,
          tanggal_transaksi,
          nomor_seri,
          vendor_id,
          keterangan,
          nilai_transaksi
          `,
        )
        .in("id", ppnIds);

      if (ppnError) {
        throw new Error(`Gagal mengambil data PPN: ${ppnError.message}`);
      }

      for (const row of ppnData ?? []) {
        const jenisPpn =
          String(row.jenis_ppn) === "masukan" ? "masukan" : "keluaran";

        ppnMap.set(Number(row.id), {
          id: Number(row.id),
          id_transaksi: Number(row.id_transaksi),
          jenis_ppn: jenisPpn,
          nilai_dasar: Number(row.nilai_dasar ?? 0),
          tarif_ppn: Number(row.tarif_ppn ?? 0),
          nilai_ppn: Number(row.nilai_ppn ?? 0),
          tanggal_transaksi: String(row.tanggal_transaksi ?? ""),
          nomor_seri:
            row.nomor_seri === null || row.nomor_seri === undefined
              ? null
              : String(row.nomor_seri),
          vendor_id:
            row.vendor_id === null || row.vendor_id === undefined
              ? null
              : Number(row.vendor_id),
          keterangan:
            row.keterangan === null || row.keterangan === undefined
              ? null
              : String(row.keterangan),
          nilai_transaksi: Number(row.nilai_transaksi ?? 0),
        });
      }
    }

    // ========================================================
    // AMBIL COA KAS/BANK
    // ========================================================

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
          `Gagal mengambil COA pembayaran PPN: ${coaError.message}`,
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

    // ========================================================
    // AMBIL VENDOR
    // ========================================================

    const vendorIds: number[] = Array.from(
      new Set(
        Array.from(ppnMap.values())
          .map((row): number => row.vendor_id ?? 0)
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
        throw new Error(`Gagal mengambil vendor PPN: ${vendorError.message}`);
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

    // ========================================================
    // HITUNG TOTAL PEMBAYARAN PER PPN
    // ========================================================

    const totalPembayaranMap = new Map<number, number>();

    for (const payment of rows) {
      const current = totalPembayaranMap.get(payment.id_ppn) ?? 0;

      totalPembayaranMap.set(payment.id_ppn, current + payment.nominal);
    }

    // ========================================================
    // BENTUK RESPONSE
    // ========================================================

    const result = rows.map((payment): Record<string, unknown> => {
      const ppn: PpnRow | undefined = ppnMap.get(payment.id_ppn);

      const vendor: VendorRow | undefined = ppn?.vendor_id
        ? vendorMap.get(ppn.vendor_id)
        : undefined;

      const coa: CoaRow | undefined = coaMap.get(payment.id_coa_kas);

      const totalPembayaran: number =
        totalPembayaranMap.get(payment.id_ppn) ?? 0;

      const ppnTerutang: number = Number(ppn?.nilai_ppn ?? 0);

      const sisa: number = Math.max(ppnTerutang - totalPembayaran, 0);

      const status: string =
        sisa <= 0 ? "PAID" : totalPembayaran > 0 ? "PARTIAL" : "UNPAID";

      return {
        ...payment,

        ppn: ppn ?? null,

        vendor: vendor ?? null,

        coa_kas: coa ?? null,

        nilai_ppn: ppnTerutang,

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
    console.error("GET PEMBAYARAN PPN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pembayaran PPN",
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
 * Membuat pembayaran PPN.
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
 * Jurnal:
 *
 *   Dr 53 - 21301 Hutang Pajak PPN
 *   Cr COA Kas/Bank DETAIL
 *
 * Tidak ada:
 *
 *   - PPN Masukan sebagai debit pembayaran
 *   - Beban PPN
 *   - Hutang PPN Proyek
 *   - PPh23
 *   - PPh4
 *   - id_coa_hutang dari client
 * ============================================================ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ========================================================
    // PARSE BODY
    // ========================================================

    const body: unknown = await req.json();

    const parsed = pembayaranPpnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPN tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranPpnInput = parsed.data;

    // ========================================================
    // VALIDASI DASAR
    // ========================================================

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
          error: "Nominal pembayaran PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // VALIDASI COA
    // ========================================================
    //
    // Backend menjadi penjaga utama COA.
    //
    // Source of truth:
    //
    //   coa_mapping
    //       ↓
    //   PPN / HUTANG
    //       ↓
    //   53 - 21301 Hutang Pajak PPN
    //
    // COA kas berasal dari pilihan user dan divalidasi
    // sebagai COA kas/bank DETAIL.
    // ========================================================

    const coaPembayaran = await getCoaPembayaranPpn(input.id_coa_kas);

    if (coaPembayaran.id_coa_hutang !== PPN_HUTANG_COA_ID) {
      throw new Error(
        `COA hutang PPN tidak sesuai. ` +
          `Diperoleh id_coa=${coaPembayaran.id_coa_hutang}, ` +
          `wajib ${PPN_HUTANG_COA_ID} - 21301 Hutang Pajak PPN.`,
      );
    }

    if (coaPembayaran.id_coa_kas === PPN_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA 3 - 11100 Kas adalah HEADER. " + "Gunakan COA kas/bank DETAIL.",
      );
    }

    // ========================================================
    // CEK DATA PPN
    // ========================================================

    const { data: ppn, error: ppnError } = await db
      .from("ppn")
      .select(
        `
        id,
        id_transaksi,
        jenis_ppn,
        nilai_dasar,
        tarif_ppn,
        nilai_ppn,
        tanggal_transaksi,
        nomor_seri,
        vendor_id,
        keterangan,
        nilai_transaksi
        `,
      )
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

    // ========================================================
    // VALIDASI NILAI PPN
    // ========================================================

    const nilaiPpn: number = Number(ppn.nilai_ppn);

    if (!Number.isFinite(nilaiPpn) || nilaiPpn <= 0) {
      return NextResponse.json(
        {
          error: "Nilai PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // HITUNG PEMBAYARAN SEBELUMNYA
    // ========================================================

    const { data: pembayaranSebelumnya, error: pembayaranSebelumnyaError } =
      await db
        .from("pembayaran_ppn")
        .select("id, nominal")
        .eq("id_ppn", input.id_ppn);

    if (pembayaranSebelumnyaError) {
      throw new Error(
        `Gagal menghitung pembayaran PPN sebelumnya: ${pembayaranSebelumnyaError.message}`,
      );
    }

    const totalPembayaranSebelumnya: number = (
      pembayaranSebelumnya ?? []
    ).reduce(
      (total: number, row): number => total + Number(row.nominal ?? 0),
      0,
    );

    const sisaPpn: number = Math.max(nilaiPpn - totalPembayaranSebelumnya, 0);

    // ========================================================
    // VALIDASI STATUS
    // ========================================================

    if (sisaPpn <= 0) {
      return NextResponse.json(
        {
          error: "PPN sudah lunas",
          nilai_ppn: nilaiPpn,
          total_pembayaran: totalPembayaranSebelumnya,
          sisa: 0,
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // VALIDASI NOMINAL PEMBAYARAN
    // ========================================================

    if (input.nominal > sisaPpn + 0.01) {
      return NextResponse.json(
        {
          error: "Pembayaran PPN melebihi sisa kewajiban",
          nilai_ppn: nilaiPpn,
          total_pembayaran: totalPembayaranSebelumnya,
          sisa: sisaPpn,
          nominal_diminta: input.nominal,
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // SIMPAN PEMBAYARAN
    // ========================================================
    //
    // Hanya menggunakan kolom yang memang ada pada
    // public.pembayaran_ppn.
    //
    // Tidak menyimpan:
    //   - id_coa_hutang
    //   - ppn
    //   - pph23
    //   - pph4
    //   - total
    // ========================================================

    const { data: pembayaran, error: insertError } = await db
      .from("pembayaran_ppn")
      .insert({
        tanggal: input.tanggal,

        id_ppn: input.id_ppn,

        nominal: input.nominal,

        keterangan: input.keterangan,

        id_coa_kas: input.id_coa_kas,
      })
      .select(
        `
        id,
        tanggal,
        id_ppn,
        nominal,
        keterangan,
        id_coa_kas,
        id_jurnal,
        created_at
        `,
      )
      .single();

    if (insertError || !pembayaran) {
      throw new Error(insertError?.message ?? "Gagal menyimpan pembayaran PPN");
    }

    // ========================================================
    // POST JURNAL
    // ========================================================
    //
    // Jurnal:
    //
    //   Dr 53  - 21301 Hutang Pajak PPN
    //   Cr XXX - COA Kas/Bank DETAIL
    //
    // Sumber:
    //   PAJAK_PPN
    //
    // Modul:
    //   PPN
    //
    // Tidak menggunakan jurnal.ref_id untuk id_ppn.
    // Relasi dilakukan melalui pembayaran_ppn.id_jurnal.
    // ========================================================

    let jurnalId: number;

    try {
      jurnalId = await postPembayaranPpn(
        input.tanggal,
        `BYR-PPN-${pembayaran.id}`,
        input.keterangan,
        input.nominal,
        input.id_ppn,
        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      // ------------------------------------------------------
      // ROLLBACK PEMBAYARAN
      // ------------------------------------------------------
      //
      // Jika jurnal gagal dibuat, jangan meninggalkan
      // pembayaran tanpa jurnal.
      //

      await db.from("pembayaran_ppn").delete().eq("id", pembayaran.id);

      throw journalError;
    }

    // ========================================================
    // SIMPAN ID JURNAL
    // ========================================================

    const { data: updatedPayment, error: updateError } = await db
      .from("pembayaran_ppn")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", pembayaran.id)
      .select(
        `
        id,
        tanggal,
        id_ppn,
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

    // ========================================================
    // STATUS AKHIR
    // ========================================================

    const totalPembayaranAkhir: number =
      totalPembayaranSebelumnya + input.nominal;

    const sisaSetelahBayar: number = Math.max(
      nilaiPpn - totalPembayaranAkhir,
      0,
    );

    const status: string = sisaSetelahBayar <= 0 ? "PAID" : "PARTIAL";

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        message: "Pembayaran PPN dan jurnal berhasil dibuat",

        data: {
          ...updatedPayment,

          id_coa_hutang: PPN_HUTANG_COA_ID,

          id_coa_kas: input.id_coa_kas,

          nilai_ppn: nilaiPpn,

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
    console.error("POST PEMBAYARAN PPN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses pembayaran PPN",
      },
      {
        status: 500,
      },
    );
  }
}
