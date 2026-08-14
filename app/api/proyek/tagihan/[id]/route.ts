import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  TagihanProyekSchema,
  type TagihanProyekDetailInput,
} from "@/lib/validators/tagihanproyek";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type ExistingTagihan = {
  id: string;
  id_proyek: string;
  nomor_invoice: string;
  tanggal: string;
  no_bukti: string | null;
  periode: string | null;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
  id_jurnal: number | null;
};

type TotalTagihan = {
  material: number;
  alat_berat: number;
  tenaga_kerja: number;
  operasional: number;
  realisasi: number;
  subkon: number;
  progress: number;
  subtotal: number;
};

function hitungTotalDetail(details: TagihanProyekDetailInput[]): TotalTagihan {
  return details.reduce<TotalTagihan>(
    (acc, detail) => {
      const total = Number(detail.total ?? 0);

      if (!Number.isFinite(total) || total < 0) {
        throw new Error(`Total detail ${detail.sumber} tidak valid.`);
      }

      switch (detail.sumber) {
        case "MATERIAL":
          acc.material += total;
          break;

        case "ALAT_BERAT":
          acc.alat_berat += total;
          break;

        case "TENAGA_KERJA":
          acc.tenaga_kerja += total;
          break;

        case "OPERASIONAL":
          acc.operasional += total;
          break;

        case "REALISASI":
          acc.realisasi += total;
          break;

        case "SUBKON":
          acc.subkon += total;
          break;

        case "PROGRESS":
          acc.progress += total;
          break;
      }

      acc.subtotal += total;

      return acc;
    },
    {
      material: 0,
      alat_berat: 0,
      tenaga_kerja: 0,
      operasional: 0,
      realisasi: 0,
      subkon: 0,
      progress: 0,
      subtotal: 0,
    },
  );
}

