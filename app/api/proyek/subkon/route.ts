import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  proyekSubkonSchema,
  ProyekSubkonRequest,
} from "@/lib/validators/proyekSubkon";

import { postProyekSubkon } from "@/lib/accounting/postProyekSubkon";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const idProyek = searchParams.get("id_proyek");

  let query = db
    .from("proyek_subkon")
    .select(
      `
        *,
        kategori:kategori_biaya_proyek(
          id,
          kode,
          nama,
          jenis
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    // =========================================
    // BACA BODY HANYA SEKALI
    // =========================================
    const json: unknown = await req.json();

    console.log("BODY SUBKON:", json);

    const body: ProyekSubkonRequest = proyekSubkonSchema.parse(json);

    // =========================================
    // VALIDASI PROYEK
    // =========================================
    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (!["OPEN", "BERJALAN"].includes(proyek.status)) {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima transaksi.`,
      );
    }

    // =========================================
    // VALIDASI KATEGORI
    // =========================================
    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select("id, kode, nama, aktif, jenis")
      .eq("id", body.id_kategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori subkon tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error("Kategori subkon sudah tidak aktif.");
    }

    // =========================================
    // KATEGORI HARUS SUBKON
    // =========================================
    if (kategori.kode !== "SUBKON") {
      throw new Error(`Kategori ${kategori.kode} bukan kategori SUBKON.`);
    }

    // =========================================
    // VALIDASI NILAI KONTRAK
    // =========================================
    const nilaiKontrak = Number(body.nilai_kontrak);

    if (!Number.isFinite(nilaiKontrak) || nilaiKontrak <= 0) {
      throw new Error("Nilai kontrak subkon harus lebih besar dari 0.");
    }

    // =========================================
    // NOMOR BUKTI OTOMATIS BACKEND
    // =========================================
    const noBukti =
      body.no_bukti?.trim() ||
      `SUB-${body.tanggal.replace(/-/g, "")}-${crypto
        .randomUUID()
        .substring(0, 6)
        .toUpperCase()}`;

    // =========================================
    // PAYLOAD DATABASE
    // =========================================
    const payload = {
      id_proyek: body.id_proyek,
      id_kategori: body.id_kategori,
      no_bukti: noBukti,
      tanggal: body.tanggal,
      nama_vendor: body.nama_vendor,
      pekerjaan: body.pekerjaan,
      nilai_kontrak: nilaiKontrak,
      metode_pembayaran: body.metode_pembayaran,
      periode: body.periode ?? null,

      // Transaksi langsung diposting
      status: body.status ?? "AKTIF",

      created_by: body.created_by ?? null,
      keterangan: body.keterangan ?? null,
    };

    // =========================================
    // SIMPAN SUBKON
    // =========================================
    const { data: inserted, error: insertError } = await db
      .from("proyek_subkon")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (!inserted) {
      throw new Error("Data subkon gagal disimpan.");
    }

    // =========================================
    // POSTING JURNAL
    // =========================================
    const idJurnal = await postProyekSubkon({
      id_subkon: inserted.id,
      id_proyek: inserted.id_proyek,
      id_kategori: inserted.id_kategori,
      no_bukti: inserted.no_bukti,
      tanggal: inserted.tanggal,
      nama_vendor: inserted.nama_vendor,
      pekerjaan: inserted.pekerjaan,
      nilai_kontrak: Number(inserted.nilai_kontrak),
      metode_pembayaran: inserted.metode_pembayaran,
      periode: inserted.periode,
      status: inserted.status,
      created_by: inserted.created_by,
      keterangan: inserted.keterangan,
    });

    // =========================================
    // UPDATE ID JURNAL
    // =========================================
    const { error: updateError } = await db
      .from("proyek_subkon")
      .update({
        id_jurnal: idJurnal,
      })
      .eq("id", inserted.id);

    if (updateError) {
      throw new Error(
        `Jurnal berhasil dibuat tetapi gagal menghubungkan transaksi: ${updateError.message}`,
      );
    }

    // =========================================
    // AUDIT LOG
    // =========================================
    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_subkon",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: {
        ...inserted,
        id_jurnal: idJurnal,
        no_bukti: noBukti,
        kategori: kategori.nama,
        kode_kategori: kategori.kode,
        nilai_kontrak: nilaiKontrak,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG SUBKON:", auditError.message);
    }

    // =========================================
    // RESPONSE
    // =========================================
    return NextResponse.json(
      {
        success: true,
        message: "Subkon proyek berhasil ditambahkan.",
        data: {
          ...inserted,
          id_jurnal: idJurnal,
          no_bukti: noBukti,
        },
      },
      {
        status: 201,
      },
    );
  } catch (e: unknown) {
    console.error("POST SUBKON PROYEK ERROR:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Terjadi kesalahan.",
      },
      {
        status: 400,
      },
    );
  }
}
