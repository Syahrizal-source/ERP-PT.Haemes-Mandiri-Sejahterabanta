import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { postProyekMaster } from "@/lib/accounting/postProyekMaster";

/* =========================================================
   TYPES
========================================================= */

type JenisProyek =
  | "PENGURUGAN"
  | "CUT_FILL"
  | "LAND_CLEARING"
  | "JALAN"
  | "DRAINASE"
  | "APARTEMEN"
  | "GEDUNG"
  | "PERUMAHAN";

type StatusProyek =
  | "DRAFT"
  | "OPEN"
  | "BERJALAN"
  | "SELESAI"
  | "DITUTUP"
  | "BATAL";

type MetodeKontrak = "LUMPSUM" | "UNIT_PRICE";

interface CreateProyekRequest {
  kode_proyek: string;
  nama_proyek: string;
  lokasi: string | null;
  id_vendor: number;
  jenis_proyek: JenisProyek | null;
  nilai_kontrak: number;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  project_manager: string;
  status: StatusProyek | null;
  margin_target: number | null;
  metode_kontrak: MetodeKontrak | null;
}

interface VendorCustomerRow {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  status: boolean;
}

interface ProyekMasterRow {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  lokasi: string | null;
  customer: string;
  id_vendor: number | null;
  vendor: VendorCustomerRow | null;
  jenis_proyek: JenisProyek | null;
  nilai_kontrak: number;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  project_manager: string;
  status: StatusProyek | null;
  margin_target: number | null;
  metode_kontrak: MetodeKontrak | null;
  created_at: string | null;
  updated_at: string | null;
  kode_accounting_proyek: string | null;
}

/* =========================================================
   MASTER VALUE

   Harus sama dengan CHECK constraint database.
========================================================= */

const JENIS_PROYEK: readonly JenisProyek[] = [
  "PENGURUGAN",
  "CUT_FILL",
  "LAND_CLEARING",
  "JALAN",
  "DRAINASE",
  "APARTEMEN",
  "GEDUNG",
  "PERUMAHAN",
];

const STATUS_PROYEK: readonly StatusProyek[] = [
  "DRAFT",
  "OPEN",
  "BERJALAN",
  "SELESAI",
  "DITUTUP",
  "BATAL",
];

const METODE_KONTRAK: readonly MetodeKontrak[] = ["LUMPSUM", "UNIT_PRICE"];

/* =========================================================
   TYPE GUARDS
========================================================= */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isJenisProyek(value: unknown): value is JenisProyek {
  return (
    typeof value === "string" && JENIS_PROYEK.includes(value as JenisProyek)
  );
}

function isStatusProyek(value: unknown): value is StatusProyek {
  return (
    typeof value === "string" && STATUS_PROYEK.includes(value as StatusProyek)
  );
}

function isMetodeKontrak(value: unknown): value is MetodeKontrak {
  return (
    typeof value === "string" && METODE_KONTRAK.includes(value as MetodeKontrak)
  );
}

/* =========================================================
   PARSE + VALIDATE CREATE PROYEK
========================================================= */

