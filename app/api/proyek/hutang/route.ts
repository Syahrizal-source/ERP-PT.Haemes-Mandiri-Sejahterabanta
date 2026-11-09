import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  proyekHutangSchema,
  type ProyekHutangRequest,
} from "@/lib/validators/proyekHutang";

import { postProyekHutang } from "@/lib/accounting/postProyekHutang";

/* ============================================================
   TYPES
============================================================ */

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
};

type ProyekStatus = "OPEN" | "BERJALAN";

const ALLOWED_PROYEK_STATUS: ProyekStatus[] = ["OPEN", "BERJALAN"];

/* ============================================================
   HELPERS
============================================================ */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

function isValidUuid(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/* ============================================================
   GET
   GET /api/proyek/hutang?id_proyek=UUID
============================================================ */

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    if (!isValidUuid(idProyek)) {
      return NextResponse.json(
        {
          success: false,
          error: "ID proyek tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("proyek_hutang")
      .select(
        `
          id,
          id_proyek,
          supplier,
          tanggal,
          nilai,
          jatuh_tempo,
          status,
          no_bukti,
          periode,
          id_jurnal,
          sumber,
          id_referensi,
          jumlah_pembayaran,
          sisa,
          tanggal_pembayaran,
          keterangan,
          id_kategori,
          created_at,
          updated_at,
          kategori:kategori_biaya_proyek(
            id,
            kode,
            nama,
            jenis
          )
        `,
      )
      .eq("id_proyek", idProyek)
      .order("tanggal", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("GET PROYEK HUTANG ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data hutang proyek.",
          detail: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: data ?? [],
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("GET PROYEK HUTANG EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   POST
============================================================ */

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    /* ========================================================
       VALIDASI REQUEST
    ======================================================== */

    const json: unknown = await req.json();

    const body: ProyekHutangRequest = proyekHutangSchema.parse(json);

    /* ========================================================
       VALIDASI NILAI
    ======================================================== */

    const nilai = Number(body.nilai);

    if (!Number.isFinite(nilai) || nilai <= 0) {
      throw new Error("Nilai hutang harus lebih besar dari 0.");
    }

    /* ========================================================
       VALIDASI TANGGAL
    ======================================================== */

    if (!body.tanggal) {
      throw new Error("Tanggal hutang wajib diisi.");
    }

    if (body.jatuh_tempo && body.jatuh_tempo < body.tanggal) {
      throw new Error(
        "Jatuh tempo tidak boleh lebih kecil dari tanggal hutang.",
      );
    }

    /* ========================================================
       VALIDASI PROYEK
    ======================================================== */

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select(
        `
            id,
            kode_proyek,
            kode_accounting_proyek,
            nama_proyek,
            status
          `,
      )
      .eq("id", body.id_proyek)
      .maybeSingle();

    if (proyekError) {
      throw new Error(`Gagal memeriksa proyek: ${proyekError.message}`);
    }

    if (!proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (!ALLOWED_PROYEK_STATUS.includes(proyek.status as ProyekStatus)) {
      throw new Error(
        `Proyek tidak dapat menerima hutang. Status: ${proyek.status}`,
      );
    }

    /* ========================================================
       VALIDASI KATEGORI
    ======================================================== */

    const idKategori = Number(body.id_kategori);

    if (!Number.isInteger(idKategori) || idKategori <= 0) {
      throw new Error("Kategori biaya proyek tidak valid.");
    }

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select(
        `
          id,
          kode,
          nama,
          jenis,
          aktif
        `,
      )
      .eq("id", idKategori)
      .maybeSingle();

    if (kategoriError) {
      throw new Error(
        `Gagal memeriksa kategori biaya proyek: ${kategoriError.message}`,
      );
    }

    if (!kategori) {
      throw new Error("Kategori biaya proyek tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error("Kategori biaya proyek sudah tidak aktif.");
    }

    /* ========================================================
       NOMOR BUKTI
    ======================================================== */

    const noBukti = `HTG-${crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()}`;

    /* ========================================================
       INSERT HUTANG
    ======================================================== */

    const payload = {
      id_proyek: body.id_proyek,
      id_kategori: idKategori,

      supplier: body.supplier?.trim() ?? "",
      tanggal: body.tanggal,
      nilai,

      jatuh_tempo: body.jatuh_tempo ?? null,

      status: "Unpaid (Menunggu Pembayaran)",

      no_bukti: noBukti,

      periode: body.periode?.trim() || null,

      id_jurnal: null,

      sumber: "PROYEK",

      id_referensi: null,

      jumlah_pembayaran: 0,

      sisa: nilai,

      tanggal_pembayaran: null,

      keterangan: body.keterangan?.trim() || null,
    };

    const { data: hutang, error: insertError } = await db
      .from("proyek_hutang")
      .insert(payload)
      .select()
      .single();

    if (insertError || !hutang) {
      console.error("INSERT PROYEK HUTANG ERROR:", insertError);

      throw new Error(insertError?.message ?? "Gagal menyimpan hutang proyek.");
    }

    /* ========================================================
       POSTING JURNAL
    ======================================================== */

    let idJurnal: number;

    try {
      idJurnal = await postProyekHutang({
        id_hutang: hutang.id,
        id_proyek: hutang.id_proyek,
        id_kategori: hutang.id_kategori,
        supplier: hutang.supplier ?? "",
        tanggal: hutang.tanggal ?? body.tanggal,
        nilai: Number(hutang.nilai),
        jumlah_pembayaran: Number(hutang.jumlah_pembayaran ?? 0),
        jatuh_tempo: hutang.jatuh_tempo,
        periode: hutang.periode,
        keterangan: hutang.keterangan,
        no_bukti: hutang.no_bukti ?? noBukti,
      });
    } catch (error: unknown) {
      console.error("POSTING HUTANG ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Hutang tersimpan tetapi jurnal gagal dibuat.",
          detail: getErrorMessage(error),
          data: {
            id_hutang: hutang.id,
          },
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       UPDATE ID JURNAL
    ======================================================== */

    const { error: updateError } = await db
      .from("proyek_hutang")
      .update({
        id_jurnal: idJurnal,
        id_referensi: hutang.id,
      })
      .eq("id", hutang.id);

    if (updateError) {
      throw new Error(
        `Jurnal berhasil dibuat tetapi gagal menghubungkan jurnal ke hutang: ${updateError.message}`,
      );
    }

    /* ========================================================
       AUDIT LOG
    ======================================================== */

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_hutang",
      aksi: "INSERT",
      id_referensi: hutang.id,
      data: {
        id: hutang.id,
        id_proyek: hutang.id_proyek,

        kode_proyek: proyek.kode_proyek,

        kode_accounting_proyek: proyek.kode_accounting_proyek,

        id_kategori: hutang.id_kategori,

        kategori: kategori.nama,

        kode_kategori: kategori.kode,

        supplier: hutang.supplier,

        tanggal: hutang.tanggal,

        nilai: Number(hutang.nilai),

        jatuh_tempo: hutang.jatuh_tempo,

        no_bukti: hutang.no_bukti,

        periode: hutang.periode,

        jumlah_pembayaran: Number(hutang.jumlah_pembayaran),

        sisa: Number(hutang.sisa),

        id_jurnal: idJurnal,

        keterangan: hutang.keterangan,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG HUTANG ERROR:", auditError);
    }

    /* ========================================================
       RESPONSE
    ======================================================== */

    return NextResponse.json(
      {
        success: true,
        message: "Hutang proyek berhasil ditambahkan.",
        data: {
          ...hutang,
          id_jurnal: idJurnal,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PROYEK HUTANG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
