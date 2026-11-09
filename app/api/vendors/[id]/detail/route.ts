import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type Params = {
  id: string;
};

interface VendorRow {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean | null;
  created_at: string;
  updated_at: string | null;
  pkp: boolean | null;
  jenis_pajak: string | null;
  id_coa: number | null;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
}

interface VendorRekeningRow {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface VendorPajakRow {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean | null;
}

interface VendorWithCoa extends VendorRow {
  kode_coa: string | null;
  nama_coa: string | null;
}

const VENDOR_SELECT = `
  id,
  kode_vendor,
  nama_vendor,
  kategori_vendor,
  npwp,
  nama_npwp,
  alamat_npwp,
  telepon,
  email,
  alamat,
  status,
  created_at,
  updated_at,
  pkp,
  jenis_pajak,
  id_coa
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const vendorId = Number(resolvedParams.id);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return NextResponse.json(
        { error: "ID vendor tidak valid" },
        { status: 400 },
      );
    }

    /*
     * ============================================================
     * 1. AMBIL MASTER VENDOR
     * ============================================================
     */

    const { data: vendorData, error: vendorError } = await db
      .from("vendors")
      .select(VENDOR_SELECT)
      .eq("id", vendorId)
      .maybeSingle();

    if (vendorError !== null) {
      console.error("GET VENDOR DETAIL ERROR:", vendorError);

      return NextResponse.json({ error: vendorError.message }, { status: 500 });
    }

    if (vendorData === null) {
      return NextResponse.json(
        { error: "Vendor tidak ditemukan" },
        { status: 404 },
      );
    }

    const vendorRow: VendorRow = vendorData as VendorRow;

    /*
     * ============================================================
     * 2. AMBIL COA VENDOR
     * ============================================================
     *
     * id_coa berasal dari:
     *
     * vendors.id_coa
     *       ↓
     * coa.id_coa
     *
     * Vendor aktif V001-V026 saat ini menggunakan:
     *
     * id_coa = 7
     * kode   = 12001
     * nama   = Piutang Usaha
     *
     * Kita hanya membaca relasinya di sini.
     */

    let kodeCoa: string | null = null;
    let namaCoa: string | null = null;

    if (vendorRow.id_coa !== null) {
      const { data: coaData, error: coaError } = await db
        .from("coa")
        .select("id_coa,kode,nama")
        .eq("id_coa", vendorRow.id_coa)
        .maybeSingle();

      if (coaError !== null) {
        console.error("GET VENDOR COA ERROR:", coaError);

        return NextResponse.json(
          { error: "Gagal mengambil COA vendor" },
          { status: 500 },
        );
      }

      if (coaData !== null) {
        const coa: CoaRow = coaData as CoaRow;

        kodeCoa = coa.kode;
        namaCoa = coa.nama;
      }
    }

    const vendor: VendorWithCoa = {
      id: vendorRow.id,
      kode_vendor: vendorRow.kode_vendor ?? null,
      nama_vendor: vendorRow.nama_vendor,
      kategori_vendor: vendorRow.kategori_vendor ?? null,
      npwp: vendorRow.npwp ?? null,
      nama_npwp: vendorRow.nama_npwp ?? null,
      alamat_npwp: vendorRow.alamat_npwp ?? null,
      telepon: vendorRow.telepon ?? null,
      email: vendorRow.email ?? null,
      alamat: vendorRow.alamat ?? null,
      status: vendorRow.status ?? null,
      created_at: vendorRow.created_at,
      updated_at: vendorRow.updated_at ?? null,
      pkp: vendorRow.pkp ?? null,
      jenis_pajak: vendorRow.jenis_pajak ?? null,
      id_coa: vendorRow.id_coa ?? null,
      kode_coa: kodeCoa,
      nama_coa: namaCoa,
    };

    /*
     * ============================================================
     * 3. AMBIL REKENING VENDOR
     * ============================================================
     */

    const { data: rekeningData, error: rekeningError } = await db
      .from("vendor_rekening")
      .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
      .eq("vendor_id", vendorId)
      .order("id", { ascending: true });

    if (rekeningError !== null) {
      console.error("GET VENDOR REKENING ERROR:", rekeningError);

      return NextResponse.json(
        { error: "Gagal mengambil rekening vendor" },
        { status: 500 },
      );
    }

    const rekeningRows: VendorRekeningRow[] = (rekeningData ??
      []) as VendorRekeningRow[];

    const rekening: VendorRekeningRow[] = rekeningRows.map(
      (row: VendorRekeningRow) => ({
        id: row.id,
        vendor_id: row.vendor_id,
        nama_bank: row.nama_bank,
        nomor_rekening: row.nomor_rekening,
        nama_rekening: row.nama_rekening,
      }),
    );

    /*
     * ============================================================
     * 4. AMBIL DATA PAJAK VENDOR
     * ============================================================
     */

    const { data: pajakData, error: pajakError } = await db
      .from("vendor_pajak")
      .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
      .eq("vendor_id", vendorId)
      .order("id", { ascending: true });

    if (pajakError !== null) {
      console.error("GET VENDOR PAJAK ERROR:", pajakError);

      return NextResponse.json(
        { error: "Gagal mengambil pajak vendor" },
        { status: 500 },
      );
    }

    const pajakRows: VendorPajakRow[] = (pajakData ?? []) as VendorPajakRow[];

    const pajak: VendorPajakRow[] = pajakRows.map((row: VendorPajakRow) => ({
      id: row.id,
      vendor_id: row.vendor_id,
      npwp: row.npwp ?? null,
      nama_npwp: row.nama_npwp ?? null,
      alamat_npwp: row.alamat_npwp ?? null,
      pkp: row.pkp ?? null,
    }));

    /*
     * ============================================================
     * 5. RESPONSE
     * ============================================================
     */

    return NextResponse.json({
      vendor,
      rekening,
      pajak,
    });
  } catch (error: unknown) {
    console.error("GET VENDOR DETAIL ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail vendor",
      },
      { status: 500 },
    );
  }
}
