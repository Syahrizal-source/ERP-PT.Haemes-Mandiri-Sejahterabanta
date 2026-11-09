import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type LaporanAsetRow = {
  id_aset: number;
  harta: string;
  tanggal_perolehan: string;
  tahun_perolehan: number;
  kelompok_aset: string;
  kategori_aset: string | null;
  jumlah: number;
  nilai_perolehan: number;
  metode: string;
  umur_manfaat: number;
  tarif_penyusutan: number;
  penyusutan_bulanan: number;
  penyusutan_tahunan: number;
  akumulasi_penyusutan: number;
  nilai_buku: number;
  ppn: number;
  pph23: number;
  total: number;
  id_jurnal: number | null;
  last_depresiasi: string | null;
  created_at: string;
};

type RekapAset = {
  kelompok_aset: string;
  jumlah_aset: number;
  total_perolehan: number;
  total_akumulasi_penyusutan: number;
  total_penyusutan_bulanan: number;
  total_nilai_buku: number;
};

type TotalAset = {
  jumlah_aset: number;
  total_perolehan: number;
  total_akumulasi_penyusutan: number;
  total_penyusutan_bulanan: number;
  total_nilai_buku: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeRow(row: Record<string, unknown>): LaporanAsetRow {
  return {
    id_aset: toNumber(row.id_aset),
    harta: typeof row.harta === "string" ? row.harta.trim() : "",
    tanggal_perolehan:
      typeof row.tanggal_perolehan === "string" ? row.tanggal_perolehan : "",
    tahun_perolehan: toNumber(row.tahun_perolehan),
    kelompok_aset:
      typeof row.kelompok_aset === "string" ? row.kelompok_aset : "LAINNYA",
    kategori_aset:
      typeof row.kategori_aset === "string" ? row.kategori_aset : null,
    jumlah: toNumber(row.jumlah),
    nilai_perolehan: toNumber(row.nilai_perolehan),
    metode: typeof row.metode === "string" ? row.metode : "",
    umur_manfaat: toNumber(row.umur_manfaat),
    tarif_penyusutan: toNumber(row.tarif_penyusutan),
    penyusutan_bulanan: toNumber(row.penyusutan_bulanan),
    penyusutan_tahunan: toNumber(row.penyusutan_tahunan),
    akumulasi_penyusutan: toNumber(row.akumulasi_penyusutan),
    nilai_buku: toNumber(row.nilai_buku),
    ppn: toNumber(row.ppn),
    pph23: toNumber(row.pph23),
    total: toNumber(row.total),
    id_jurnal:
      row.id_jurnal === null || row.id_jurnal === undefined
        ? null
        : toNumber(row.id_jurnal),
    last_depresiasi:
      typeof row.last_depresiasi === "string" ? row.last_depresiasi : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function buatRekap(data: LaporanAsetRow[]): RekapAset[] {
  const map = new Map<string, RekapAset>();

  for (const item of data) {
    const kelompok = item.kelompok_aset;

    const existing = map.get(kelompok);

    if (existing) {
      existing.jumlah_aset += item.jumlah;
      existing.total_perolehan += item.nilai_perolehan;
      existing.total_akumulasi_penyusutan += item.akumulasi_penyusutan;
      existing.total_penyusutan_bulanan += item.penyusutan_bulanan;
      existing.total_nilai_buku += item.nilai_buku;
      continue;
    }

    map.set(kelompok, {
      kelompok_aset: kelompok,
      jumlah_aset: item.jumlah,
      total_perolehan: item.nilai_perolehan,
      total_akumulasi_penyusutan: item.akumulasi_penyusutan,
      total_penyusutan_bulanan: item.penyusutan_bulanan,
      total_nilai_buku: item.nilai_buku,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.kelompok_aset.localeCompare(b.kelompok_aset),
  );
}

function buatTotal(data: LaporanAsetRow[]): TotalAset {
  return data.reduce<TotalAset>(
    (total, item) => ({
      jumlah_aset: total.jumlah_aset + item.jumlah,
      total_perolehan: total.total_perolehan + item.nilai_perolehan,
      total_akumulasi_penyusutan:
        total.total_akumulasi_penyusutan + item.akumulasi_penyusutan,
      total_penyusutan_bulanan:
        total.total_penyusutan_bulanan + item.penyusutan_bulanan,
      total_nilai_buku: total.total_nilai_buku + item.nilai_buku,
    }),
    {
      jumlah_aset: 0,
      total_perolehan: 0,
      total_akumulasi_penyusutan: 0,
      total_penyusutan_bulanan: 0,
      total_nilai_buku: 0,
    },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const kelompok = searchParams.get("kelompok");
    const tahun = searchParams.get("tahun");

    let query = db
      .from("v_laporan_aset_tetap")
      .select("*")
      .order("kelompok_aset", { ascending: true })
      .order("tanggal_perolehan", { ascending: true })
      .order("id_aset", { ascending: true });

    if (kelompok !== null && kelompok.trim() !== "") {
      query = query.eq("kelompok_aset", kelompok.trim());
    }

    if (tahun !== null && tahun.trim() !== "") {
      const tahunNumber = Number(tahun);

      if (!Number.isInteger(tahunNumber)) {
        return NextResponse.json(
          {
            error: "Parameter tahun tidak valid",
          },
          {
            status: 400,
          },
        );
      }

      query = query.eq("tahun_perolehan", tahunNumber);
    }

    const { data, error } = await query;

    if (error !== null) {
      console.error("LAPORAN ASET ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: LaporanAsetRow[] = Array.isArray(data)
      ? data.map((row) => normalizeRow(row as Record<string, unknown>))
      : [];

    const rekap: RekapAset[] = buatRekap(rows);
    const total: TotalAset = buatTotal(rows);

    return NextResponse.json({
      data: rows,
      rekap,
      total,
    });
  } catch (error: unknown) {
    console.error("GET LAPORAN ASET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan aset tetap",
      },
      {
        status: 500,
      },
    );
  }
}
