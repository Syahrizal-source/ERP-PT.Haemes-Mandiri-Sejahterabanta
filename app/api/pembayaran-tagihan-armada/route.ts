import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  armadaPembayaranTagihanSchema,
  normalizeArmadaPembayaranTagihan,
  validateArmadaPembayaranTagihan,
  type ArmadaPembayaranTagihanInput,
} from "@/lib/validators/tagihan-pembayaran-armada";

type ArmadaRow = {
  id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  no_pintu: string;
  supir: string;
  jumlah_tagihan: number;
  status: string;
};

type CoaKasRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
};

type ArmadaPembayaranTagihanRow = {
  id: string;
  armada_id: number;
  tanggal: string;
  no_bukti: string;
  nominal: number;
  metode_pembayaran: string;
  id_coa_kas: number | null;
  keterangan: string | null;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  id_jurnal: number | null;
  created_at: string;
  updated_at: string;
};

/* ============================================================
   GET
   ============================================================ */

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const armadaIdParam = searchParams.get("armada_id");
    const statusParam = searchParams.get("status");

    let query = db
      .from("armada_pembayaran_tagihan")
      .select(
        `
        id,
        armada_id,
        tanggal,
        no_bukti,
        nominal,
        metode_pembayaran,
        id_coa_kas,
        keterangan,
        status,
        id_jurnal,
        created_at,
        updated_at,
        armada:armada_id (
          id,
          tanggal,
          kode_transaksi,
          no_polisi,
          no_pintu,
          supir,
          jumlah_tagihan,
          status
        ),
        coa_kas:id_coa_kas (
          id_coa,
          kode,
          nama,
          tipe,
          aktif,
          is_cash,
          is_header
        )
        `,
      )
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    /* ========================================================
       FILTER ARMADA
       ======================================================== */

    if (armadaIdParam !== null) {
      const armadaId = Number(armadaIdParam);

      if (!Number.isInteger(armadaId) || armadaId <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "armada_id tidak valid.",
          },
          { status: 400 },
        );
      }

      query = query.eq("armada_id", armadaId);
    }

    /* ========================================================
       FILTER STATUS
       ======================================================== */

    if (statusParam !== null) {
      if (
        statusParam !== "DRAFT" &&
        statusParam !== "POSTED" &&
        statusParam !== "CANCELLED"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Status harus DRAFT, POSTED, atau CANCELLED.",
          },
          { status: 400 },
        );
      }

      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET PEMBAYARAN ARMADA ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: unknown) {
    console.error("GET /api/pembayaran-tagihan-armada ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pembayaran tagihan Armada.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

/* ============================================================
   POST
   Membuat pembayaran DRAFT
   ============================================================ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* ========================================================
       1. BACA BODY
       ======================================================== */

    const body: unknown = await req.json();

    /* ========================================================
       2. ZOD VALIDATION
       ======================================================== */

    const parsed = armadaPembayaranTagihanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Data pembayaran Armada tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    /* ========================================================
       3. NORMALIZE
       ======================================================== */

    const input: ArmadaPembayaranTagihanInput =
      normalizeArmadaPembayaranTagihan(parsed.data);

    /* ========================================================
       4. VALIDASI BISNIS
       ======================================================== */

    validateArmadaPembayaranTagihan(input);

    /* ========================================================
       5. PEMBAYARAN BARU TIDAK BOLEH LANGSUNG POSTED
       ======================================================== */

    if (input.status !== undefined && input.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          error: "Pembayaran baru harus dibuat dengan status DRAFT.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       6. ID JURNAL TIDAK BOLEH DIISI SAAT CREATE
       ======================================================== */

    if (input.id_jurnal !== undefined && input.id_jurnal !== null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "id_jurnal tidak boleh diisi saat membuat pembayaran. " +
            "id_jurnal akan dibuat saat posting.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       7. ARMADA
       ======================================================== */

    const { data: armadaData, error: armadaError } = await db
      .from("armada")
      .select(
        `
        id,
        tanggal,
        kode_transaksi,
        no_polisi,
        no_pintu,
        supir,
        jumlah_tagihan,
        status
        `,
      )
      .eq("id", input.armada_id)
      .maybeSingle();

    if (armadaError) {
      console.error("PEMBAYARAN ARMADA - ARMADA ERROR:", armadaError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data Armada: " + armadaError.message,
        },
        { status: 500 },
      );
    }

    if (!armadaData) {
      return NextResponse.json(
        {
          success: false,
          error: "Data Armada tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const armada: ArmadaRow = armadaData as ArmadaRow;

    const totalTagihan = Number(armada.jumlah_tagihan);

    if (!Number.isFinite(totalTagihan) || totalTagihan <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Armada belum memiliki jumlah tagihan yang valid.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       8. COA KAS/BANK
       
       id_coa_kas berasal dari input.
       
       TAPI TIDAK BOLEH DIPERCAYA LANGSUNG.
       
       Harus:
       - ada
       - aktif
       - is_cash = true
       - is_header = false
       ======================================================== */

    if (input.id_coa_kas === null || input.id_coa_kas === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "COA kas/bank pembayaran wajib dipilih.",
        },
        { status: 422 },
      );
    }

    const { data: coaKasData, error: coaKasError } = await db
      .from("coa")
      .select(
        `
        id_coa,
        kode,
        nama,
        tipe,
        aktif,
        is_cash,
        is_header
        `,
      )
      .eq("id_coa", input.id_coa_kas)
      .maybeSingle();

    if (coaKasError) {
      console.error("PEMBAYARAN ARMADA - COA KAS ERROR:", coaKasError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal memvalidasi COA kas/bank: " + coaKasError.message,
        },
        { status: 500 },
      );
    }

    if (!coaKasData) {
      return NextResponse.json(
        {
          success: false,
          error: "COA kas/bank pembayaran tidak ditemukan.",
        },
        { status: 422 },
      );
    }

    const coaKas: CoaKasRow = coaKasData as CoaKasRow;

    /* ========================================================
       COA TIDAK AKTIF
       ======================================================== */

    if (!coaKas.aktif) {
      return NextResponse.json(
        {
          success: false,
          error: `COA ${coaKas.kode} - ${coaKas.nama} ` + "tidak aktif.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       BUKAN CASH/BANK
       ======================================================== */

    if (!coaKas.is_cash) {
      return NextResponse.json(
        {
          success: false,
          error: `COA ${coaKas.kode} - ${coaKas.nama} ` + "bukan COA kas/bank.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       HEADER COA
       
       Contoh:
       865 Kas Armada = HEADER
       
       Maka HARUS ditolak.
       ======================================================== */

    if (coaKas.is_header) {
      return NextResponse.json(
        {
          success: false,
          error:
            `COA ${coaKas.kode} - ${coaKas.nama} ` +
            "adalah COA header. Gunakan COA kas/bank detail.",
        },
        { status: 422 },
      );
    }

    /* ========================================================
       9. CEK NO BUKTI DUPLIKAT
       ======================================================== */

    const { data: existingPayment, error: existingPaymentError } = await db
      .from("armada_pembayaran_tagihan")
      .select("id, status, id_jurnal")
      .eq("no_bukti", input.no_bukti)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "PEMBAYARAN ARMADA - NO BUKTI ERROR:",
        existingPaymentError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengecek nomor bukti: " + existingPaymentError.message,
        },
        { status: 500 },
      );
    }

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: `No bukti ${input.no_bukti} sudah digunakan.`,
        },
        { status: 409 },
      );
    }

    /* ========================================================
       10. TOTAL PEMBAYARAN YANG SUDAH POSTED
       ======================================================== */

    const { data: postedPayments, error: postedPaymentsError } = await db
      .from("armada_pembayaran_tagihan")
      .select("nominal")
      .eq("armada_id", input.armada_id)
      .eq("status", "POSTED");

    if (postedPaymentsError) {
      console.error(
        "PEMBAYARAN ARMADA - POSTED PAYMENT ERROR:",
        postedPaymentsError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal menghitung pembayaran sebelumnya: " +
            postedPaymentsError.message,
        },
        { status: 500 },
      );
    }

    const totalPembayaran = (postedPayments ?? []).reduce(
      (
        total: number,
        row: {
          nominal: number | string | null;
        },
      ) => {
        return total + Number(row.nominal ?? 0);
      },
      0,
    );

    const sisaTagihan = Number((totalTagihan - totalPembayaran).toFixed(2));

    /* ========================================================
       11. SUDAH LUNAS
       ======================================================== */

    if (sisaTagihan <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Tagihan Armada sudah lunas.",
          data: {
            armada_id: armada.id,
            total_tagihan: totalTagihan,
            total_pembayaran: totalPembayaran,
            sisa_tagihan: 0,
          },
        },
        { status: 422 },
      );
    }

    /* ========================================================
       12. PEMBAYARAN MELEBIHI SISA
       ======================================================== */

    if (input.nominal > sisaTagihan) {
      return NextResponse.json(
        {
          success: false,
          error: "Nominal pembayaran melebihi sisa tagihan Armada.",
          data: {
            armada_id: armada.id,
            total_tagihan: totalTagihan,
            total_pembayaran: totalPembayaran,
            sisa_tagihan: sisaTagihan,
            nominal_pembayaran: input.nominal,
          },
        },
        { status: 422 },
      );
    }

    /* ========================================================
       13. INSERT PEMBAYARAN DRAFT
       ======================================================== */

    const { data: pembayaranData, error: insertError } = await db
      .from("armada_pembayaran_tagihan")
      .insert({
        armada_id: input.armada_id,
        tanggal: input.tanggal,
        no_bukti: input.no_bukti,
        nominal: input.nominal,
        metode_pembayaran: input.metode_pembayaran,
        id_coa_kas: input.id_coa_kas,
        keterangan: input.keterangan ?? null,
        status: "DRAFT",
        id_jurnal: null,
      })
      .select(
        `
        id,
        armada_id,
        tanggal,
        no_bukti,
        nominal,
        metode_pembayaran,
        id_coa_kas,
        keterangan,
        status,
        id_jurnal,
        created_at,
        updated_at
        `,
      )
      .single();

    if (insertError || !pembayaranData) {
      console.error("PEMBAYARAN ARMADA INSERT ERROR:", insertError);

      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ??
            "Gagal menyimpan pembayaran tagihan Armada.",
        },
        { status: 500 },
      );
    }

    const pembayaran = pembayaranData as ArmadaPembayaranTagihanRow;

    /* ========================================================
       14. RESPONSE
       ======================================================== */

    return NextResponse.json(
      {
        success: true,

        message: "Pembayaran tagihan Armada berhasil dibuat sebagai DRAFT.",

        data: {
          pembayaran,

          armada: {
            id: armada.id,
            tanggal: armada.tanggal,
            kode_transaksi: armada.kode_transaksi,
            no_polisi: armada.no_polisi,
            no_pintu: armada.no_pintu,
            supir: armada.supir,
            status: armada.status,
          },

          coa_kas: {
            id_coa: coaKas.id_coa,
            kode: coaKas.kode,
            nama: coaKas.nama,
            tipe: coaKas.tipe,
            aktif: coaKas.aktif,
            is_cash: coaKas.is_cash,
            is_header: coaKas.is_header,
          },

          total_tagihan: totalTagihan,

          total_pembayaran: totalPembayaran,

          sisa_tagihan_sebelum_pembayaran: sisaTagihan,

          sisa_tagihan_setelah_pembayaran: Number(
            (sisaTagihan - input.nominal).toFixed(2),
          ),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/pembayaran-tagihan-armada ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat membuat pembayaran tagihan Armada.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
