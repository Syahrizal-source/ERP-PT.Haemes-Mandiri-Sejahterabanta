import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { vendorSchema, type VendorInput } from "@/lib/validators/vendors";

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
  status: boolean;
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
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    pkp: row.pkp ?? null,
    jenis_pajak: row.jenis_pajak ?? null,
    id_coa: row.id_coa ?? null,
  };
}

/* =========================================================
   GET ALL VENDOR
   ========================================================= */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("vendors")
      .select(VENDOR_SELECT)
      .order("nama_vendor", {
        ascending: true,
      });

    if (error) {
      console.error("GET VENDORS ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: VendorRow[] = (data ?? []) as VendorRow[];

    const coaIds: number[] = Array.from(
      new Set(
        rows.map((row) => row.id_coa).filter((id): id is number => id !== null),
      ),
    );

    let coaMap = new Map<number, CoaRow>();

    if (coaIds.length > 0) {
      const { data: coaData, error: coaError } = await db
        .from("coa")
        .select("id_coa, kode, nama")
        .in("id_coa", coaIds);

      if (coaError) {
        console.error("GET VENDOR COA ERROR:", coaError);

        return NextResponse.json(
          {
            error: coaError.message,
          },
          {
            status: 500,
          },
        );
      }

      const coaRows: CoaRow[] = (coaData ?? []) as CoaRow[];

      coaMap = new Map<number, CoaRow>(coaRows.map((coa) => [coa.id_coa, coa]));
    }

    const result: VendorWithCoa[] = rows.map((row) => {
      const vendor = mapVendor(row);

      const coa = row.id_coa !== null ? coaMap.get(row.id_coa) : undefined;

      return {
        ...vendor,
        kode_coa: coa?.kode ?? null,
        nama_coa: coa?.nama ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET VENDORS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data vendor",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST VENDOR
   ========================================================= */

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = vendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data vendor tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const payload: VendorInput = parsed.data;

    /*
     * id_coa sengaja TIDAK dikirim dari API.
     *
     * Database public.vendors sudah memiliki:
     *
     * id_coa BIGINT DEFAULT 7
     *
     * sehingga vendor baru otomatis mendapatkan:
     *
     * id_coa = 7
     * kode   = 12001
     * nama   = Piutang Usaha
     */

    const { data, error } = await db
      .from("vendors")
      .insert(payload)
      .select(VENDOR_SELECT)
      .single();

    if (error || data === null) {
      console.error("POST VENDOR INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: error?.message ?? "Gagal insert vendor",
        },
        {
          status: 500,
        },
      );
    }

    const row: VendorRow = data as VendorRow;

    let kodeCoa: string | null = null;
    let namaCoa: string | null = null;

    if (row.id_coa !== null) {
      const { data: coaData, error: coaError } = await db
        .from("coa")
        .select("id_coa, kode, nama")
        .eq("id_coa", row.id_coa)
        .maybeSingle();

      if (coaError) {
        console.error("POST VENDOR COA ERROR:", coaError);

        return NextResponse.json(
          {
            error: coaError.message,
          },
          {
            status: 500,
          },
        );
      }

      if (coaData !== null) {
        const coa: CoaRow = coaData as CoaRow;

        kodeCoa = coa.kode;
        namaCoa = coa.nama;
      }
    }

    const result: VendorWithCoa = {
      ...mapVendor(row),
      kode_coa: kodeCoa,
      nama_coa: namaCoa,
    };

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error: unknown) {
    console.error("POST VENDOR ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menyimpan vendor",
      },
      {
        status: 500,
      },
    );
  }
}
