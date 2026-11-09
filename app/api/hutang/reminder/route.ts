import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type HutangRow = {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  tanggal_jatuh_tempo: string | null;
  nilai: number;
  status: string;
};

type PembayaranRow = {
  id_hutang: number;
  total: number | null;
};

type HutangReminder = {
  id: number;
  no_invoice: string;
  supplier: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    /* ============================================================
       1. AMBIL HUTANG
       ============================================================ */

    const { data: hutangData, error: hutangError } = await db
      .from("hutang")
      .select(
        `
          id_hutang,
          supplier,
          no_invoice,
          tanggal,
          jatuh_tempo,
          tanggal_jatuh_tempo,
          nilai,
          status
        `,
      )
      .order("jatuh_tempo", { ascending: true });

    if (hutangError) {
      throw new Error(
        `Gagal mengambil data hutang reminder: ${hutangError.message}`,
      );
    }

    const hutangRows: HutangRow[] = (hutangData ?? []).map(
      (item): HutangRow => ({
        id_hutang: Number(item.id_hutang),
        supplier: String(item.supplier ?? ""),
        no_invoice: String(item.no_invoice ?? ""),
        tanggal: String(item.tanggal ?? ""),
        jatuh_tempo: String(item.jatuh_tempo ?? ""),
        tanggal_jatuh_tempo:
          item.tanggal_jatuh_tempo === null ||
          item.tanggal_jatuh_tempo === undefined
            ? null
            : String(item.tanggal_jatuh_tempo),
        nilai: Number(item.nilai ?? 0),
        status: String(item.status ?? ""),
      }),
    );

    if (hutangRows.length === 0) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    /* ============================================================
       2. AMBIL SEMUA PEMBAYARAN HUTANG
       ============================================================

       STATUS REMINDER TIDAK BOLEH MENGANDALKAN hutang.status.

       Sumber kebenaran pembayaran:
         pembayaran_hutang.total

       Contoh:

         Hutang       = 1.000.000
         Pembayaran   = 1.000.000
         Sisa         = 0
         => TIDAK REMINDER

         Hutang       = 1.000.000
         Pembayaran   = 500.000
         Sisa         = 500.000
         => MASIH REMINDER
    */

    const { data: pembayaranData, error: pembayaranError } = await db
      .from("pembayaran_hutang")
      .select("id_hutang, total");

    if (pembayaranError) {
      throw new Error(
        `Gagal mengambil pembayaran hutang reminder: ${pembayaranError.message}`,
      );
    }

    const pembayaranRows: PembayaranRow[] = (pembayaranData ?? []).map(
      (item): PembayaranRow => ({
        id_hutang: Number(item.id_hutang),
        total:
          item.total === null || item.total === undefined
            ? 0
            : Number(item.total),
      }),
    );

    /* ============================================================
       3. TOTAL PEMBAYARAN PER HUTANG
       ============================================================ */

    const totalPembayaranMap: Map<number, number> = new Map<number, number>();

    for (const pembayaran of pembayaranRows) {
      if (!Number.isInteger(pembayaran.id_hutang)) {
        continue;
      }

      const totalPembayaran = Number(pembayaran.total ?? 0);

      if (!Number.isFinite(totalPembayaran) || totalPembayaran <= 0) {
        continue;
      }

      const sebelumnya: number =
        totalPembayaranMap.get(pembayaran.id_hutang) ?? 0;

      totalPembayaranMap.set(
        pembayaran.id_hutang,
        sebelumnya + totalPembayaran,
      );
    }

    /* ============================================================
       4. HITUNG REMINDER BERDASARKAN SISA HUTANG
       ============================================================ */

    const result: HutangReminder[] = [];

    for (const hutang of hutangRows) {
      if (!Number.isInteger(hutang.id_hutang) || hutang.id_hutang <= 0) {
        continue;
      }

      if (!Number.isFinite(hutang.nilai) || hutang.nilai <= 0) {
        continue;
      }

      const totalPembayaran: number =
        totalPembayaranMap.get(hutang.id_hutang) ?? 0;

      /*
       * SISA HUTANG = NILAI HUTANG - TOTAL PEMBAYARAN
       */
      const sisaHutang: number = Math.max(hutang.nilai - totalPembayaran, 0);

      /*
       * ==========================================================
       * JIKA SUDAH LUNAS
       * ==========================================================
       *
       * Tidak peduli hutang.status masih:
       *
       *   Unpaid
       *
       * selama pembayaran sudah mencapai nilai hutang,
       * jangan masukkan ke reminder.
       */

      if (sisaHutang <= 0) {
        continue;
      }

      /*
       * Jika belum ada pembayaran sama sekali,
       * hanya hutang dengan status Unpaid yang masuk reminder.
       *
       * Jika sudah ada pembayaran sebagian,
       * tetap tampil karena masih mempunyai sisa.
       */

      if (totalPembayaran <= 0) {
        const statusLower: string = hutang.status.toLowerCase();

        if (!statusLower.includes("unpaid")) {
          continue;
        }
      }

      const tanggalJatuhTempo: string =
        hutang.tanggal_jatuh_tempo ?? hutang.jatuh_tempo ?? hutang.tanggal;

      if (!tanggalJatuhTempo) {
        continue;
      }

      result.push({
        id: hutang.id_hutang,
        no_invoice: hutang.no_invoice,
        supplier: hutang.supplier,
        /*
         * PENTING:
         * reminder menampilkan SISA, bukan nilai awal hutang.
         */
        nominal: sisaHutang,
        tanggal_jatuh_tempo: tanggalJatuhTempo,
      });
    }

    /* ============================================================
       5. SORT JATUH TEMPO
       ============================================================ */

    result.sort((a, b) => {
      const dateA: number = new Date(
        `${a.tanggal_jatuh_tempo}T00:00:00`,
      ).getTime();

      const dateB: number = new Date(
        `${b.tanggal_jatuh_tempo}T00:00:00`,
      ).getTime();

      return dateA - dateB;
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    console.error("GET HUTANG REMINDER ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil reminder hutang";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
