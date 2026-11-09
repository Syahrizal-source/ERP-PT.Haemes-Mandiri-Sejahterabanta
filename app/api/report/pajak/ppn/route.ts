import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

/* =========================================================
   DATABASE TYPES
========================================================= */

interface PpnDbRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number | string;
  tarif_ppn: number | string;
  nilai_ppn: number | string;
  tanggal_transaksi: string;
  created_at: string;
  nomor_seri: string | null;
  vendor_id: number | null;
  keterangan: string | null;
}

interface VendorRow {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
  nama_npwp: string | null;
}

/* =========================================================
   REPORT TYPES
========================================================= */

interface PpnReportRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";

  keterangan: string;
  kode_vendor: string;
  nama_vendor: string;
  npwp: string;

  nomor_seri: string;
  tanggal: string;

  nilai_transaksi: number;
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;

  keterangan_tambahan: string;
}

interface PpnReportTotal {
  nilai_transaksi: number;
  nilai_dasar: number;
  nilai_ppn: number;
}

interface PpnReportResponse {
  periode: {
    bulan: number;
    tahun: number;
    label: string;
  };

  keluaran: PpnReportRow[];

  masukan: PpnReportRow[];

  total: {
    keluaran: PpnReportTotal;
    masukan: PpnReportTotal;
  };
}

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const result: number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(result)) {
    return 0;
  }

  return result;
}

