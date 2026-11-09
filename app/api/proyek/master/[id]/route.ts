import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validatePositive } from "@/lib/validator";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateProyekRequest = {
  kode_proyek?: unknown;
  nama_proyek?: unknown;
  lokasi?: unknown;
  id_vendor?: unknown;
  jenis_proyek?: unknown;
  nilai_kontrak?: unknown;
  tanggal_mulai?: unknown;
  tanggal_selesai?: unknown;
  project_manager?: unknown;
  status?: unknown;
  margin_target?: unknown;
  metode_kontrak?: unknown;
};

type VendorCustomerRow = {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  status: boolean;
};

/* =========================================================
   TYPE GUARD
========================================================= */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* =========================================================
   PUT UPDATE PROYEK
========================================================= */

export async function PUT(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id.trim()) {
      return NextResponse.json(
        {
          error: "ID proyek wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    const rawBody: unknown = await req.json();

    if (!isRecord(rawBody)) {
      return NextResponse.json(
        {
          error: "Body request proyek tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const body = rawBody as UpdateProyekRequest;

    /* =====================================================
       VALIDASI NILAI KONTRAK
    ===================================================== */

    if (body.nilai_kontrak !== undefined) {
      if (
        typeof body.nilai_kontrak !== "number" ||
        !Number.isFinite(body.nilai_kontrak)
      ) {
        return NextResponse.json(
          {
            error: "Nilai Kontrak harus berupa angka.",
          },
          {
            status: 400,
          },
        );
      }

      validatePositive(body.nilai_kontrak, "Nilai Kontrak");
    }

    /* =====================================================
       VALIDASI MARGIN TARGET
    ===================================================== */

    if (body.margin_target !== undefined) {
      if (
        typeof body.margin_target !== "number" ||
        !Number.isFinite(body.margin_target)
      ) {
        return NextResponse.json(
          {
            error: "Margin Target harus berupa angka.",
          },
          {
            status: 400,
          },
        );
      }

      validatePositive(body.margin_target, "Margin Target");
    }

    /* =====================================================
       CEK PROYEK
    ===================================================== */

    const { data: existingProject, error: projectError } = await db
      .from("proyek_master")
      .select(
        `
          id,
          kode_proyek,
          nama_proyek,
          customer,
          id_vendor
          `,
      )
      .eq("id", id)
      .maybeSingle();

    if (projectError) {
      console.error("GET PROYEK SEBELUM UPDATE ERROR:", projectError);

      return NextResponse.json(
        {
          error: projectError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!existingProject) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       BUILD UPDATE PAYLOAD
       
       Kita tidak melakukan update(body) langsung.
       
       Tujuannya supaya field yang tidak boleh dikirim
       sembarangan tidak ikut masuk ke database.
    ===================================================== */

    const updatePayload: Record<string, unknown> = {};

    /* -----------------------------------------------------
       KODE PROYEK
    ----------------------------------------------------- */

    if (body.kode_proyek !== undefined) {
      if (
        typeof body.kode_proyek !== "string" ||
        body.kode_proyek.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Kode proyek wajib diisi.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.kode_proyek = body.kode_proyek.trim();
    }

    /* -----------------------------------------------------
       NAMA PROYEK
    ----------------------------------------------------- */

    if (body.nama_proyek !== undefined) {
      if (
        typeof body.nama_proyek !== "string" ||
        body.nama_proyek.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Nama proyek wajib diisi.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.nama_proyek = body.nama_proyek.trim();
    }

    /* -----------------------------------------------------
       LOKASI
    ----------------------------------------------------- */

    if (body.lokasi !== undefined) {
      if (body.lokasi !== null && typeof body.lokasi !== "string") {
        return NextResponse.json(
          {
            error: "Lokasi proyek tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.lokasi =
        body.lokasi === null || body.lokasi.trim() === ""
          ? null
          : body.lokasi.trim();
    }

    /* =====================================================
       CUSTOMER / VENDOR
       
       INI BAGIAN UTAMA PERUBAHAN.
       
       Jika id_vendor dikirim:
       
       id_vendor
          ↓
       vendors.id
          ↓
       vendors.nama_vendor
          ↓
       proyek_master.customer
       
       Tidak menerima customer bebas.
    ===================================================== */

    if (body.id_vendor !== undefined) {
      if (
        typeof body.id_vendor !== "number" ||
        !Number.isInteger(body.id_vendor) ||
        body.id_vendor <= 0
      ) {
        return NextResponse.json(
          {
            error: "ID Vendor tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

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
        .eq("id", body.id_vendor)
        .eq("status", true)
        .maybeSingle<VendorCustomerRow>();

      if (vendorError) {
        console.error("GET VENDOR CUSTOMER UPDATE ERROR:", vendorError);

        return NextResponse.json(
          {
            error: "Gagal memvalidasi Customer/Vendor.",
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

      /*
       * Simpan relasi vendor.
       */
      updatePayload.id_vendor = vendor.id;

      /*
       * Simpan snapshot nama vendor pada customer
       * untuk kompatibilitas dengan struktur lama.
       */
      updatePayload.customer = customer;
    }

    /* =====================================================
       JENIS PROYEK
    ===================================================== */

    if (body.jenis_proyek !== undefined) {
      updatePayload.jenis_proyek = body.jenis_proyek;
    }

    /* =====================================================
       NILAI KONTRAK
    ===================================================== */

    if (body.nilai_kontrak !== undefined) {
      updatePayload.nilai_kontrak = body.nilai_kontrak;
    }

    /* =====================================================
       TANGGAL MULAI
    ===================================================== */

    if (body.tanggal_mulai !== undefined) {
      if (
        typeof body.tanggal_mulai !== "string" ||
        body.tanggal_mulai.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Tanggal mulai wajib diisi.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.tanggal_mulai = body.tanggal_mulai.trim();
    }

    /* =====================================================
       TANGGAL SELESAI
    ===================================================== */

    if (body.tanggal_selesai !== undefined) {
      if (
        body.tanggal_selesai !== null &&
        typeof body.tanggal_selesai !== "string"
      ) {
        return NextResponse.json(
          {
            error: "Tanggal selesai tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.tanggal_selesai =
        body.tanggal_selesai === null || body.tanggal_selesai.trim() === ""
          ? null
          : body.tanggal_selesai.trim();
    }

    /* =====================================================
       VALIDASI RENTANG TANGGAL
    ===================================================== */

    const tanggalMulai =
      typeof updatePayload.tanggal_mulai === "string"
        ? updatePayload.tanggal_mulai
        : null;

    const tanggalSelesai =
      typeof updatePayload.tanggal_selesai === "string"
        ? updatePayload.tanggal_selesai
        : null;

    if (
      tanggalMulai !== null &&
      tanggalSelesai !== null &&
      tanggalSelesai < tanggalMulai
    ) {
      return NextResponse.json(
        {
          error: "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       PROJECT MANAGER
    ===================================================== */

    if (body.project_manager !== undefined) {
      if (
        typeof body.project_manager !== "string" ||
        body.project_manager.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Project Manager wajib diisi.",
          },
          {
            status: 400,
          },
        );
      }

      updatePayload.project_manager = body.project_manager.trim();
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (body.status !== undefined) {
      updatePayload.status = body.status;
    }

    /* =====================================================
       MARGIN TARGET
    ===================================================== */

    if (body.margin_target !== undefined) {
      updatePayload.margin_target = body.margin_target;
    }

    /* =====================================================
       METODE KONTRAK
    ===================================================== */

    if (body.metode_kontrak !== undefined) {
      updatePayload.metode_kontrak = body.metode_kontrak;
    }

    /* =====================================================
       JANGAN UPDATE JIKA PAYLOAD KOSONG
    ===================================================== */

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada data proyek yang diubah.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       UPDATE PROYEK
    ===================================================== */

    const { data, error } = await db
      .from("proyek_master")
      .update(updatePayload)
      .eq("id", id)
      .select(
        `
        id,
        kode_proyek,
        nama_proyek,
        customer,
        id_vendor,
        lokasi,
        jenis_proyek,
        nilai_kontrak,
        tanggal_mulai,
        tanggal_selesai,
        project_manager,
        status,
        margin_target,
        metode_kontrak,
        kode_accounting_proyek,
        updated_at
        `,
      )
      .single();

    if (error) {
      console.error("UPDATE PROYEK MASTER ERROR:", error);

      throw error;
    }

    return NextResponse.json({
      message: "Proyek diupdate",
      data,
    });
  } catch (e: unknown) {
    console.error("PUT PROYEK MASTER ERROR:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Proyek gagal diupdate.",
      },
      {
        status: 400,
      },
    );
  }
}

/* =========================================================
   DELETE PROYEK
========================================================= */

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id.trim()) {
      return NextResponse.json(
        {
          error: "ID proyek wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    const { error } = await db.from("proyek_master").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Proyek dihapus",
    });
  } catch (e: unknown) {
    console.error("DELETE PROYEK MASTER ERROR:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Proyek gagal dihapus.",
      },
      {
        status: 400,
      },
    );
  }
}
