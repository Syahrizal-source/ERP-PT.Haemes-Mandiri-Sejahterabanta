import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

import {
  TagihanProyekSchema,
  TagihanProyekDetailSchema,
  type TagihanProyekInput,
  type TagihanProyekDetailInput,
} from "@/lib/validators/tagihanproyek";

type PostTagihanRequest = TagihanProyekInput & {
  id_tagihan: string;
  details?: TagihanProyekDetailInput[];
};

type SourceRow = {
  id: string;
  id_proyek: string;
  id_jurnal: number | null;
};

export async function postTagihan(data: PostTagihanRequest): Promise<number> {
  // =====================================================
  // VALIDASI HEADER
  // =====================================================

  TagihanProyekSchema.parse(data);

  // =====================================================
  // DETAIL BOLEH KOSONG
  // =====================================================

  const rawDetails = data.details ?? [];

  const details = rawDetails.map((detail) =>
    TagihanProyekDetailSchema.parse(detail),
  );

  // =====================================================
  // AMBIL DATA TAGIHAN
  // =====================================================

  const { data: tagihan, error: tagihanError } = await db
    .from("proyek_tagihan")
    .select(
      `
        id,
        id_proyek,
        nomor_invoice,
        tanggal,
        nilai,
        no_bukti,
        periode,
        status,
        total_progress,
        total_material,
        total_alat_berat,
        total_tenaga_kerja,
        total_operasional,
        total_realisasi,
        total_subkon,
        nilai_ppn,
        nilai_pph,
        grand_total,
        id_jurnal
        `,
    )
    .eq("id", data.id_tagihan)
    .single();

  if (tagihanError || !tagihan) {
    throw new Error("Data tagihan proyek tidak ditemukan.");
  }

  // =====================================================
  // CEGAH POSTING ULANG
  // =====================================================

  if (tagihan.id_jurnal !== null) {
    throw new Error(
      `Tagihan ${tagihan.nomor_invoice} sudah diposting ke jurnal.`,
    );
  }

  // =====================================================
  // VALIDASI PROYEK
  // =====================================================

  if (tagihan.id_proyek !== data.id_proyek) {
    throw new Error("Tagihan tidak sesuai dengan proyek yang dikirim.");
  }

  // =====================================================
  // NILAI TAGIHAN
  // =====================================================

  const nilaiTagihan = Number(tagihan.nilai);

  if (!Number.isFinite(nilaiTagihan) || nilaiTagihan <= 0) {
    throw new Error("Nilai tagihan harus lebih besar dari 0.");
  }

  // =====================================================
  // PAJAK
  // =====================================================

  const nilaiPpn = Number(tagihan.nilai_ppn ?? 0);

  const nilaiPph = Number(tagihan.nilai_pph ?? 0);

  if (!Number.isFinite(nilaiPpn) || nilaiPpn < 0) {
    throw new Error("Nilai PPN tidak valid.");
  }

  if (!Number.isFinite(nilaiPph) || nilaiPph < 0) {
    throw new Error("Nilai PPh tidak valid.");
  }

  const grandTotal = nilaiTagihan + nilaiPpn - nilaiPph;

  if (!Number.isFinite(grandTotal) || grandTotal < 0) {
    throw new Error("Grand total tagihan tidak valid.");
  }

  // =====================================================
  // VALIDASI DETAIL JIKA ADA
  // =====================================================

  const validatedDetails: TagihanProyekDetailInput[] = [];

  for (const detail of details) {
    const source = await getSourceData(detail.sumber, detail.id_referensi);

    if (!source) {
      throw new Error(`Data sumber ${detail.sumber} tidak ditemukan.`);
    }

    if (source.id_proyek !== tagihan.id_proyek) {
      throw new Error(
        `Data ${detail.sumber} bukan berasal dari proyek tagihan.`,
      );
    }

    validatedDetails.push({
      ...detail,
      id_jurnal: detail.id_jurnal ?? source.id_jurnal,
    });
  }

  // =====================================================
  // HITUNG DETAIL
  // =====================================================

  const totalMaterial = calculateTotal(validatedDetails, "MATERIAL");

  const totalAlatBerat = calculateTotal(validatedDetails, "ALAT_BERAT");

  const totalTenagaKerja = calculateTotal(validatedDetails, "TENAGA_KERJA");

  const totalOperasional = calculateTotal(validatedDetails, "OPERASIONAL");

  const totalRealisasi = calculateTotal(validatedDetails, "REALISASI");

  const totalSubkon = calculateTotal(validatedDetails, "SUBKON");

  const totalProgress = calculateTotal(validatedDetails, "PROGRESS");

  // =====================================================
  // COA PIUTANG
  // =====================================================

  const coaPiutang = await getCoaMappingDetail("PROYEK", "PIUTANG");

  // =====================================================
  // COA PENDAPATAN
  // =====================================================

  const coaPendapatan = await getCoaMappingDetail("PROYEK", "PENDAPATAN");

  // =====================================================
  // JURNAL
  //
  // Debit  : Piutang
  // Kredit : Pendapatan
  // =====================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaPiutang.id_coa,
      debit: grandTotal,
      kredit: 0,
      id_proyek: tagihan.id_proyek,
    },
    {
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: grandTotal,
      id_proyek: tagihan.id_proyek,
    },
  ];

  // =====================================================
  // VALIDASI BALANCE
  // =====================================================

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal tagihan tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  // =====================================================
  // NOMOR BUKTI
  // =====================================================

  const noBukti = tagihan.no_bukti?.trim() || tagihan.nomor_invoice;

  // =====================================================
  // POSTING JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: tagihan.tanggal,
    no_bukti: noBukti,
    keterangan: `Tagihan Proyek : ${tagihan.nomor_invoice}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: tagihan.id,
    id_proyek: tagihan.id_proyek,
    lines,
  });

  // =====================================================
  // SIMPAN DETAIL JIKA ADA
  // =====================================================

  if (validatedDetails.length > 0) {
    const detailPayload = validatedDetails.map((detail) => ({
      id_tagihan: tagihan.id,
      sumber: detail.sumber,
      id_referensi: detail.id_referensi,
      no_bukti: detail.no_bukti ?? null,
      uraian: detail.uraian ?? null,
      qty: detail.qty ?? null,
      satuan: detail.satuan ?? null,
      harga: detail.harga ?? null,
      total: detail.total ?? null,
      id_jurnal: detail.id_jurnal ?? null,
    }));

    const { error: detailError } = await db
      .from("proyek_tagihan_detail")
      .insert(detailPayload);

    if (detailError) {
      throw new Error(
        `Jurnal berhasil dibuat tetapi detail tagihan gagal disimpan: ${detailError.message}`,
      );
    }
  }

  // =====================================================
  // UPDATE HEADER
  // =====================================================

  const { error: updateError } = await db
    .from("proyek_tagihan")
    .update({
      id_jurnal: idJurnal,

      total_material: totalMaterial,

      total_alat_berat: totalAlatBerat,

      total_tenaga_kerja: totalTenagaKerja,

      total_operasional: totalOperasional,

      total_realisasi: totalRealisasi,

      total_subkon: totalSubkon,

      total_progress: totalProgress,

      grand_total: grandTotal,
    })
    .eq("id", tagihan.id);

  if (updateError) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi header tagihan gagal diperbarui: ${updateError.message}`,
    );
  }

  return idJurnal;
}

