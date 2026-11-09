import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  vendorUpdateSchema,
  type VendorUpdateInput,
} from "@/lib/validators/vendors";

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

interface VendorWithCoa extends VendorRow {
  kode_coa: string | null;
  nama_coa: string | null;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
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

function mapVendor(row: VendorRow): VendorRow {
  return {
    id: row.id,
    kode_vendor: row.kode_vendor ?? null,
    nama_vendor: row.nama_vendor,
    kategori_vendor: row.kategori_vendor ?? null,
    npwp: row.npwp ?? null,
    nama_npwp: row.nama_npwp ?? null,
    alamat_npwp: row.alamat_npwp ?? null,
    telepon: row.telepon ?? null,
    email: row.email ?? null,
    alamat: row.alamat ?? null,
    status: row.status ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    pkp: row.pkp ?? null,
    jenis_pajak: row.jenis_pajak ?? null,
    id_coa: row.id_coa ?? null,
  };
}

async function getCoa(idCoa: number | null): Promise<{
  kode_coa: string | null;
  nama_coa: string | null;
  error: string | null;
}> {
  if (idCoa === null) {
    return {
      kode_coa: null,
      nama_coa: null,
      error: null,
    };
  }

  const { data, error } = await db
    .from("coa")
    .select("id_coa, kode, nama")
    .eq("id_coa", idCoa)
    .maybeSingle();

  if (error !== null) {
    return {
      kode_coa: null,
      nama_coa: null,
      error: error.message,
    };
  }

  if (data === null) {
    return {
      kode_coa: null,
      nama_coa: null,
      error: null,
    };
  }

  const coa: CoaRow = data as CoaRow;

  return {
    kode_coa: coa.kode,
    nama_coa: coa.nama,
    error: null,
  };
}

export async function PUT(
  req: Request,
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

    const body: unknown = await req.json();

    const parsed = vendorUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data vendor tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload: VendorUpdateInput = parsed.data;

    /*
     * id_coa sengaja tidak ada di payload.
     *
     * COA vendor dikendalikan oleh database:
     *
     * public.vendors.id_coa
     *      ↓
     * public.coa.id_coa
     *
     * Vendor baru menggunakan DEFAULT id_coa = 7.
     *
     * Update vendor tidak boleh mengubah COA secara tidak sengaja.
     */

    const { data, error } = await db
      .from("vendors")
      .update(payload)
      .eq("id", vendorId)
      .select(VENDOR_SELECT)
      .single();

    if (error !== null || data === null) {
      console.error("PUT VENDOR ERROR:", error);

      return NextResponse.json(
        {
          error:
            error?.message ?? "Vendor tidak ditemukan atau gagal update vendor",
        },
        { status: error?.code === "PGRST116" ? 404 : 500 },
      );
    }

    const row: VendorRow = data as VendorRow;

    const coaResult = await getCoa(row.id_coa);

    if (coaResult.error !== null) {
      console.error("PUT VENDOR COA ERROR:", coaResult.error);

      return NextResponse.json({ error: coaResult.error }, { status: 500 });
    }

    const result: VendorWithCoa = {
      ...mapVendor(row),
      kode_coa: coaResult.kode_coa,
      nama_coa: coaResult.nama_coa,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("PUT VENDOR ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal update vendor",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
     * Vendor lama sudah memiliki relasi transaksi.
     *
     * Karena itu DELETE fisik dapat gagal akibat foreign key.
     * Untuk vendor master ERP, lebih aman menggunakan status=false
     * daripada menghapus record yang sudah dipakai transaksi.
     */

    const { data: existingVendor, error: findError } = await db
      .from("vendors")
      .select("id, status")
      .eq("id", vendorId)
      .maybeSingle();

    if (findError !== null) {
      console.error("DELETE VENDOR FIND ERROR:", findError);

      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existingVendor === null) {
      return NextResponse.json(
        { error: "Vendor tidak ditemukan" },
        { status: 404 },
      );
    }

    /*
     * Soft delete:
     * vendor tetap tersimpan untuk menjaga histori transaksi,
     * tetapi tidak lagi aktif digunakan.
     */
    const { data, error } = await db
      .from("vendors")
      .update({
        status: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendorId)
      .select("id,status,updated_at")
      .single();

    if (error !== null || data === null) {
      console.error("DELETE VENDOR UPDATE ERROR:", error);

      return NextResponse.json(
        {
          error: error?.message ?? "Gagal menonaktifkan vendor",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vendor berhasil dinonaktifkan",
      data: {
        id: data.id as number,
        status: data.status as boolean | null,
        updated_at: data.updated_at as string | null,
      },
    });
  } catch (error: unknown) {
    console.error("DELETE VENDOR ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menonaktifkan vendor",
      },
      { status: 500 },
    );
  }
}
