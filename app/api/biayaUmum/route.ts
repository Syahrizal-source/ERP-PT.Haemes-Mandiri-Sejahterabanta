import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { postBiayaUmum } from "@/lib/accounting/postBiayaUmum";
import { z } from "zod";

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

type BiayaUmumKategori = "ATK" | "LISTRIK" | "PAM" | "TELPON" | "BUNGA_BANK";

type CoaRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
};

type TransaksiBiayaUmumRow = {
  id: number;
  tanggal: string;
  kategori: string;
  keterangan: string;
  nilai: number;
  id_coa: number | null;
  status_mapping: "BELUM_MAPPING" | "SUDAH_MAPPING" | "DIBATALKAN";
  sumber: "BIAYA_ADM_UMUM";
  created_at: string;
};

/**
 * ============================================================
 * ZOD SCHEMA CREATE
 * ============================================================
 */

const biayaUmumSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(100, "Nomor bukti terlalu panjang."),

  kategori: z.enum(["ATK", "LISTRIK", "PAM", "TELPON", "BUNGA_BANK"]),

  keterangan: z
    .string()
    .trim()
    .min(1, "Keterangan wajib diisi.")
    .max(500, "Keterangan terlalu panjang."),

  nilai: z.number().finite().positive("Nilai biaya harus lebih besar dari 0."),

  id_coa_beban: z.number().int().positive("COA beban tidak valid."),

  id_coa_kas: z.number().int().positive("COA kas/bank tidak valid."),
});

type BiayaUmumInput = z.infer<typeof biayaUmumSchema>;

/**
 * ============================================================
 * ZOD SCHEMA PUT
 * ============================================================
 *
 * PUT digunakan untuk memperbarui transaksi biaya umum.
 *
 * Karena tabel staging saat ini belum menyimpan id_coa_kas
 * dan id_jurnal, PUT hanya mengubah data staging.
 *
 * Tidak melakukan repost jurnal otomatis.
 */

