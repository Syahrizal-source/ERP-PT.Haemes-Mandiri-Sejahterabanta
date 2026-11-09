import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type Pph4ReportRow = {
  id: number;
  npwp_pembeli: string | null;
  nama_pembeli: string | null;
  nomor_faktur_pajak: string | null;
  tanggal_faktur_pajak: string | null;
  nilai_transaksi: number;
  dpp_nilai_lain: number;
  ppn: number;
  tanggal_transaksi: string;
  tarif_pph4: number;
  potongan: number;
  pph4_terutang: number;
  jenis_objek: string;
  id_vendor: number;
  vendors: {
    id: number;
    kode_vendor: string | null;
    nama_vendor: string;
  } | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const tahunParam: string | null = searchParams.get("tahun");
    const bulanParam: string | null = searchParams.get("bulan");

    const tahun: number | null =
      tahunParam && /^\d{4}$/.test(tahunParam) ? Number(tahunParam) : null;

    const bulan: number | null =
      bulanParam && /^(?:[1-9]|1[0-2])$/.test(bulanParam)
        ? Number(bulanParam)
        : null;

    let query = db
      .from("pph4")
      .select(
        `
        id,
        id_vendor,
        jenis_objek,
        npwp_pembeli,
        nama_pembeli,
        nomor_faktur_pajak,
        tanggal_faktur_pajak,
        nilai_transaksi,
        dpp_nilai_lain,
        ppn,
        tanggal_transaksi,
        tarif_pph4,
        potongan,
        pph4_terutang,
        vendors!pph4_id_vendor_fkey (
          id,
          kode_vendor,
          nama_vendor
        )
      `,
      )
      .order("tanggal_faktur_pajak", {
        ascending: true,
        nullsFirst: false,
      })
      .order("id", {
        ascending: true,
      });

    if (tahun !== null) {
      query = query
        .gte("tanggal_transaksi", `${tahun}-01-01`)
        .lte("tanggal_transaksi", `${tahun}-12-31`);
    }

    if (bulan !== null && tahun !== null) {
      const startDate = new Date(Date.UTC(tahun, bulan - 1, 1));

      const nextMonth = new Date(Date.UTC(tahun, bulan, 1));

      const start = startDate.toISOString().slice(0, 10);

      const end = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      query = db
        .from("pph4")
        .select(
          `
          id,
          id_vendor,
          jenis_objek,
          npwp_pembeli,
          nama_pembeli,
          nomor_faktur_pajak,
          tanggal_faktur_pajak,
          nilai_transaksi,
          dpp_nilai_lain,
          ppn,
          tanggal_transaksi,
          tarif_pph4,
          potongan,
          pph4_terutang,
          vendors!pph4_id_vendor_fkey (
            id,
            kode_vendor,
            nama_vendor
          )
        `,
        )
        .gte("tanggal_transaksi", start)
        .lte("tanggal_transaksi", end)
        .order("tanggal_faktur_pajak", {
          ascending: true,
          nullsFirst: false,
        })
        .order("id", {
          ascending: true,
        });
    }

    const { data, error } = await query;

    if (error) {
      console.error("[PPH4 REPORT ERROR]", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: Pph4ReportRow[] = (data ?? []).map((row) => {
      const raw = row as unknown as Record<string, unknown>;

      const vendorRaw = raw.vendors;

      const vendor: Pph4ReportRow["vendors"] =
        vendorRaw && typeof vendorRaw === "object" && !Array.isArray(vendorRaw)
          ? {
              id: toNumber((vendorRaw as Record<string, unknown>).id),
              kode_vendor:
                typeof (vendorRaw as Record<string, unknown>).kode_vendor ===
                "string"
                  ? String((vendorRaw as Record<string, unknown>).kode_vendor)
                  : null,
              nama_vendor:
                typeof (vendorRaw as Record<string, unknown>).nama_vendor ===
                "string"
                  ? String((vendorRaw as Record<string, unknown>).nama_vendor)
                  : "",
            }
          : null;

      return {
        id: toNumber(raw.id),
        id_vendor: toNumber(raw.id_vendor),
        jenis_objek: typeof raw.jenis_objek === "string" ? raw.jenis_objek : "",
        npwp_pembeli:
          typeof raw.npwp_pembeli === "string" ? raw.npwp_pembeli : null,
        nama_pembeli:
          typeof raw.nama_pembeli === "string" ? raw.nama_pembeli : null,
        nomor_faktur_pajak:
          typeof raw.nomor_faktur_pajak === "string"
            ? raw.nomor_faktur_pajak
            : null,
        tanggal_faktur_pajak:
          typeof raw.tanggal_faktur_pajak === "string"
            ? raw.tanggal_faktur_pajak
            : null,
        nilai_transaksi: toNumber(raw.nilai_transaksi),
        dpp_nilai_lain: toNumber(raw.dpp_nilai_lain),
        ppn: toNumber(raw.ppn),
        tanggal_transaksi:
          typeof raw.tanggal_transaksi === "string"
            ? raw.tanggal_transaksi
            : "",
        tarif_pph4: toNumber(raw.tarif_pph4),
        potongan: toNumber(raw.potongan),
        pph4_terutang: toNumber(raw.pph4_terutang),
        vendors: vendor,
      };
    });

    const total = rows.reduce(
      (result, row) => ({
        nilai_transaksi: result.nilai_transaksi + row.nilai_transaksi,
        dpp_nilai_lain: result.dpp_nilai_lain + row.dpp_nilai_lain,
        ppn: result.ppn + row.ppn,
        potongan: result.potongan + row.potongan,
        pph4_terutang: result.pph4_terutang + row.pph4_terutang,
      }),
      {
        nilai_transaksi: 0,
        dpp_nilai_lain: 0,
        ppn: 0,
        potongan: 0,
        pph4_terutang: 0,
      },
    );

    return NextResponse.json({
      data: rows,
      total,
      filter: {
        tahun,
        bulan,
      },
    });
  } catch (error: unknown) {
    console.error("[PPH4 REPORT ERROR]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan PPh4",
      },
      {
        status: 500,
      },
    );
  }
}