/* =====================================================
   UPDATE TAGIHAN
   ===================================================== */

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const json: unknown = await req.json();

    const payload = TagihanProyekSchema.parse(json);

    /* =================================================
       CEK TAGIHAN
       ================================================= */

    const { data: existing, error: existingError } = await db
      .from("proyek_tagihan")
      .select(
        `
        id,
        id_proyek,
        nomor_invoice,
        tanggal,
        no_bukti,
        periode,
        status,
        id_jurnal
        `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Tagihan proyek tidak ditemukan.");
    }

    const tagihan: ExistingTagihan = {
      id: existing.id,
      id_proyek: existing.id_proyek,
      nomor_invoice: existing.nomor_invoice,
      tanggal: existing.tanggal,
      no_bukti: existing.no_bukti,
      periode: existing.periode,
      status: existing.status,
      id_jurnal: existing.id_jurnal,
    };

    /* =================================================
       JURNAL SUDAH POSTED
       JANGAN UBAH DATA YANG MEMPENGARUHI JURNAL
       ================================================= */

    if (tagihan.id_jurnal !== null) {
      throw new Error(
        "Tagihan sudah diposting ke jurnal. Data tagihan tidak dapat diubah.",
      );
    }

    /* =================================================
       VALIDASI PROYEK
       ================================================= */

    if (tagihan.id_proyek !== payload.id_proyek) {
      throw new Error("Tagihan tidak sesuai dengan proyek.");
    }

    /* =================================================
       DETAIL WAJIB ADA
       ================================================= */

    if (payload.details.length === 0) {
      throw new Error("Minimal satu detail tagihan harus dipilih.");
    }

    /* =================================================
       HITUNG TOTAL
       ================================================= */

    const totals = hitungTotalDetail(payload.details);

    if (totals.subtotal <= 0) {
      throw new Error("Total tagihan harus lebih besar dari 0.");
    }

    const nilaiPpn = Number(payload.nilai_ppn ?? 0);
    const nilaiPph = Number(payload.nilai_pph ?? 0);

    if (!Number.isFinite(nilaiPpn) || nilaiPpn < 0) {
      throw new Error("Nilai PPN tidak valid.");
    }

    if (!Number.isFinite(nilaiPph) || nilaiPph < 0) {
      throw new Error("Nilai PPh tidak valid.");
    }

    const grandTotal = totals.subtotal + nilaiPpn - nilaiPph;

    if (!Number.isFinite(grandTotal) || grandTotal < 0) {
      throw new Error("Grand total tagihan tidak valid.");
    }

    /* =================================================
       CEK DUPLIKAT NOMOR INVOICE
       ================================================= */

    const { data: duplicateInvoice } = await db
      .from("proyek_tagihan")
      .select("id")
      .eq("nomor_invoice", payload.nomor_invoice)
      .neq("id", id)
      .maybeSingle();

    if (duplicateInvoice) {
      throw new Error(
        `Nomor invoice ${payload.nomor_invoice} sudah digunakan.`,
      );
    }

    /* =================================================
       NOMOR BUKTI
       ================================================= */

    const noBukti = payload.no_bukti?.trim() || `INV-${payload.nomor_invoice}`;

    /* =================================================
       UPDATE HEADER
       SESUAI DATABASE proyek_tagihan
       ================================================= */

    const { error: updateError } = await db
      .from("proyek_tagihan")
      .update({
        id_proyek: payload.id_proyek,
        nomor_invoice: payload.nomor_invoice,
        tanggal: payload.tanggal,
        nilai: totals.subtotal,
        status: payload.status,
        no_bukti: noBukti,
        periode: payload.periode ?? null,

        total_material: totals.material,
        total_alat_berat: totals.alat_berat,
        total_tenaga_kerja: totals.tenaga_kerja,
        total_operasional: totals.operasional,
        total_realisasi: totals.realisasi,
        total_subkon: totals.subkon,
        total_progress: totals.progress,

        nilai_ppn: nilaiPpn,
        nilai_pph: nilaiPph,
        grand_total: grandTotal,

        created_by: payload.created_by ?? null,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Gagal memperbarui tagihan: ${updateError.message}`);
    }

    /* =================================================
       HAPUS DETAIL LAMA
       ================================================= */

    const { error: deleteDetailError } = await db
      .from("proyek_tagihan_detail")
      .delete()
      .eq("id_tagihan", id);

    if (deleteDetailError) {
      throw new Error(
        `Gagal memperbarui detail tagihan: ${deleteDetailError.message}`,
      );
    }

    /* =================================================
       INSERT DETAIL BARU
       ================================================= */

    const detailPayload = payload.details.map((detail) => ({
      id_tagihan: id,
      sumber: detail.sumber,
      id_referensi: detail.id_referensi,
      no_bukti: detail.no_bukti ?? null,
      uraian: detail.uraian ?? null,
      qty: detail.qty ?? null,
      satuan: detail.satuan ?? null,
      harga: detail.harga ?? null,
      total: detail.total ?? null,

      // Belum diposting
      id_jurnal: null,
    }));

    const { error: detailError } = await db
      .from("proyek_tagihan_detail")
      .insert(detailPayload);

    if (detailError) {
      throw new Error(`Gagal menyimpan detail tagihan: ${detailError.message}`);
    }

    /* =================================================
       AUDIT LOG
       ================================================= */

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_tagihan",
      aksi: "UPDATE",
      id_referensi: id,
      data: {
        id_tagihan: id,
        id_proyek: payload.id_proyek,
        nomor_invoice: payload.nomor_invoice,
        no_bukti: noBukti,
        nilai: totals.subtotal,

        total_material: totals.material,
        total_alat_berat: totals.alat_berat,
        total_tenaga_kerja: totals.tenaga_kerja,
        total_operasional: totals.operasional,
        total_realisasi: totals.realisasi,
        total_subkon: totals.subkon,
        total_progress: totals.progress,

        nilai_ppn: nilaiPpn,
        nilai_pph: nilaiPph,
        grand_total: grandTotal,

        jumlah_detail: payload.details.length,
      },
    });

    if (auditError) {
      console.error("AUDIT UPDATE TAGIHAN ERROR:", auditError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Tagihan proyek dan detail berhasil diperbarui.",
      data: {
        id,
        id_proyek: payload.id_proyek,
        nomor_invoice: payload.nomor_invoice,
        no_bukti: noBukti,
        nilai: totals.subtotal,
        total_material: totals.material,
        total_alat_berat: totals.alat_berat,
        total_tenaga_kerja: totals.tenaga_kerja,
        total_operasional: totals.operasional,
        total_realisasi: totals.realisasi,
        total_subkon: totals.subkon,
        total_progress: totals.progress,
        nilai_ppn: nilaiPpn,
        nilai_pph: nilaiPph,
        grand_total: grandTotal,
      },
    });
  } catch (error: unknown) {
    console.error("PUT TAGIHAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui tagihan proyek.",
      },
      {
        status: 400,
      },
    );
  }
}

/* =====================================================
   DELETE TAGIHAN
   ===================================================== */

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    /* =================================================
       CEK TAGIHAN
       ================================================= */

    const { data: tagihan, error: tagihanError } = await db
      .from("proyek_tagihan")
      .select(
        `
          id,
          nomor_invoice,
          id_jurnal
          `,
      )
      .eq("id", id)
      .single();

    if (tagihanError || !tagihan) {
      throw new Error("Tagihan proyek tidak ditemukan.");
    }

    /* =================================================
       JURNAL TIDAK BOLEH DIHAPUS
       ================================================= */

    if (tagihan.id_jurnal !== null) {
      throw new Error(
        "Tagihan sudah diposting ke jurnal dan tidak dapat dihapus.",
      );
    }

    /* =================================================
       AUDIT DETAIL SEBELUM DELETE
       ================================================= */

    const { data: details, error: detailFetchError } = await db
      .from("proyek_tagihan_detail")
      .select("*")
      .eq("id_tagihan", id);

    if (detailFetchError) {
      throw new Error(
        `Gagal mengambil detail tagihan: ${detailFetchError.message}`,
      );
    }

    /* =================================================
       AUDIT LOG
       ================================================= */

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_tagihan",
      aksi: "DELETE",
      id_referensi: id,
      data: {
        id_tagihan: id,
        nomor_invoice: tagihan.nomor_invoice,
        details,
      },
    });

    if (auditError) {
      console.error("AUDIT DELETE TAGIHAN ERROR:", auditError.message);
    }

    /* =================================================
       DELETE DETAIL
       ================================================= */

    const { error: detailDeleteError } = await db
      .from("proyek_tagihan_detail")
      .delete()
      .eq("id_tagihan", id);

    if (detailDeleteError) {
      throw new Error(
        `Gagal menghapus detail tagihan: ${detailDeleteError.message}`,
      );
    }

    /* =================================================
       DELETE HEADER
       ================================================= */

    const { error: deleteError } = await db
      .from("proyek_tagihan")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Gagal menghapus tagihan: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Tagihan proyek dan detail berhasil dihapus.",
    });
  } catch (error: unknown) {
    console.error("DELETE TAGIHAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus tagihan proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