function parseCreateProyek(body: unknown): CreateProyekRequest {
  if (!isRecord(body)) {
    throw new Error("Body request proyek tidak valid.");
  }

  /* -------------------------------------------------------
     KODE PROYEK
  ------------------------------------------------------- */

  if (typeof body.kode_proyek !== "string" || body.kode_proyek.trim() === "") {
    throw new Error("Kode proyek wajib diisi.");
  }

  /* -------------------------------------------------------
     NAMA PROYEK
  ------------------------------------------------------- */

  if (typeof body.nama_proyek !== "string" || body.nama_proyek.trim() === "") {
    throw new Error("Nama proyek wajib diisi.");
  }

  /* -------------------------------------------------------
     CUSTOMER / VENDOR

     Customer sekarang WAJIB berasal dari Vendor Master.

     UI mengirim:
       id_vendor

     UI TIDAK mengirim customer bebas.
  ------------------------------------------------------- */

  if (!isFiniteNumber(body.id_vendor)) {
    throw new Error("Customer/Vendor wajib dipilih.");
  }

  if (!Number.isInteger(body.id_vendor)) {
    throw new Error("ID Vendor tidak valid.");
  }

  if (body.id_vendor <= 0) {
    throw new Error("ID Vendor tidak valid.");
  }

  /* -------------------------------------------------------
     LOKASI
  ------------------------------------------------------- */

  let lokasi: string | null = null;

  if (body.lokasi !== null && body.lokasi !== undefined) {
    if (typeof body.lokasi !== "string") {
      throw new Error("Lokasi proyek tidak valid.");
    }

    lokasi = body.lokasi.trim() === "" ? null : body.lokasi.trim();
  }

  /* -------------------------------------------------------
     JENIS PROYEK
  ------------------------------------------------------- */

  let jenisProyek: JenisProyek | null = null;

  if (body.jenis_proyek !== null && body.jenis_proyek !== undefined) {
    if (!isJenisProyek(body.jenis_proyek)) {
      throw new Error("Jenis proyek tidak valid.");
    }

    jenisProyek = body.jenis_proyek;
  }

  /* -------------------------------------------------------
     NILAI KONTRAK
  ------------------------------------------------------- */

  if (!isFiniteNumber(body.nilai_kontrak)) {
    throw new Error("Nilai kontrak harus berupa angka.");
  }

  if (body.nilai_kontrak < 0) {
    throw new Error("Nilai kontrak tidak boleh negatif.");
  }

  /* -------------------------------------------------------
     TANGGAL MULAI
  ------------------------------------------------------- */

  if (
    typeof body.tanggal_mulai !== "string" ||
    body.tanggal_mulai.trim() === ""
  ) {
    throw new Error("Tanggal mulai wajib diisi.");
  }

  /* -------------------------------------------------------
     TANGGAL SELESAI
  ------------------------------------------------------- */

  let tanggalSelesai: string | null = null;

  if (body.tanggal_selesai !== null && body.tanggal_selesai !== undefined) {
    if (typeof body.tanggal_selesai !== "string") {
      throw new Error("Tanggal selesai tidak valid.");
    }

    tanggalSelesai =
      body.tanggal_selesai.trim() === "" ? null : body.tanggal_selesai.trim();
  }

  if (tanggalSelesai !== null && tanggalSelesai < body.tanggal_mulai) {
    throw new Error(
      "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.",
    );
  }

  /* -------------------------------------------------------
     PROJECT MANAGER
  ------------------------------------------------------- */

  if (
    typeof body.project_manager !== "string" ||
    body.project_manager.trim() === ""
  ) {
    throw new Error("Project Manager wajib diisi.");
  }

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  let status: StatusProyek | null = "DRAFT";

  if (body.status !== null && body.status !== undefined) {
    if (!isStatusProyek(body.status)) {
      throw new Error("Status proyek tidak valid.");
    }

    status = body.status;
  }

  /* -------------------------------------------------------
     MARGIN TARGET
  ------------------------------------------------------- */

  let marginTarget: number | null = null;

  if (body.margin_target !== null && body.margin_target !== undefined) {
    if (!isFiniteNumber(body.margin_target)) {
      throw new Error("Margin target harus berupa angka.");
    }

    if (body.margin_target < 0) {
      throw new Error("Margin target tidak boleh negatif.");
    }

    marginTarget = body.margin_target;
  }

  /* -------------------------------------------------------
     METODE KONTRAK
  ------------------------------------------------------- */

  let metodeKontrak: MetodeKontrak | null = "LUMPSUM";

  if (body.metode_kontrak !== null && body.metode_kontrak !== undefined) {
    if (!isMetodeKontrak(body.metode_kontrak)) {
      throw new Error("Metode kontrak tidak valid.");
    }

    metodeKontrak = body.metode_kontrak;
  }

  /* -------------------------------------------------------
     RETURN
  ------------------------------------------------------- */

  return {
    kode_proyek: body.kode_proyek.trim(),

    nama_proyek: body.nama_proyek.trim(),

    lokasi,

    id_vendor: body.id_vendor,

    jenis_proyek: jenisProyek,

    nilai_kontrak: body.nilai_kontrak,

    tanggal_mulai: body.tanggal_mulai.trim(),

    tanggal_selesai: tanggalSelesai,

    project_manager: body.project_manager.trim(),

    status,

    margin_target: marginTarget,

    metode_kontrak: metodeKontrak,
  };
}