function getMonthName(month: number): string {
  const names: string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return names[month - 1] ?? "";
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed: number = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function createEmptyTotal(): PpnReportTotal {
  return {
    nilai_transaksi: 0,
    nilai_dasar: 0,
    nilai_ppn: 0,
  };
}

/* =========================================================
   GET LAPORAN PPN
========================================================= */

export async function GET(
  req: NextRequest,
): Promise<NextResponse<PpnReportResponse | { error: string }>> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const monthParam: string | null = searchParams.get("bulan");

    const yearParam: string | null = searchParams.get("tahun");

    /*
     * Default mengikuti tanggal sistem.
     */
    const now: Date = new Date();

    const bulan: number =
      parsePositiveInteger(monthParam) ?? now.getMonth() + 1;

    const tahun: number = parsePositiveInteger(yearParam) ?? now.getFullYear();

    /* =====================================================
       VALIDASI PERIODE
    ===================================================== */

    if (bulan < 1 || bulan > 12) {
      return NextResponse.json(
        {
          error: "Bulan tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (tahun < 2000 || tahun > 2100) {
      return NextResponse.json(
        {
          error: "Tahun tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BATAS TANGGAL

       >= awal bulan
       < awal bulan berikutnya
    ===================================================== */

    const tanggalAwal: string = `${tahun}-${String(bulan).padStart(2, "0")}-01`;

    const nextMonthDate: Date = new Date(tahun, bulan, 1);

    const tanggalAkhir: string = [
      nextMonthDate.getFullYear(),
      String(nextMonthDate.getMonth() + 1).padStart(2, "0"),
      "01",
    ].join("-");

    /* =====================================================
       AMBIL DATA PPN

       TIDAK menggunakan relationship vendors.
       Ini sengaja supaya aman dari masalah schema cache
       Supabase/PostgREST.
    ===================================================== */

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
          created_at,
          nomor_seri,
          vendor_id,
          keterangan
        `,
      )
      .gte("tanggal_transaksi", tanggalAwal)
      .lt("tanggal_transaksi", tanggalAkhir)
      .order("tanggal_transaksi", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      });

    if (ppnError) {
      console.error("[PPN REPORT DATA ERROR]", ppnError);

      return NextResponse.json(
        {
          error: ppnError.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: PpnDbRow[] = (ppnData ?? []) as PpnDbRow[];

    /* =====================================================
       AMBIL VENDOR ID YANG DIGUNAKAN
    ===================================================== */

    const vendorIds: number[] = Array.from(
      new Set(
        rows
          .map((row: PpnDbRow): number | null => row.vendor_id)
          .filter(
            (id: number | null): id is number =>
              id !== null && Number.isInteger(id) && id > 0,
          ),
      ),
    );

    /* =====================================================
       VENDOR MAP
    ===================================================== */

    const vendorMap: Map<number, VendorRow> = new Map();

    if (vendorIds.length > 0) {
      const { data: vendors, error: vendorError } = await db
        .from("vendors")
        .select(
          `
          id,
          kode_vendor,
          nama_vendor,
          npwp,
          nama_npwp
        `,
        )
        .in("id", vendorIds);

      if (vendorError) {
        console.error("[PPN REPORT VENDOR ERROR]", vendorError);

        return NextResponse.json(
          {
            error: vendorError.message,
          },
          {
            status: 500,
          },
        );
      }

      const vendorRows: VendorRow[] = (vendors ?? []) as VendorRow[];

      for (const vendor of vendorRows) {
        vendorMap.set(vendor.id, vendor);
      }
    }

    /* =====================================================
       PEMISAHAN KELUARAN / MASUKAN
    ===================================================== */

    const keluaran: PpnReportRow[] = [];
    const masukan: PpnReportRow[] = [];

    for (const row of rows) {
      const vendor: VendorRow | undefined =
        row.vendor_id === null ? undefined : vendorMap.get(row.vendor_id);

      const nilaiDasar: number = Math.max(0, toNumber(row.nilai_dasar));

      const tarifPpn: number = Math.max(0, toNumber(row.tarif_ppn));

      const nilaiPpn: number = Math.max(0, toNumber(row.nilai_ppn));

      /*
       * Tabel ppn tidak mempunyai kolom
       * nilai_transaksi.
       *
       * Karena laporan tidak boleh mengarang
       * angka, nilai transaksi menggunakan
       * nilai_dasar yang tersedia.
       */
      const nilaiTransaksi: number = nilaiDasar;

      const namaVendor: string = vendor?.nama_vendor ?? "-";

      const kodeVendor: string = vendor?.kode_vendor ?? "-";

      const npwp: string = vendor?.npwp ?? vendor?.nama_npwp ?? "-";

      const keterangan: string = row.keterangan?.trim() ?? "";

      const reportRow: PpnReportRow = {
        id: row.id,
        id_transaksi: row.id_transaksi,
        jenis_ppn: row.jenis_ppn,

        // Keterangan murni dari transaksi PPN.
        // Tidak lagi menggunakan nama vendor.
        keterangan: keterangan || "-",

        kode_vendor: kodeVendor,
        nama_vendor: namaVendor,
        npwp,

        nomor_seri: row.nomor_seri ?? "-",
        tanggal: row.tanggal_transaksi,

        nilai_transaksi: nilaiTransaksi,
        nilai_dasar: nilaiDasar,
        tarif_ppn: tarifPpn,
        nilai_ppn: nilaiPpn,

        keterangan_tambahan: keterangan,
      };

      if (row.jenis_ppn === "keluaran") {
        keluaran.push(reportRow);
      }

      if (row.jenis_ppn === "masukan") {
        masukan.push(reportRow);
      }
    }

    /* =====================================================
       TOTAL KELUARAN
    ===================================================== */

    const totalKeluaran: PpnReportTotal = keluaran.reduce(
      (total: PpnReportTotal, row: PpnReportRow): PpnReportTotal => {
        total.nilai_transaksi += row.nilai_transaksi;

        total.nilai_dasar += row.nilai_dasar;

        total.nilai_ppn += row.nilai_ppn;

        return total;
      },
      createEmptyTotal(),
    );

    /* =====================================================
       TOTAL MASUKAN
    ===================================================== */

    const totalMasukan: PpnReportTotal = masukan.reduce(
      (total: PpnReportTotal, row: PpnReportRow): PpnReportTotal => {
        total.nilai_transaksi += row.nilai_transaksi;

        total.nilai_dasar += row.nilai_dasar;

        total.nilai_ppn += row.nilai_ppn;

        return total;
      },
      createEmptyTotal(),
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    const response: PpnReportResponse = {
      periode: {
        bulan,
        tahun,
        label: `${getMonthName(bulan)} ${tahun}`,
      },

      keluaran,

      masukan,

      total: {
        keluaran: totalKeluaran,

        masukan: totalMasukan,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[PPN REPORT ERROR]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan PPN",
      },
      {
        status: 500,
      },
    );
  }
}
