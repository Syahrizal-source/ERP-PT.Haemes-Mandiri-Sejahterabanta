import { db } from "@/lib/supabase/server";
import { postJournal } from "@/lib/accounting/postJournal";

import type { JurnalLine } from "@/types/accounting";

import {
  validateKoreksiLines,
  type JurnalKoreksiInput,
  type JurnalKoreksiLineInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================
   DATABASE TYPES
========================= */

interface JurnalAsalRow {
  id_jurnal: number;
  no_bukti: string;
  is_posted: boolean;
}

interface JurnalDetailAsalRow {
  id_detail: number;
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
}

interface CoaValidationRow {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_header: boolean;
  is_cash: boolean;
  tipe: string;
  normal_balance: string | null;
}

interface KoreksiHistoryRow {
  id_jurnal_koreksi: number;
}

interface JournalDetailHistoryRow {
  id_coa: number;
  debit: number;
  kredit: number;
}

/* =========================
   UTILITIES
========================= */

function toNumber(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function numbersEqual(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.000001;
}

/* =========================
   VALIDASI COA DETAIL
========================= */

async function getValidDetailCoa(
  idCoa: number,
  label: string,
): Promise<CoaValidationRow> {
  const { data, error } = await db
    .from("coa")
    .select(
      `
        id_coa,
        kode,
        nama,
        aktif,
        is_header,
        is_cash,
        tipe,
        normal_balance
      `,
    )
    .eq("id_coa", idCoa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi ${label}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`${label} tidak ditemukan`);
  }

  const coa = data as CoaValidationRow;

  if (!coa.aktif) {
    throw new Error(`${label} ${coa.kode} - ${coa.nama} sudah tidak aktif`);
  }

  if (coa.is_header) {
    throw new Error(
      `${label} ${coa.kode} - ${coa.nama} adalah COA header dan tidak boleh digunakan pada jurnal detail`,
    );
  }

  return coa;
}

/* =========================
   RIWAYAT KOREKSI SEBELUMNYA
========================= */

async function getPreviousCorrectionAmount(
  idJurnalAsal: number,
  idCoaAsal: number,
  sourceSide: "DEBIT" | "KREDIT",
): Promise<number> {
  const { data: koreksiRows, error: koreksiError } = await db
    .from("jurnal_koreksi")
    .select("id_jurnal_koreksi")
    .eq("id_jurnal_asal", idJurnalAsal);

  if (koreksiError) {
    throw new Error(
      `Gagal mengambil riwayat jurnal koreksi: ${koreksiError.message}`,
    );
  }

  const rows = (koreksiRows ?? []) as KoreksiHistoryRow[];

  if (rows.length === 0) {
    return 0;
  }

  const correctionJournalIds = rows
    .map((row): number => Number(row.id_jurnal_koreksi))
    .filter((id): boolean => Number.isInteger(id) && id > 0);

  if (correctionJournalIds.length === 0) {
    return 0;
  }

  const { data: detailRows, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_coa, debit, kredit")
    .in("id_jurnal", correctionJournalIds)
    .eq("id_coa", idCoaAsal);

  if (detailError) {
    throw new Error(
      `Gagal mengambil detail koreksi sebelumnya: ${detailError.message}`,
    );
  }

  const details = (detailRows ?? []) as JournalDetailHistoryRow[];

  return details.reduce(
    (total: number, row: JournalDetailHistoryRow): number => {
      if (sourceSide === "DEBIT") {
        return total + toNumber(row.kredit);
      }

      return total + toNumber(row.debit);
    },
    0,
  );
}

/* =========================
   POST JURNAL KOREKSI
========================= */

export async function postJurnalKoreksi(
  input: JurnalKoreksiInput,
): Promise<number> {
  /* =========================
     VALIDASI INPUT
  ========================= */

  if (!Number.isInteger(input.id_jurnal_asal) || input.id_jurnal_asal <= 0) {
    throw new Error("Jurnal asal wajib dipilih");
  }

  if (!Number.isInteger(input.id_detail_asal) || input.id_detail_asal <= 0) {
    throw new Error("Detail jurnal asal wajib dipilih");
  }

  if (!Number.isInteger(input.id_coa_tujuan) || input.id_coa_tujuan <= 0) {
    throw new Error("COA tujuan koreksi wajib dipilih");
  }

  if (!Number.isFinite(input.nilai_koreksi) || input.nilai_koreksi <= 0) {
    throw new Error("Nilai koreksi harus lebih besar dari 0");
  }

  if (!input.tanggal.trim()) {
    throw new Error("Tanggal jurnal wajib diisi");
  }

  if (!input.no_bukti.trim()) {
    throw new Error("Nomor bukti wajib diisi");
  }

  if (input.keterangan.trim().length < 3) {
    throw new Error("Keterangan minimal 3 karakter");
  }

  if (input.alasan.trim().length < 3) {
    throw new Error("Alasan koreksi minimal 3 karakter");
  }

  validateKoreksiLines(input.lines);

  /* =========================
     VALIDASI JURNAL ASAL
  ========================= */

  const { data: jurnalAsalData, error: jurnalError } = await db
    .from("jurnal")
    .select("id_jurnal, no_bukti, is_posted")
    .eq("id_jurnal", input.id_jurnal_asal)
    .maybeSingle();

  if (jurnalError) {
    throw new Error(`Gagal mengambil jurnal asal: ${jurnalError.message}`);
  }

  if (!jurnalAsalData) {
    throw new Error("Jurnal asal tidak ditemukan");
  }

  const jurnalAsal = jurnalAsalData as JurnalAsalRow;

  if (jurnalAsal.is_posted !== true) {
    throw new Error("Hanya jurnal Posted yang dapat dikoreksi");
  }

  /* =========================
     VALIDASI DETAIL ASAL
  ========================= */

  const { data: detailAsalData, error: detailAsalError } = await db
    .from("jurnal_detail")
    .select(
      `
        id_detail,
        id_jurnal,
        id_coa,
        debit,
        kredit
      `,
    )
    .eq("id_detail", input.id_detail_asal)
    .eq("id_jurnal", input.id_jurnal_asal)
    .maybeSingle();

  if (detailAsalError) {
    throw new Error(
      `Gagal mengambil detail jurnal asal: ${detailAsalError.message}`,
    );
  }

  if (!detailAsalData) {
    throw new Error(
      "Detail jurnal asal tidak ditemukan atau tidak berasal dari jurnal yang dipilih",
    );
  }

  const detailAsal = detailAsalData as JurnalDetailAsalRow;

  const nilaiDebitAsal = toNumber(detailAsal.debit);
  const nilaiKreditAsal = toNumber(detailAsal.kredit);

  if (nilaiDebitAsal <= 0 && nilaiKreditAsal <= 0) {
    throw new Error("Detail jurnal asal tidak memiliki nilai debit/kredit");
  }

  if (nilaiDebitAsal > 0 && nilaiKreditAsal > 0) {
    throw new Error(
      "Detail jurnal asal tidak valid: debit dan kredit sama-sama terisi",
    );
  }

  const sourceSide = nilaiDebitAsal > 0 ? "DEBIT" : "KREDIT";

  const nilaiAsal = sourceSide === "DEBIT" ? nilaiDebitAsal : nilaiKreditAsal;

  /* =========================
     VALIDASI NILAI KOREKSI
  ========================= */

  if (input.nilai_koreksi > nilaiAsal) {
    throw new Error(
      `Nilai koreksi Rp${input.nilai_koreksi.toLocaleString(
        "id-ID",
      )} melebihi nilai asal Rp${nilaiAsal.toLocaleString("id-ID")}`,
    );
  }

  /* =========================
     CEK KOREKSI SEBELUMNYA
  ========================= */

  const previousCorrectionAmount = await getPreviousCorrectionAmount(
    input.id_jurnal_asal,
    detailAsal.id_coa,
    sourceSide,
  );

  const remainingCorrection = nilaiAsal - previousCorrectionAmount;

  if (previousCorrectionAmount > nilaiAsal) {
    throw new Error(
      "Riwayat koreksi sebelumnya sudah melebihi nilai detail jurnal asal. Transaksi baru diblokir.",
    );
  }

  if (input.nilai_koreksi > remainingCorrection) {
    throw new Error(
      `Nilai koreksi melebihi sisa nilai yang masih dapat dikoreksi. Sisa maksimal Rp${remainingCorrection.toLocaleString(
        "id-ID",
      )}`,
    );
  }

  /* =========================
     VALIDASI COA ASAL
  ========================= */

  const coaAsal = await getValidDetailCoa(detailAsal.id_coa, "COA asal");

  /* =========================
     VALIDASI COA TUJUAN
  ========================= */

  const coaTujuan = await getValidDetailCoa(input.id_coa_tujuan, "COA tujuan");

  if (coaTujuan.id_coa === coaAsal.id_coa) {
    throw new Error("COA tujuan tidak boleh sama dengan COA asal");
  }

  /* =========================
     BANGUN DETAIL JURNAL
  ========================= */

  let expectedLines: JurnalKoreksiLineInput[];

  if (sourceSide === "DEBIT") {
    /*
      Jurnal asal:
      DEBIT COA asal

      Jurnal koreksi:
      DEBIT COA tujuan
      KREDIT COA asal
    */

    expectedLines = [
      {
        id_coa: coaTujuan.id_coa,
        debit: input.nilai_koreksi,
        kredit: 0,
      },
      {
        id_coa: coaAsal.id_coa,
        debit: 0,
        kredit: input.nilai_koreksi,
      },
    ];
  } else {
    /*
      Jurnal asal:
      KREDIT COA asal

      Jurnal koreksi:
      DEBIT COA asal
      KREDIT COA tujuan
    */

    expectedLines = [
      {
        id_coa: coaAsal.id_coa,
        debit: input.nilai_koreksi,
        kredit: 0,
      },
      {
        id_coa: coaTujuan.id_coa,
        debit: 0,
        kredit: input.nilai_koreksi,
      },
    ];
  }

  /* =========================
     VALIDASI DETAIL DARI CLIENT
  ========================= */

  if (input.lines.length !== 2) {
    throw new Error("Detail jurnal koreksi harus tepat 2 baris");
  }

  const clientMatches = input.lines.every(
    (line: JurnalKoreksiLineInput, index: number): boolean => {
      const expected = expectedLines[index];

      if (!expected) {
        return false;
      }

      return (
        line.id_coa === expected.id_coa &&
        numbersEqual(line.debit, expected.debit) &&
        numbersEqual(line.kredit, expected.kredit)
      );
    },
  );

  if (!clientMatches) {
    throw new Error(
      "Detail jurnal koreksi tidak sesuai dengan COA asal, COA tujuan, dan nilai koreksi",
    );
  }

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit = expectedLines.reduce(
    (sum: number, line: JurnalKoreksiLineInput) => sum + line.debit,
    0,
  );

  const totalKredit = expectedLines.reduce(
    (sum: number, line: JurnalKoreksiLineInput) => sum + line.kredit,
    0,
  );

  if (!numbersEqual(totalDebit, totalKredit)) {
    throw new Error("Jurnal koreksi tidak balance");
  }

  /* =========================
     POST JURNAL BARU
  ========================= */

  const lines: JurnalLine[] = expectedLines.map(
    (line: JurnalKoreksiLineInput): JurnalLine => ({
      id_coa: line.id_coa,
      debit: line.debit,
      kredit: line.kredit,
    }),
  );

  const jurnalId = await postJournal({
    tanggal: input.tanggal,
    no_bukti: input.no_bukti,
    keterangan: input.keterangan,
    sumber: "KOREKSI",
    modul: "KOREKSI",
    ref_id: null,
    lines,
  });

  if (!Number.isInteger(jurnalId) || jurnalId <= 0) {
    throw new Error(
      "Jurnal koreksi berhasil diproses tetapi ID jurnal tidak valid",
    );
  }

  /* =========================
     SIMPAN RELASI JURNAL KOREKSI
  ========================= */

  const { error: koreksiError } = await db.from("jurnal_koreksi").insert({
    id_jurnal_asal: input.id_jurnal_asal,
    id_jurnal_koreksi: jurnalId,
    alasan: input.alasan.trim(),
  });

  if (koreksiError) {
    throw new Error(
      `Jurnal koreksi ${jurnalId} sudah dibuat, tetapi pencatatan relasi jurnal_koreksi gagal: ${koreksiError.message}`,
    );
  }

  return jurnalId;
}
