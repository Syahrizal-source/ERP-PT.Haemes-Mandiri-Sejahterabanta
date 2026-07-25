import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Params = {
  id: string;
};

type VendorRow = {
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
  status: boolean;
};

type VendorRekeningRow = {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
};

type VendorPajakRow = {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const resolvedParams = await params;

  const vendorId = Number(resolvedParams.id);

  if (!Number.isInteger(vendorId)) {
    return NextResponse.json(
      { error: "ID vendor tidak valid" },
      { status: 400 },
    );
  }

  const { data: vendorData, error: vendorError } = await db
    .from("vendors")
    .select(
      "id,kode_vendor,nama_vendor,kategori_vendor,npwp,nama_npwp,alamat_npwp,telepon,email,alamat,status",
    )
    .eq("id", vendorId)
    .single();

  if (vendorError !== null || vendorData === null) {
    return NextResponse.json(
      { error: "Vendor tidak ditemukan" },
      { status: 404 },
    );
  }

  const vendor: VendorRow = {
    id: vendorData.id as number,
    kode_vendor: vendorData.kode_vendor ?? null,
    nama_vendor: vendorData.nama_vendor as string,
    kategori_vendor: vendorData.kategori_vendor ?? null,
    npwp: vendorData.npwp ?? null,
    nama_npwp: vendorData.nama_npwp ?? null,
    alamat_npwp: vendorData.alamat_npwp ?? null,
    telepon: vendorData.telepon ?? null,
    email: vendorData.email ?? null,
    alamat: vendorData.alamat ?? null,
    status: vendorData.status as boolean,
  };

  const { data: rekeningData, error: rekeningError } = await db
    .from("vendor_rekening")
    .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
    .eq("vendor_id", vendorId)
    .order("id");

  if (rekeningError !== null || rekeningData === null) {
    return NextResponse.json(
      { error: "Gagal mengambil rekening vendor" },
      { status: 500 },
    );
  }

  const rekening: VendorRekeningRow[] = rekeningData.map((row) => ({
    id: row.id as number,
    vendor_id: row.vendor_id as number,
    nama_bank: row.nama_bank as string,
    nomor_rekening: row.nomor_rekening as string,
    nama_rekening: row.nama_rekening as string,
  }));

  const { data: pajakData, error: pajakError } = await db
    .from("vendor_pajak")
    .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
    .eq("vendor_id", vendorId)
    .order("id");

  if (pajakError !== null || pajakData === null) {
    return NextResponse.json(
      { error: "Gagal mengambil pajak vendor" },
      { status: 500 },
    );
  }

  const pajak: VendorPajakRow[] = pajakData.map((row) => ({
    id: row.id as number,
    vendor_id: row.vendor_id as number,
    npwp: row.npwp ?? null,
    nama_npwp: row.nama_npwp ?? null,
    alamat_npwp: row.alamat_npwp ?? null,
    pkp: row.pkp as boolean,
  }));

  return NextResponse.json({
    vendor,
    rekening,
    pajak,
  });
}
