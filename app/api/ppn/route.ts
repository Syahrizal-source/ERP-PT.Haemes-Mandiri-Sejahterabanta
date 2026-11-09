import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  ppnSchema,
  normalizePpn,
  validatePpn,
  hitungPpn,
  type PpnInput,
} from "@/lib/validators/ppn";

import { postPpn } from "@/lib/accounting/postPpn";

/* =========================================================
   TYPE DATABASE
   ========================================================= */

interface PpnRequestBody {
  id_transaksi: number;
  vendor_id: number | null;
  nomor_seri: string | null;
  keterangan: string | null;
  jenis_ppn: "keluaran" | "masukan";
  nilai_transaksi: number;
  nilai_dasar: number;
  tarif_ppn: number;
  tanggal_transaksi: string;
}

interface PpnDbRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_transaksi: number | string;
  nilai_dasar: number | string;
  tarif_ppn: number | string;
  nilai_ppn: number | string;
  tanggal_transaksi: string;
  created_at: string;
  nomor_seri: string | null;
  vendor_id: number | null;
  keterangan: string | null;
}

interface VendorInfo {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean | null;
  jenis_pajak: string | null;
}

interface PpnResponseRow extends PpnDbRow {
  vendors: VendorInfo | null;
}

/* =========================================================
   HELPER NUMBER
   ========================================================= */

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const result: number = Number(value);

    return Number.isFinite(result) ? result : 0;
  }

  return 0;
}

/* =========================================================
   GET ALL PPN
   ========================================================= */

