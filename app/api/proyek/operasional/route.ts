import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  proyekOperasionalSchema,
  type ProyekOperasionalRequest,
} from "@/lib/validators/proyekOperasional";

import { postOperasional } from "@/lib/accounting/postProyekOperasional";

// =====================================================
// GET
// =====================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    let query = db
      .from("proyek_operasional")
      .select(
        `
          *,
          kategori:kategori_biaya_proyek(
            id,
            kode,
            nama,
            jenis,
            aktif
          )
        `,
      )
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data operasional proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

// =====================================================
// POST
// Simpan + Posting Jurnal
// =====================================================

export async function POST(req: NextRequest) {
  try {
    // =================================================
    // 1. BACA BODY
    // =================================================

    const json: unknown = await req.json();

    // =================================================
    // 2. VALIDASI ZOD
    // =================================================

    const body: ProyekOperasionalRequest = proyekOperasionalSchema.parse(json);

    // =================================================
    // 3. VALIDASI NILAI
    // =================================================

    const qty = Number(body.qty);
    const harga = Number(body.harga);

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("Qty harus lebih besar dari 0.");
    }

    if (!Number.isFinite(harga) || harga < 0) {
      throw new Error("Harga tidak boleh negatif.");
    }

    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Total operasional harus lebih besar dari 0.");
    }

    // =================================================
    // 4. VALIDASI PROYEK
    // =================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select(
        `
          id,
          kode_proyek,
          nama_proyek,
          status
        `,
      )
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (proyek.status !== "OPEN" && proyek.status !== "BERJALAN") {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima transaksi operasional.`,
      );
    }

    // =================================================
    // 5. VALIDASI KATEGORI
    // =================================================

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
      .eq("id", body.id_kategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori operasional tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error(`Kategori ${kategori.nama} sudah tidak aktif.`);
    }

    if (!kategori.kode) {
      throw new Error("Kode kategori operasional tidak ditemukan.");
    }

    // =================================================
    // 6. NOMOR BUKTI
    //
    // Database:
    // no_bukti varchar(50) NOT NULL UNIQUE
    //
    // Kalau user tidak mengisi, sistem membuat otomatis.
    // =================================================

    const noBukti =
      body.no_bukti?.trim() ||
      `OPR-${body.tanggal.replace(/-/g, "")}-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .substring(0, 8)
        .toUpperCase()}`;

    if (noBukti.length > 50) {
      throw new Error("Nomor bukti maksimal 50 karakter.");
    }

    // =================================================
    // 7. CEK DUPLIKAT NO BUKTI
    // =================================================

    const { data: existingNoBukti, error: duplicateError } = await db
      .from("proyek_operasional")
      .select("id")
      .eq("no_bukti", noBukti)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(duplicateError.message);
    }

    if (existingNoBukti) {
      throw new Error(`Nomor bukti ${noBukti} sudah digunakan.`);
    }

    // =================================================
    // 8. PAYLOAD DATABASE
    //
    // Sesuai tabel:
    //
    // id_proyek
    // id_kategori
    // no_bukti
    // tanggal
    // uraian
    // qty
    // satuan
    // harga
    // total
    // supplier
    // metode_pembayaran
    // periode
    // status
    // keterangan
    // created_by
    //
    // id_jurnal TIDAK diisi di sini.
    // =================================================

    const payload = {
      id_proyek: body.id_proyek,
      id_kategori: body.id_kategori,
      no_bukti: noBukti,
      tanggal: body.tanggal,
      uraian: body.uraian,
      qty,
      satuan: body.satuan?.trim() || null,
      harga,
      total,
      supplier: body.supplier?.trim() || null,
      metode_pembayaran: body.metode_pembayaran,
      periode: body.periode?.trim() || null,

      // Transaksi ini langsung diposting.
      status: "POSTED" as const,

      keterangan: body.keterangan?.trim() || null,
      created_by: body.created_by ?? null,
    };

    // =================================================
    // 9. INSERT OPERASIONAL
    // =================================================

    const { data: inserted, error: insertError } = await db
      .from("proyek_operasional")
      .insert(payload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(
        insertError?.message ?? "Operasional proyek gagal disimpan.",
      );
    }

    // =================================================
    // 10. POSTING JURNAL
    //
    // PENTING:
    //
    // COA TIDAK DITENTUKAN DI API.
    //
    // postOperasional() akan:
    //
    // 1. Ambil kategori.kode
    // 2. getCoaMappingDetail("PROYEK", kategori.kode)
    // 3. Tentukan COA lawan berdasarkan:
    //    KAS
    //    KAS_BESAR
    //    KAS_KECIL
    //    BANK
    //    HUTANG
    //
    // Jadi tidak ada hard-code COA.
    // =================================================

    let idJurnal: number;

    try {
      idJurnal = await postOperasional({
        id_operasional: inserted.id,

        id_proyek: inserted.id_proyek,

        id_kategori: inserted.id_kategori,

        no_bukti: inserted.no_bukti,

        tanggal: inserted.tanggal,

        uraian: inserted.uraian,

        qty: Number(inserted.qty),

        satuan: inserted.satuan,

        harga: Number(inserted.harga),

        metode_pembayaran: inserted.metode_pembayaran,

        periode: inserted.periode,

        status: inserted.status,

        supplier: inserted.supplier,

        keterangan: inserted.keterangan,

        created_by: inserted.created_by,
      });
    } catch (postingError: unknown) {
      // ===============================================
      // Jika posting gagal, hapus transaksi draft
      // yang baru saja dibuat.
      //
      // Ini mencegah transaksi operasional tanpa jurnal.
      // ===============================================

      await db
        .from("proyek_operasional")
        .delete()
        .eq("id", inserted.id)
        .is("id_jurnal", null);

      throw postingError;
    }

    // =================================================
    // 11. AMBIL DATA FINAL
    //
    // postOperasional() sudah mengisi id_jurnal.
    // Jadi kita tidak melakukan update kedua kali.
    // =================================================

    const { data: finalData, error: finalError } = await db
      .from("proyek_operasional")
      .select(
        `
          *,
          kategori:kategori_biaya_proyek(
            id,
            kode,
            nama,
            jenis,
            aktif
          )
        `,
      )
      .eq("id", inserted.id)
      .single();

    if (finalError || !finalData) {
      throw new Error(
        `Jurnal ${idJurnal} berhasil dibuat, tetapi data operasional gagal dibaca kembali.`,
      );
    }

    // =================================================
    // 12. PASTIKAN ID JURNAL TERISI
    // =================================================

    if (finalData.id_jurnal === null) {
      throw new Error(
        `Jurnal ${idJurnal} berhasil dibuat tetapi ID jurnal belum terhubung ke operasional.`,
      );
    }

    // =================================================
    // 13. AUDIT LOG
    // =================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_operasional",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: {
        ...finalData,
        id_jurnal: idJurnal,
        kategori: kategori.nama,
        kode_kategori: kategori.kode,
        total,
      },
    });

    // Audit log tidak boleh membatalkan transaksi
    // yang jurnalnya sudah berhasil.
    if (auditError) {
      console.error("AUDIT LOG OPERASIONAL:", auditError.message);
    }

    // =================================================
    // 14. RESPONSE
    // =================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Operasional proyek berhasil ditambahkan dan diposting ke jurnal.",
        data: finalData,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST OPERASIONAL PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan.",
      },
      {
        status: 400,
      },
    );
  }
}