const biayaUmumUpdateSchema = z.object({
  id: z.number().int().positive("ID transaksi tidak valid."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(100, "Nomor bukti terlalu panjang."),

  kategori: z.enum(["ATK", "LISTRIK", "PAM", "TELPON", "BUNGA_BANK"]),

  keterangan: z
    .string()
    .trim()
    .min(1, "Keterangan wajib diisi.")
    .max(500, "Keterangan terlalu panjang."),

  nilai: z.number().finite().positive("Nilai biaya harus lebih besar dari 0."),

  id_coa_beban: z.number().int().positive("COA beban tidak valid."),

  id_coa_kas: z.number().int().positive("COA kas/bank tidak valid."),
});

type BiayaUmumUpdateInput = z.infer<typeof biayaUmumUpdateSchema>;

/**
 * ============================================================
 * HELPER GET COA
 * ============================================================
 */

async function getCoa(idCoa: number): Promise<CoaRow> {
  const { data, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, tipe, aktif, is_cash, is_header")
    .eq("id_coa", idCoa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil COA ${idCoa}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`COA tidak ditemukan. id_coa=${idCoa}.`);
  }

  return {
    id_coa: Number(data.id_coa),
    kode: String(data.kode),
    nama: String(data.nama),
    tipe: String(data.tipe),
    aktif: Boolean(data.aktif),
    is_cash: Boolean(data.is_cash),
    is_header: Boolean(data.is_header),
  };
}

/**
 * ============================================================
 * VALIDASI COA BEBAN
 * ============================================================
 */

function validateCoaBeban(coa: CoaRow): void {
  if (!coa.aktif) {
    throw new Error(`COA beban tidak aktif: ${coa.kode} - ${coa.nama}.`);
  }

  if (coa.is_header) {
    throw new Error(
      `COA beban tidak boleh menggunakan COA header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "BEBAN") {
    throw new Error(
      `COA ${coa.kode} - ${coa.nama} bukan tipe BEBAN. ` +
        `Tipe saat ini: ${coa.tipe}.`,
    );
  }
}

/**
 * ============================================================
 * VALIDASI COA KAS/BANK
 * ============================================================
 */

function validateCoaKas(coa: CoaRow): void {
  if (!coa.aktif) {
    throw new Error(`COA kas/bank tidak aktif: ${coa.kode} - ${coa.nama}.`);
  }

  if (coa.is_header) {
    throw new Error(
      `COA kas/bank tidak boleh menggunakan COA header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(`COA ${coa.kode} - ${coa.nama} bukan COA kas/bank.`);
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA kas/bank ${coa.kode} - ${coa.nama} harus bertipe ASET. ` +
        `Tipe saat ini: ${coa.tipe}.`,
    );
  }
}

/**
 * ============================================================
 * VALIDASI PASANGAN COA
 * ============================================================
 */

async function validateCoaPair(
  idCoaBeban: number,
  idCoaKas: number,
): Promise<{
  beban: CoaRow;
  kas: CoaRow;
}> {
  if (idCoaBeban === idCoaKas) {
    throw new Error("COA beban dan COA kas/bank tidak boleh sama.");
  }

  const beban = await getCoa(idCoaBeban);

  validateCoaBeban(beban);

  const kas = await getCoa(idCoaKas);

  validateCoaKas(kas);

  return {
    beban,
    kas,
  };
}

/**
 * ============================================================
 * GET BIAYA UMUM
 * ============================================================
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("transaksi_biaya_umum")
      .select(
        `
          id,
          tanggal,
          kategori,
          keterangan,
          nilai,
          id_coa,
          status_mapping,
          sumber,
          created_at
        `,
      )
      .order("tanggal", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("GET BIAYA UMUM ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const result: TransaksiBiayaUmumRow[] = data.map((item) => ({
      id: Number(item.id),
      tanggal: String(item.tanggal),
      kategori: String(item.kategori),
      keterangan: String(item.keterangan),
      nilai: Number(item.nilai),
      id_coa: item.id_coa === null ? null : Number(item.id_coa),
      status_mapping:
        item.status_mapping === "SUDAH_MAPPING" ||
        item.status_mapping === "DIBATALKAN"
          ? item.status_mapping
          : "BELUM_MAPPING",
      sumber: "BIAYA_ADM_UMUM",
      created_at: String(item.created_at),
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET BIAYA UMUM ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengambil biaya umum.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * POST BIAYA UMUM
 * ============================================================
 */

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = biayaUmumSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data biaya umum tidak valid.",
          detail: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: BiayaUmumInput = parsed.data;

    /**
     * Validasi COA sebelum INSERT.
     */

    const { beban: coaBeban, kas: coaKas } = await validateCoaPair(
      input.id_coa_beban,
      input.id_coa_kas,
    );

    /**
     * Simpan staging.
     */

    const { data, error } = await db
      .from("transaksi_biaya_umum")
      .insert({
        tanggal: input.tanggal,
        kategori: input.kategori,
        keterangan: input.keterangan,
        nilai: input.nilai,
        id_coa: coaBeban.id_coa,
        status_mapping: "SUDAH_MAPPING",
        sumber: "BIAYA_ADM_UMUM",
      })
      .select(
        `
            id,
            tanggal,
            kategori,
            keterangan,
            nilai,
            id_coa,
            status_mapping,
            sumber,
            created_at
          `,
      )
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? "Gagal menyimpan transaksi biaya umum.",
      );
    }

    /**
     * Posting jurnal.
     */

    let jurnalId: number;

    try {
      jurnalId = await postBiayaUmum(
        input.tanggal,
        input.no_bukti,
        input.keterangan,
        input.nilai,
        coaBeban.id_coa,
        coaKas.id_coa,
        input.kategori,
      );
    } catch (error: unknown) {
      await db
        .from("transaksi_biaya_umum")
        .update({
          status_mapping: "BELUM_MAPPING",
        })
        .eq("id", data.id);

      throw error;
    }

    return NextResponse.json(
      {
        message: "Biaya umum berhasil disimpan dan diposting.",
        data: {
          id: Number(data.id),
          tanggal: String(data.tanggal),
          no_bukti: input.no_bukti,
          kategori: input.kategori,
          keterangan: String(data.keterangan),
          nilai: Number(data.nilai),
          id_coa_beban: coaBeban.id_coa,
          kode_coa_beban: coaBeban.kode,
          nama_coa_beban: coaBeban.nama,
          id_coa_kas: coaKas.id_coa,
          kode_coa_kas: coaKas.kode,
          nama_coa_kas: coaKas.nama,
          status_mapping: "SUDAH_MAPPING",
          id_jurnal: jurnalId,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST BIAYA UMUM ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menyimpan biaya umum.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * PUT BIAYA UMUM
 * ============================================================
 *
 * PUT digunakan untuk mengubah transaksi staging.
 *
 * PENTING:
 * transaksi lama yang sudah pernah diposting ke jurnal
 * TIDAK otomatis dibuatkan jurnal kedua.
 *
 * PUT hanya memperbarui record transaksi.
 *
 * Jika transaksi sudah terlanjur POSTED dan ingin diubah,
 * seharusnya nanti menggunakan mekanisme koreksi/reversal,
 * bukan overwrite jurnal lama.
 */

export async function PUT(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = biayaUmumUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data update biaya umum tidak valid.",
          detail: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: BiayaUmumUpdateInput = parsed.data;

    /**
     * ========================================================
     * CEK TRANSAKSI
     * ========================================================
     */

    const { data: existing, error: existingError } = await db
      .from("transaksi_biaya_umum")
      .select(
        `
          id,
          tanggal,
          kategori,
          keterangan,
          nilai,
          id_coa,
          status_mapping,
          sumber,
          created_at
        `,
      )
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal mengambil transaksi biaya umum: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: `Transaksi biaya umum dengan id=${input.id} tidak ditemukan.`,
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ========================================================
     * CEGAH UPDATE TRANSAKSI DIBATALKAN
     * ========================================================
     */

    if (existing.status_mapping === "DIBATALKAN") {
      return NextResponse.json(
        {
          error: "Transaksi yang sudah DIBATALKAN tidak dapat diubah.",
        },
        {
          status: 409,
        },
      );
    }

    /**
     * ========================================================
     * VALIDASI COA BARU
     * ========================================================
     */

    const { beban: coaBeban, kas: coaKas } = await validateCoaPair(
      input.id_coa_beban,
      input.id_coa_kas,
    );

    /**
     * ========================================================
     * UPDATE STAGING
     * ========================================================
     *
     * id_coa menyimpan COA beban detail.
     */

    const { data: updated, error: updateError } = await db
      .from("transaksi_biaya_umum")
      .update({
        tanggal: input.tanggal,
        kategori: input.kategori,
        keterangan: input.keterangan,
        nilai: input.nilai,
        id_coa: coaBeban.id_coa,
        status_mapping: "SUDAH_MAPPING",
      })
      .eq("id", input.id)
      .select(
        `
          id,
          tanggal,
          kategori,
          keterangan,
          nilai,
          id_coa,
          status_mapping,
          sumber,
          created_at
        `,
      )
      .single();

    if (updateError || !updated) {
      throw new Error(
        updateError?.message ?? "Gagal memperbarui transaksi biaya umum.",
      );
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json(
      {
        message: "Biaya umum berhasil diperbarui.",
        data: {
          id: Number(updated.id),
          tanggal: String(updated.tanggal),
          no_bukti: input.no_bukti,
          kategori: String(updated.kategori),
          keterangan: String(updated.keterangan),
          nilai: Number(updated.nilai),
          id_coa_beban: coaBeban.id_coa,
          kode_coa_beban: coaBeban.kode,
          nama_coa_beban: coaBeban.nama,
          id_coa_kas: coaKas.id_coa,
          kode_coa_kas: coaKas.kode,
          nama_coa_kas: coaKas.nama,
          status_mapping: "SUDAH_MAPPING",
          catatan:
            "PUT hanya memperbarui staging. Jurnal lama tidak diubah dan tidak dibuat ulang.",
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("PUT BIAYA UMUM ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memperbarui biaya umum.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