/* =========================================================
   GET ALL PROYEK
========================================================= */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("proyek_master")
      .select(
        `
        id,
        kode_proyek,
        nama_proyek,
        lokasi,
        customer,
        id_vendor,
        jenis_proyek,
        nilai_kontrak,
        tanggal_mulai,
        tanggal_selesai,
        project_manager,
        status,
        margin_target,
        metode_kontrak,
        created_at,
        updated_at,
        kode_accounting_proyek,
        vendor:vendors!proyek_master_id_vendor_fkey(
          id,
          kode_vendor,
          nama_vendor,
          status
        )
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("GET PROYEK MASTER ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const result: ProyekMasterRow[] = (data ?? []).map((row) => ({
      ...row,
      vendor: row.vendor?.[0] ?? null,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PROYEK MASTER ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST CREATE PROYEK
========================================================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const payload = parseCreateProyek(body);

    /* =====================================================
       VALIDASI VENDOR / CUSTOMER

       Customer harus benar-benar berasal dari
       public.vendors.

       Hanya Vendor aktif yang boleh dipilih.
    ===================================================== */

    const { data: vendor, error: vendorError } = await db
      .from("vendors")
      .select(
        `
        id,
        kode_vendor,
        nama_vendor,
        status
        `,
      )
      .eq("id", payload.id_vendor)
      .eq("status", true)
      .maybeSingle<VendorCustomerRow>();

    if (vendorError) {
      console.error("GET VENDOR CUSTOMER ERROR:", vendorError);

      return NextResponse.json(
        {
          error: "Gagal memvalidasi Customer/Vendor proyek.",
        },
        {
          status: 500,
        },
      );
    }

    if (!vendor) {
      return NextResponse.json(
        {
          error: "Customer/Vendor tidak ditemukan atau sudah tidak aktif.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CUSTOMER DIAMBIL DARI MASTER VENDOR

       Tidak menerima nama customer bebas dari request.

       Sumber:
         vendors.nama_vendor
    ===================================================== */

    const customer = vendor.nama_vendor.trim();

    if (!customer) {
      return NextResponse.json(
        {
          error: "Nama Customer pada master Vendor tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       INSERT MASTER PROYEK

       id_vendor = relasi utama Customer
       customer  = snapshot nama Vendor

       Tidak memasukkan:
       - id
       - created_at
       - updated_at
       - kode_accounting_proyek

       Database/default/trigger tetap menangani
       field tersebut.
    ===================================================== */

    const { data, error } = await db
      .from("proyek_master")
      .insert({
        kode_proyek: payload.kode_proyek,

        nama_proyek: payload.nama_proyek,

        lokasi: payload.lokasi,

        customer,

        id_vendor: vendor.id,

        jenis_proyek: payload.jenis_proyek,

        nilai_kontrak: payload.nilai_kontrak,

        tanggal_mulai: payload.tanggal_mulai,

        tanggal_selesai: payload.tanggal_selesai,

        project_manager: payload.project_manager,

        status: payload.status,

        margin_target: payload.margin_target,

        metode_kontrak: payload.metode_kontrak,
      })
      .select(
        `
        id,
        kode_proyek,
        nama_proyek,
        customer,
        id_vendor,
        nilai_kontrak,
        tanggal_mulai,
        status,
        kode_accounting_proyek
        `,
      )
      .single();

    if (error || !data) {
      console.error("INSERT PROYEK MASTER ERROR:", error);

      throw new Error(error?.message ?? "Proyek gagal disimpan.");
    }

    /* =====================================================
       POSTING JURNAL MASTER PROYEK

       HANYA status OPEN / BERJALAN.

       DRAFT tidak membuat jurnal.

       Jurnal menggunakan:
         postProyekMaster()

       postProyekMaster WAJIB mengambil COA dari:

         PROYEK / PIUTANG
         PROYEK / PENDAPATAN

       BUKAN:
         vendors.id_coa
         id_coa 2747
         hardcode COA lainnya.
    ===================================================== */

    let idJurnal: number | null = null;

    if (data.status === "OPEN" || data.status === "BERJALAN") {
      idJurnal = await postProyekMaster(
        data.tanggal_mulai,
        data.kode_proyek,
        `Pendapatan Proyek ${data.kode_proyek} - ${data.nama_proyek}`,
        Number(data.nilai_kontrak),
        data.id,
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        id: data.id,

        kode_proyek: data.kode_proyek,

        nama_proyek: data.nama_proyek,

        customer: data.customer,

        id_vendor: data.id_vendor,

        nilai_kontrak: data.nilai_kontrak,

        tanggal_mulai: data.tanggal_mulai,

        status: data.status,

        kode_accounting_proyek: data.kode_accounting_proyek,

        id_jurnal: idJurnal,

        message:
          idJurnal !== null
            ? "Proyek berhasil masuk dan jurnal proyek berhasil diposting."
            : "Proyek berhasil masuk.",
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("CREATE PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Proyek gagal disimpan.",
      },
      {
        status: 400,
      },
    );
  }
}
