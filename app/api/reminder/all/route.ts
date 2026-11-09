import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type ReminderItem = {
  id: number;
  no: string;
  nama: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  sumber: "INVOICE" | "HUTANG";
};

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

type PembayaranHutangRow = {
  id_hutang: number;
  total: number | string | null;
};

export async function GET(): Promise<NextResponse> {
  try {
    /* =========================================================
       INVOICE
       ========================================================= */

    const { data: invoice, error: invoiceError } = await db
      .from("invoice")
      .select("*");

    if (invoiceError) {
      throw new Error(
        `Gagal mengambil data invoice: ${invoiceError.message}`,
      );
    }

    const inv: ReminderItem[] = (invoice ?? [])
      .filter(
        (item): boolean =>
          String(item.status ?? "")
            .toLowerCase()
            .includes("unpaid"),
      )
      .map(
        (item): ReminderItem => ({
          id: Number(item.id),
          no: String(item.no_invoice ?? "-"),
          nama: String(item.customer ?? "-"),
          nominal: Number(item.nominal ?? 0),
          tanggal_jatuh_tempo: String(
            item.tanggal_jatuh_tempo ?? item.tanggal,
          ),
          sumber: "INVOICE",
        }),
      );

    /* =========================================================
       HUTANG
       
       JANGAN hanya membaca hutang.status.

       Status reminder dihitung dari:
       
       nilai hutang
       -
       total pembayaran_hutang
       =
       sisa hutang
       ========================================================= */

    const { data: hutang, error: hutangError } = await db
      .from("hutang")
      .select(`
        id_hutang,
        supplier,
        no_invoice,
        tanggal,
        jatuh_tempo,
        tanggal_jatuh_tempo,
        nilai,
        status
      `);

    if (hutangError) {
      throw new Error(
        `Gagal mengambil data hutang: ${hutangError.message}`,
      );
    }

    const hutangRows: HutangRow[] = (hutang ?? []).map(
      (item): HutangRow => ({
        id_hutang: Number(item.id_hutang),
        supplier: String(item.supplier ?? "-"),
        no_invoice: String(item.no_invoice ?? "-"),
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

    /* =========================================================
       AMBIL SEMUA PEMBAYARAN HUTANG
       ========================================================= */

    const { data: pembayaranHutang, error: pembayaranError } = await db
      .from("pembayaran_hutang")
      .select("id_hutang, total");

    if (pembayaranError) {
      throw new Error(
        `Gagal mengambil pembayaran hutang: ${pembayaranError.message}`,
      );
    }

    const pembayaranRows: PembayaranHutangRow[] = (
      pembayaranHutang ?? []
    ).map(
      (item): PembayaranHutangRow => ({
        id_hutang: Number(item.id_hutang),
        total:
          item.total === null || item.total === undefined
            ? null
            : Number(item.total),
      }),
    );

    /* =========================================================
       TOTAL PEMBAYARAN PER HUTANG
       ========================================================= */

    const pembayaranMap = new Map<number, number>();

    for (const pembayaran of pembayaranRows) {
      const idHutang: number = pembayaran.id_hutang;
      const total: number = Number(pembayaran.total ?? 0);

      const sebelumnya: number =
        pembayaranMap.get(idHutang) ?? 0;

      pembayaranMap.set(
        idHutang,
        sebelumnya + total,
      );
    }

    /* =========================================================
       HUTANG YANG MASIH BOLEH MUNCUL DI REMINDER
       ========================================================= */

    const hut: ReminderItem[] = hutangRows
      .filter((item): boolean => {
        const nilaiHutang: number = Number(item.nilai ?? 0);

        const totalPembayaran: number =
          pembayaranMap.get(item.id_hutang) ?? 0;

        const sisaHutang: number = Math.max(
          nilaiHutang - totalPembayaran,
          0,
        );

        /*
         * PENTING:
         *
         * Kalau sisa = 0 berarti sudah lunas.
         * Tidak boleh masuk Reminder.
         */
        return sisaHutang > 0;
      })
      .filter((item): boolean => {
        /*
         * Untuk hutang yang belum pernah dibayar,
         * status lama tetap menjadi filter.
         *
         * Untuk hutang partial, juga tetap bisa muncul
         * karena sisa hutang masih > 0.
         */
        const totalPembayaran: number =
          pembayaranMap.get(item.id_hutang) ?? 0;

        const status: string = item.status
          .toLowerCase()
          .trim();

        if (totalPembayaran > 0) {
          return true;
        }

        return status.includes("unpaid");
      })
      .map(
        (item): ReminderItem => ({
          id: item.id_hutang,
          no: item.no_invoice,
          nama: item.supplier,
          nominal: Math.max(
            Number(item.nilai ?? 0) -
              (pembayaranMap.get(item.id_hutang) ?? 0),
            0,
          ),
          tanggal_jatuh_tempo: String(
            item.tanggal_jatuh_tempo ??
              item.jatuh_tempo ??
              item.tanggal,
          ),
          sumber: "HUTANG",
        }),
      );

    /* =========================================================
       GABUNG INVOICE + HUTANG
       ========================================================= */

    const merged: ReminderItem[] = [...inv, ...hut].sort(
      (a, b): number => {
        return (
          new Date(a.tanggal_jatuh_tempo).getTime() -
          new Date(b.tanggal_jatuh_tempo).getTime()
        );
      },
    );

    return NextResponse.json(merged);
  } catch (error: unknown) {
    console.error("REMINDER ALL ERROR:", error);

    const message: string =
      error instanceof Error
        ? error.message
        : "Gagal mengambil reminder invoice dan hutang";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}