import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pembayaranHutangSchema,
  type PembayaranHutangInput,
} from "@/lib/validators/pembayaran-hutang";

import { postPembayaranHutang } from "@/lib/accounting/postPembayaranHutang";

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

interface PembayaranHutangRow {
  id: number;
  tanggal: string;
  id_hutang: number;
  nominal: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
  created_at: string;
}

interface HutangData {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  nilai: number;
  status: string;
}

interface PembayaranTotalRow {
  total: number | null;
}

type PembayaranStatus = "UNPAID" | "PARTIAL" | "PAID";

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Menampilkan pembayaran hutang.
 *
 * PPN dan PPh23 tidak digunakan lagi dalam business logic.
 *
 * Kolom database ppn / pph23 tetap tidak disentuh agar
 * kompatibel dengan struktur tabel lama.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pembayaran_hutang")
      .select(
        "id, tanggal, id_hutang, nominal, total, keterangan, id_jurnal, created_at",
      )
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: PembayaranHutangRow[] = (data ?? []).map(
      (item): PembayaranHutangRow => ({
        id: Number(item.id),
        tanggal: String(item.tanggal),
        id_hutang: Number(item.id_hutang),
        nominal: Number(item.nominal ?? 0),
        total: Number(item.total ?? 0),
        keterangan: String(item.keterangan ?? ""),
        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),
        created_at: String(item.created_at ?? ""),
      }),
    );

    /**
     * ========================================================
     * HITUNG STATUS REAL
     * ========================================================
     *
     * Status dihitung dari total pembayaran yang sudah tercatat.
     *
     * UNPAID  = belum ada pembayaran
     * PARTIAL = pembayaran < nilai hutang
     * PAID    = pembayaran >= nilai hutang
     */
    const result = await Promise.all(
      rows.map(
        async (
          item: PembayaranHutangRow,
        ): Promise<
          PembayaranHutangRow & {
            supplier: string;
            no_invoice: string;
            nilai_hutang: number;
            total_pembayaran: number;
            sisa: number;
            status: PembayaranStatus;
            status_label: string;
          }
        > => {
          const { data: hutang, error: hutangError } = await db
            .from("hutang")
            .select("id_hutang, supplier, no_invoice, tanggal, nilai, status")
            .eq("id_hutang", item.id_hutang)
            .maybeSingle();

          if (hutangError) {
            throw new Error(
              `Gagal mengambil hutang ${item.id_hutang}: ${hutangError.message}`,
            );
          }

          const hutangData: HutangData | null =
            hutang === null
              ? null
              : {
                  id_hutang: Number(hutang.id_hutang),
                  supplier: String(hutang.supplier ?? ""),
                  no_invoice: String(hutang.no_invoice ?? ""),
                  tanggal: String(hutang.tanggal ?? ""),
                  nilai: Number(hutang.nilai ?? 0),
                  status: String(hutang.status ?? ""),
                };

          const nilaiHutang: number = Number(hutangData?.nilai ?? 0);

          /**
           * Ambil seluruh pembayaran untuk hutang ini.
           *
           * Yang dijumlahkan adalah TOTAL pembayaran.
           */
          const { data: pembayaran, error: pembayaranError } = await db
            .from("pembayaran_hutang")
            .select("total")
            .eq("id_hutang", item.id_hutang);

          if (pembayaranError) {
            throw new Error(
              `Gagal menghitung pembayaran hutang ${item.id_hutang}: ${pembayaranError.message}`,
            );
          }

          const pembayaranRows: PembayaranTotalRow[] = (pembayaran ?? []).map(
            (payment): PembayaranTotalRow => ({
              total:
                payment.total === null || payment.total === undefined
                  ? null
                  : Number(payment.total),
            }),
          );

          const totalBayar: number = pembayaranRows.reduce(
            (sum: number, payment: PembayaranTotalRow): number => {
              return sum + Number(payment.total ?? 0);
            },
            0,
          );

          let status: PembayaranStatus;

          if (nilaiHutang > 0 && totalBayar >= nilaiHutang) {
            status = "PAID";
          } else if (totalBayar > 0) {
            status = "PARTIAL";
          } else {
            status = "UNPAID";
          }

          let statusLabel: string;

          if (status === "PAID") {
            statusLabel = "Pembayaran Lunas";
          } else if (status === "PARTIAL") {
            statusLabel = "Pembayaran Sebagian";
          } else {
            statusLabel = "Belum Dibayar";
          }

          const sisa: number = Math.max(nilaiHutang - totalBayar, 0);

          return {
            ...item,
            supplier: hutangData?.supplier ?? "",
            no_invoice: hutangData?.no_invoice ?? "",
            nilai_hutang: nilaiHutang,
            total_pembayaran: totalBayar,
            sisa,
            status,
            status_label: statusLabel,
          };
        },
      ),
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN HUTANG ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data pembayaran hutang";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Payload baru:
 *
 * {
 *   tanggal,
 *   id_hutang,
 *   id_coa_kas,
 *   nominal,
 *   keterangan
 * }
 *
 * Tidak ada:
 * - ppn
 * - pph23
 * - id_vendor dari frontend
 *
 * COA hutang ditentukan backend.
 *
 * Jurnal:
 *
 * Dr 2747 Hutang Vendor
 * Cr COA Kas/Bank DETAIL pilihan user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * PARSE REQUEST
     * ========================================================
     */
    const body: unknown = await req.json();

    const parsed = pembayaranHutangSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      console.error("VALIDASI PEMBAYARAN HUTANG GAGAL:", fieldErrors);

      return NextResponse.json(
        {
          error: "Data pembayaran hutang tidak valid",
          details: fieldErrors,
        },
        { status: 400 },
      );
    }

    const input: PembayaranHutangInput = parsed.data;

    /**
     * ========================================================
     * VALIDASI INPUT
     * ========================================================
     */

    if (!Number.isInteger(input.id_hutang) || input.id_hutang <= 0) {
      return NextResponse.json(
        {
          error: "ID hutang tidak valid",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran tidak valid",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(input.id_coa_kas) || input.id_coa_kas <= 0) {
      return NextResponse.json(
        {
          error: "COA kas/bank wajib dipilih",
        },
        { status: 400 },
      );
    }

    /**
     * ========================================================
     * CEK HUTANG
     * ========================================================
     */

    const { data: hutang, error: hutangError } = await db
      .from("hutang")
      .select("id_hutang, supplier, no_invoice, tanggal, nilai, status")
      .eq("id_hutang", input.id_hutang)
      .maybeSingle();

    if (hutangError) {
      throw new Error(`Gagal memeriksa hutang: ${hutangError.message}`);
    }

    if (!hutang) {
      return NextResponse.json(
        {
          error: "Hutang tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const hutangData: HutangData = {
      id_hutang: Number(hutang.id_hutang),
      supplier: String(hutang.supplier ?? ""),
      no_invoice: String(hutang.no_invoice ?? ""),
      tanggal: String(hutang.tanggal ?? ""),
      nilai: Number(hutang.nilai ?? 0),
      status: String(hutang.status ?? ""),
    };

    if (!Number.isFinite(hutangData.nilai) || hutangData.nilai <= 0) {
      return NextResponse.json(
        {
          error: "Nilai hutang tidak valid",
        },
        { status: 400 },
      );
    }

    /**
     * ========================================================
     * NOMINAL PEMBAYARAN
     * ========================================================
     *
     * Tidak ada lagi:
     * - PPN
     * - PPh23
     *
     * Jadi total hutang yang dibayar = nominal.
     */
    const nominal: number = input.nominal;

    const totalBayar: number = nominal;

    if (!Number.isFinite(totalBayar) || totalBayar <= 0) {
      return NextResponse.json(
        {
          error: "Total pembayaran tidak valid",
        },
        { status: 400 },
      );
    }

    /**
     * ========================================================
     * HITUNG PEMBAYARAN SEBELUMNYA
     * ========================================================
     */

    const { data: pembayaranSebelumnya, error: pembayaranError } = await db
      .from("pembayaran_hutang")
      .select("total")
      .eq("id_hutang", input.id_hutang);

    if (pembayaranError) {
      throw new Error(
        `Gagal menghitung pembayaran sebelumnya: ${pembayaranError.message}`,
      );
    }

    const pembayaranRows: PembayaranTotalRow[] = (
      pembayaranSebelumnya ?? []
    ).map(
      (payment): PembayaranTotalRow => ({
        total:
          payment.total === null || payment.total === undefined
            ? null
            : Number(payment.total),
      }),
    );

    const totalPembayaranSebelumnya: number = pembayaranRows.reduce(
      (sum: number, payment: PembayaranTotalRow): number => {
        return sum + Number(payment.total ?? 0);
      },
      0,
    );

    /**
     * ========================================================
     * HITUNG SISA HUTANG
     * ========================================================
     */

    const sisaHutang: number = Math.max(
      hutangData.nilai - totalPembayaranSebelumnya,
      0,
    );

    if (sisaHutang <= 0) {
      return NextResponse.json(
        {
          error: "Hutang sudah lunas",
        },
        { status: 400 },
      );
    }

    /**
     * Tidak boleh membayar lebih dari sisa hutang.
     */
    if (totalBayar > sisaHutang) {
      return NextResponse.json(
        {
          error: "Pembayaran melebihi sisa hutang",
          sisa_hutang: sisaHutang,
          total_pembayaran: totalBayar,
        },
        { status: 400 },
      );
    }

    /**
     * ========================================================
     * SIMPAN PEMBAYARAN
     * ========================================================
     *
     * Kolom ppn dan pph23 masih ada di database lama.
     *
     * Kita isi 0 agar:
     * - tidak mengubah schema lama
     * - tidak ada pajak dalam transaksi
     *
     * total = nominal
     */
    const { data, error: insertError } = await db
      .from("pembayaran_hutang")
      .insert({
        tanggal: input.tanggal,
        id_hutang: input.id_hutang,
        nominal,
        ppn: 0,
        pph23: 0,
        total: nominal,
        keterangan: input.keterangan,
      })
      .select(
        "id, tanggal, id_hutang, nominal, total, keterangan, id_jurnal, created_at",
      )
      .single();

    if (insertError || !data) {
      throw new Error(
        insertError?.message ?? "Gagal menyimpan pembayaran hutang",
      );
    }

    /**
     * ========================================================
     * POST JURNAL
     * ========================================================
     *
     * Backend menentukan:
     *
     * Debit  -> 2747 Hutang Vendor
     * Kredit -> COA kas/bank DETAIL pilihan user
     *
     * Tidak ada PPN.
     * Tidak ada PPh23.
     */
    let jurnalId: number;

    try {
      jurnalId = await postPembayaranHutang(
        input.tanggal,
        `BYR-${data.id}`,
        input.keterangan,
        nominal,
        input.id_hutang,
        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      /**
       * Jika jurnal gagal dibuat, pembayaran yang baru saja
       * dibuat dibersihkan kembali.
       */
      await db.from("pembayaran_hutang").delete().eq("id", data.id);

      throw journalError;
    }

    /**
     * ========================================================
     * SIMPAN ID JURNAL
     * ========================================================
     */

    const { data: updatedData, error: updateError } = await db
      .from("pembayaran_hutang")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", data.id)
      .select(
        "id, tanggal, id_hutang, nominal, total, keterangan, id_jurnal, created_at",
      )
      .single();

    if (updateError || !updatedData) {
      throw new Error(
        updateError?.message ??
          "Jurnal berhasil diposting tetapi id_jurnal gagal disimpan",
      );
    }

    /**
     * ========================================================
     * STATUS AKHIR
     * ========================================================
     */

    const totalPembayaranAkhir: number = totalPembayaranSebelumnya + totalBayar;

    const sisaSetelahBayar: number = Math.max(
      hutangData.nilai - totalPembayaranAkhir,
      0,
    );

    let status: PembayaranStatus;

    if (totalPembayaranAkhir >= hutangData.nilai) {
      status = "PAID";
    } else if (totalPembayaranAkhir > 0) {
      status = "PARTIAL";
    } else {
      status = "UNPAID";
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json(
      {
        message: "Pembayaran hutang berhasil",

        data: updatedData,

        accounting: {
          id_jurnal: jurnalId,

          /**
           * COA hutang ditentukan oleh backend:
           *
           * HUTANG/HUTANG -> 2747 Hutang Vendor
           */
          id_coa_hutang: 2747,

          /**
           * COA kas berasal dari COA detail pilihan user.
           */
          id_coa_kas: input.id_coa_kas,

          /**
           * Karena tidak menggunakan pajak:
           */
          total_hutang: hutangData.nilai,
          kas_keluar: totalBayar,

          /**
           * Tidak ada:
           * - ppn
           * - pph23
           */

          total_pembayaran_sebelumnya: totalPembayaranSebelumnya,

          total_pembayaran_setelah_transaksi: totalPembayaranAkhir,

          sisa_hutang: sisaSetelahBayar,

          status,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN HUTANG ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal memproses pembayaran hutang";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
