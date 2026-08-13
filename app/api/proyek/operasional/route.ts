import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

import {
  proyekOperasionalSchema,
  ProyekOperasionalRequest,
} from "@/lib/validators/proyekOperasional";

import { postOperasional } from "@/lib/accounting/postProyekOperasional";

export async function GET(req: NextRequest) {
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

    console.log("BODY OPERASIONAL:", json);

    const body: ProyekOperasionalRequest = proyekOperasionalSchema.parse(json);

    // =========================================
    // VALIDASI NILAI
    // =========================================
    validatePositive(body.qty, "Qty");
    validatePositive(body.harga, "Harga");

    const total = Number(body.qty) * Number(body.harga);

    validatePositive(total, "Total");

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
      throw new Error("Kategori operasional tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error("Kategori sudah tidak aktif.");
    }

    // =========================================
    // NOMOR BUKTI OTOMATIS
    // =========================================
    const noBukti =
      body.no_bukti?.trim() ||
      `OPR-${body.tanggal.replace(/-/g, "")}-${crypto
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
      uraian: body.uraian,
      qty: body.qty,
      satuan: body.satuan,
      harga: body.harga,
      total,
      supplier: body.supplier ?? null,
      metode_pembayaran: body.metode_pembayaran,
      periode: body.periode ?? null,

      // Transaksi langsung diposting melalui accounting
      status: "POSTED" as const,

      created_by: body.created_by ?? null,
      keterangan: body.keterangan ?? null,
    };

    // =========================================
    // SIMPAN TRANSAKSI
    // =========================================
    const { data: inserted, error: insertError } = await db
      .from("proyek_operasional")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (!inserted) {
      throw new Error("Operasional proyek gagal disimpan.");
    }

    // =========================================
    // POSTING JURNAL
    // =========================================
    const idJurnal = await postOperasional({
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

    // =========================================
    // SIMPAN ID JURNAL
    // =========================================
    const { error: updateError } = await db
      .from("proyek_operasional")
      .update({
        id_jurnal: idJurnal,
        status: "POSTED",
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
      tabel: "proyek_operasional",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: {
        ...inserted,
        id_jurnal: idJurnal,
        no_bukti: noBukti,
        kategori: kategori.nama,
        kode_kategori: kategori.kode,
        total,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG OPERASIONAL:", auditError.message);
    }

    // =========================================
    // RESPONSE
    // =========================================
    return NextResponse.json(
      {
        success: true,
        message: "Operasional proyek berhasil ditambahkan.",
        data: {
          ...inserted,
          id_jurnal: idJurnal,
          no_bukti: noBukti,
          status: "POSTED",
        },
      },
      {
        status: 201,
      },
    );
  } catch (e: unknown) {
    console.error("POST OPERASIONAL PROYEK ERROR:", e);

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