export async function GET(): Promise<NextResponse> {
  try {
    /*
     * Vendor diambil melalui relationship yang sudah tersedia
     * pada tabel ppn -> vendors.
     *
     * Field pajak vendor ikut dikembalikan supaya:
     * - NPWP
     * - Nama NPWP
     * - PKP
     * tersedia untuk laporan maupun detail.
     */

    const { data, error } = await db
      .from("ppn")
      .select(
        `
          id,
          id_transaksi,
          jenis_ppn,
          nilai_transaksi,
          nilai_dasar,
          tarif_ppn,
          nilai_ppn,
          tanggal_transaksi,
          created_at,
          nomor_seri,
          vendor_id,
          keterangan,
          vendors (
            id,
            kode_vendor,
            nama_vendor,
            npwp,
            nama_npwp,
            alamat_npwp,
            pkp,
            jenis_pajak
          )
        `,
      )
      .order("tanggal_transaksi", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("PPN GET ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Supabase mengembalikan nilai numeric PostgreSQL
     * sebagai string pada beberapa konfigurasi.
     *
     * Kita normalisasi supaya frontend mendapatkan number.
     */

    const rows: PpnResponseRow[] = (data ?? []).map(
      (
        row: PpnDbRow & {
          vendors?: VendorInfo | VendorInfo[] | null;
        },
      ): PpnResponseRow => {
        const vendorValue: VendorInfo | VendorInfo[] | null =
          row.vendors ?? null;

        const vendor: VendorInfo | null = Array.isArray(vendorValue)
          ? (vendorValue[0] ?? null)
          : vendorValue;

        return {
          id: row.id,
          id_transaksi: row.id_transaksi,
          jenis_ppn: row.jenis_ppn,
          nilai_transaksi: toNumber(row.nilai_transaksi),
          nilai_dasar: toNumber(row.nilai_dasar),
          tarif_ppn: toNumber(row.tarif_ppn),
          nilai_ppn: toNumber(row.nilai_ppn),
          tanggal_transaksi: row.tanggal_transaksi,
          created_at: row.created_at,
          nomor_seri: row.nomor_seri,
          vendor_id: row.vendor_id,
          keterangan: row.keterangan,
          vendors: vendor,
        };
      },
    );

    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error("PPN GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal mengambil data PPN",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST PPN
   ========================================================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json();

    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json(
        {
          error: "Body tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const bodyRaw = raw as Record<string, unknown>;

    /* =====================================================
       NORMALISASI INPUT
       ===================================================== */

    const nilaiTransaksi: number = Number(bodyRaw.nilai_transaksi);

    const nilaiDasar: number = Number(bodyRaw.nilai_dasar);

    const tarifPpn: number = Number(bodyRaw.tarif_ppn);

    const vendorId: number | null =
      bodyRaw.vendor_id === null || bodyRaw.vendor_id === undefined
        ? null
        : Number(bodyRaw.vendor_id);

    const jenisPpn: "keluaran" | "masukan" =
      bodyRaw.jenis_ppn === "keluaran" ? "keluaran" : "masukan";

    const nomorSeri: string | null =
      typeof bodyRaw.nomor_seri === "string" ? bodyRaw.nomor_seri.trim() : null;

    const keterangan: string | null =
      typeof bodyRaw.keterangan === "string" ? bodyRaw.keterangan.trim() : null;

    const tanggalTransaksi: string =
      typeof bodyRaw.tanggal_transaksi === "string"
        ? bodyRaw.tanggal_transaksi
        : "";

    /*
     * JANGAN mengambil nilai_ppn dari request.
     *
     * Server akan menghitung sendiri.
     */

    const body: PpnRequestBody = {
      id_transaksi: Number(bodyRaw.id_transaksi),
      vendor_id: vendorId,
      nomor_seri: nomorSeri,
      keterangan: keterangan,
      jenis_ppn: jenisPpn,
      nilai_transaksi: nilaiTransaksi,
      nilai_dasar: nilaiDasar,
      tarif_ppn: tarifPpn,
      tanggal_transaksi: tanggalTransaksi,
    };

    /* =====================================================
       DATA UNTUK VALIDATOR
       ===================================================== */

    const validationInput = {
      id_transaksi: body.id_transaksi,

      jenis_ppn: body.jenis_ppn,

      nilai_transaksi: body.nilai_transaksi,

      nilai_dasar: body.nilai_dasar,

      tarif_ppn: body.tarif_ppn,

      tanggal_transaksi: body.tanggal_transaksi,

      vendor_id: body.vendor_id,

      nomor_seri: body.nomor_seri,

      keterangan: body.keterangan,
    };

    /* =====================================================
       VALIDASI ZOD
       ===================================================== */

    const parsed = ppnSchema.safeParse(validationInput);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data PPN tidak valid",
          issues: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       NORMALISASI
       ===================================================== */

    const dataNorm = normalizePpn(parsed.data);

    /* =====================================================
       VALIDASI BISNIS
       ===================================================== */

    validatePpn(dataNorm);

    /* =====================================================
       HITUNG PPN OTOMATIS
       ===================================================== */

    const hitung = hitungPpn(dataNorm);

    const nilaiPpn: number = Math.max(0, hitung.nilai_ppn);

    if (!Number.isFinite(nilaiPpn)) {
      return NextResponse.json(
        {
          error: "Nilai PPN tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDASI VENDOR
       ===================================================== */

    if (dataNorm.vendor_id !== null) {
      const { data: vendor, error: vendorError } = await db
        .from("vendors")
        .select("id")
        .eq("id", dataNorm.vendor_id)
        .maybeSingle();

      if (vendorError) {
        throw new Error(vendorError.message);
      }

      if (!vendor) {
        return NextResponse.json(
          {
            error: "Vendor tidak ditemukan",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       INSERT DATABASE
       ===================================================== */

    const { data, error } = await db
      .from("ppn")
      .insert({
        id_transaksi: dataNorm.id_transaksi,

        jenis_ppn: dataNorm.jenis_ppn,

        nilai_transaksi: dataNorm.nilai_dasar,

        nilai_dasar: dataNorm.nilai_dasar,

        tarif_ppn: dataNorm.tarif_ppn,

        /*
         * NILAI PPN HASIL HITUNG SERVER
         */
        nilai_ppn: nilaiPpn,

        tanggal_transaksi: dataNorm.tanggal_transaksi,

        vendor_id: dataNorm.vendor_id,

        nomor_seri: dataNorm.nomor_seri,

        /*
         * KETERANGAN TETAP DARI INPUT
         */
        keterangan: dataNorm.keterangan,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("PPN INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: error?.message ?? "Insert PPN gagal",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       POST JURNAL
       ===================================================== */

    try {
      await postPpn({
        ...dataNorm,
        nilai_ppn: nilaiPpn,
      });
    } catch (error: unknown) {
      console.error("PPN POST JURNAL ERROR:", error);

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Gagal posting jurnal PPN",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        message: "PPN berhasil disimpan",
        data,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("PPN POST ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memproses PPN",
      },
      {
        status: 500,
      },
    );
  }
}