// =========================================================
// HITUNG TOTAL DETAIL
// =========================================================

function calculateTotal(
  details: TagihanProyekDetailInput[],
  sumber: TagihanProyekDetailInput["sumber"],
): number {
  return details
    .filter((detail) => detail.sumber === sumber)
    .reduce((sum, detail) => sum + Number(detail.total ?? 0), 0);
}

// =========================================================
// AMBIL SUMBER DATA
// =========================================================

async function getSourceData(
  sumber: TagihanProyekDetailInput["sumber"],
  idReferensi: string,
): Promise<SourceRow | null> {
  switch (sumber) {
    case "MATERIAL":
      return getSource("proyek_material", idReferensi);

    case "ALAT_BERAT":
      return getSource("proyek_alat_berat", idReferensi);

    case "TENAGA_KERJA":
      return getSource("proyek_tenaga_kerja", idReferensi);

    case "OPERASIONAL":
      return getSource("proyek_operasional", idReferensi);

    case "REALISASI":
      return getSource("proyek_realisasi", idReferensi);

    case "SUBKON":
      return getSource("proyek_subkon", idReferensi);

    case "PROGRESS":
      return getSource("proyek_progress", idReferensi);

    default:
      return null;
  }
}

// =========================================================
// GENERIC SOURCE QUERY
// =========================================================

async function getSource(
  table:
    | "proyek_material"
    | "proyek_alat_berat"
    | "proyek_tenaga_kerja"
    | "proyek_operasional"
    | "proyek_realisasi"
    | "proyek_subkon"
    | "proyek_progress",
  id: string,
): Promise<SourceRow | null> {
  const { data, error } = await db
    .from(table)
    .select("id, id_proyek, id_jurnal")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    id_proyek: data.id_proyek,
    id_jurnal: data.id_jurnal ?? null,
  };
}
