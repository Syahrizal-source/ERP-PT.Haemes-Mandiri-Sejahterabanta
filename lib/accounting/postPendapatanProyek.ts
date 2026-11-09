import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";

import {
  validatePendapatanProyek,
  hitungPendapatanProyek,
  type NormalizedPendapatanProyek,
} from "@/lib/validators/pendapatanProyek";

/* ============================================================
   TYPE REQUEST
============================================================ */

export type PostPendapatanProyekInput = NormalizedPendapatanProyek & {
  id_pendapatan: number;
};

/* ============================================================
   TYPE COA
============================================================ */

interface CoaPendapatanProyek {
  id_coa: number;
}

/* ============================================================
   POST PENDAPATAN PROYEK

   COA MAPPING DATABASE:

   PROYEK / PENDAPATAN -> 41103 Pendapatan Proyek
   PROYEK / PIUTANG    -> 12010 Piutang Proyek
   PROYEK / KAS        -> 11030 Kas Proyek
   PROYEK / PPH23      -> 22003 Hutang Pajak PPh 23
   PROYEK / PPH4       -> 22013 Hutang PPh4 Proyek
   PROYEK / UANG_MUKA  -> 14002 Uang Muka Proyek

   Semua jurnal menggunakan id_proyek.

   Fungsi ini hanya membuat jurnal.
   Penyimpanan id_jurnal dilakukan oleh API pendapatan.
============================================================ */

export async function postPendapatanProyek(
  data: PostPendapatanProyekInput,
): Promise<number> {
  /* ==========================================================
     VALIDASI ID PENDAPATAN
  ========================================================== */

  if (!Number.isSafeInteger(data.id_pendapatan) || data.id_pendapatan <= 0) {
    throw new Error("ID pendapatan proyek tidak valid");
  }

  /* ==========================================================
     VALIDASI DATA
  ========================================================== */

  validatePendapatanProyek(data);

  /* ==========================================================
     HITUNG NILAI TRANSAKSI
  ========================================================== */

  const computed = hitungPendapatanProyek(data);

  const nilaiPendapatan = Number(data.nilai_pendapatan.toFixed(2));

  const nilaiPajak = Number(computed.nilai_pajak.toFixed(2));

  const nilaiBersih = Number(computed.nilai_bersih.toFixed(2));

  if (!Number.isFinite(nilaiPendapatan) || nilaiPendapatan <= 0) {
    throw new Error("Nilai transaksi harus lebih besar dari 0");
  }

  if (!Number.isFinite(nilaiPajak) || nilaiPajak < 0) {
    throw new Error("Nilai pajak tidak valid");
  }

  if (!Number.isFinite(nilaiBersih) || nilaiBersih < 0) {
    throw new Error("Nilai bersih tidak valid");
  }

  /* ==========================================================
     TENTUKAN JENIS PENGAKUAN PENDAPATAN
  ========================================================== */

  const mengakuiPendapatan =
    data.jenis_transaksi === "TUNAI" ||
    data.jenis_transaksi === "TERMIN" ||
    data.jenis_transaksi === "REALISASI_UANG_MUKA";

  /* ==========================================================
     AMBIL COA KAS
  ========================================================== */

  const coaKas: CoaPendapatanProyek = await getCoaMappingDetail(
    "PROYEK",
    "KAS",
  );

  /* ==========================================================
     AMBIL COA PENDAPATAN
  ========================================================== */

  let coaPendapatan: CoaPendapatanProyek | null = null;

  if (mengakuiPendapatan) {
    coaPendapatan = await getCoaMappingDetail("PROYEK", "PENDAPATAN");
  }

  /* ==========================================================
     AMBIL COA PIUTANG
  ========================================================== */

  let coaPiutang: CoaPendapatanProyek | null = null;

  if (
    data.jenis_transaksi === "TERMIN" ||
    data.jenis_transaksi === "PENERIMAAN_PIUTANG"
  ) {
    coaPiutang = await getCoaMappingDetail("PROYEK", "PIUTANG");
  }

  /* ==========================================================
     AMBIL COA UANG MUKA
  ========================================================== */

  let coaUangMuka: CoaPendapatanProyek | null = null;

  if (
    data.jenis_transaksi === "UANG_MUKA" ||
    data.jenis_transaksi === "REALISASI_UANG_MUKA"
  ) {
    coaUangMuka = await getCoaMappingDetail("PROYEK", "UANG_MUKA");
  }

  /* ==========================================================
     AMBIL COA PAJAK
  ========================================================== */

  let coaPajak: CoaPendapatanProyek | null = null;

  if (mengakuiPendapatan && nilaiPajak > 0) {
    if (data.jenis_pajak === "NON_FINAL_PPH23") {
      coaPajak = await getCoaMappingDetail("PROYEK", "PPH23");
    } else {
      coaPajak = await getCoaMappingDetail("PROYEK", "PPH4");
    }
  }

  /* ==========================================================
     VALIDASI COA
  ========================================================== */

  const coaIds = [
    coaKas.id_coa,
    coaPendapatan?.id_coa,
    coaPiutang?.id_coa,
    coaUangMuka?.id_coa,
    coaPajak?.id_coa,
  ].filter((id): id is number => id !== undefined);

  for (const id of coaIds) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Mapping COA pendapatan proyek tidak valid");
    }
  }

  /* ==========================================================
     BUILD JURNAL
  ========================================================== */

  const lines: JurnalLine[] = [];

  /* ==========================================================
     1. TUNAI

     Debit  Kas Proyek        = nilai bersih
     Debit  Hutang Pajak      = nilai pajak
     Kredit Pendapatan        = nilai pendapatan
  ========================================================== */

  if (data.jenis_transaksi === "TUNAI") {
    if (coaPendapatan === null) {
      throw new Error("COA Pendapatan Proyek tidak tersedia");
    }

    lines.push({
      id_coa: coaKas.id_coa,
      debit: nilaiBersih,
      kredit: 0,
      id_proyek: data.id_proyek,
    });

    if (nilaiPajak > 0) {
      if (coaPajak === null) {
        throw new Error("COA pajak pendapatan proyek tidak tersedia");
      }

      lines.push({
        id_coa: coaPajak.id_coa,
        debit: nilaiPajak,
        kredit: 0,
        id_proyek: data.id_proyek,
      });
    }

    lines.push({
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: nilaiPendapatan,
      id_proyek: data.id_proyek,
    });
  }

  /* ==========================================================
     2. TERMIN

     Debit  Piutang Proyek    = nilai bersih
     Debit  Hutang Pajak      = nilai pajak
     Kredit Pendapatan        = nilai pendapatan
  ========================================================== */

  if (data.jenis_transaksi === "TERMIN") {
    if (coaPendapatan === null || coaPiutang === null) {
      throw new Error("COA Pendapatan atau Piutang Proyek tidak tersedia");
    }

    lines.push({
      id_coa: coaPiutang.id_coa,
      debit: nilaiBersih,
      kredit: 0,
      id_proyek: data.id_proyek,
    });

    if (nilaiPajak > 0) {
      if (coaPajak === null) {
        throw new Error("COA pajak pendapatan proyek tidak tersedia");
      }

      lines.push({
        id_coa: coaPajak.id_coa,
        debit: nilaiPajak,
        kredit: 0,
        id_proyek: data.id_proyek,
      });
    }

    lines.push({
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: nilaiPendapatan,
      id_proyek: data.id_proyek,
    });
  }

  /* ==========================================================
     3. PENERIMAAN PIUTANG

     Debit  Kas Proyek
     Kredit Piutang Proyek

     Bukan pendapatan baru.
  ========================================================== */

  if (data.jenis_transaksi === "PENERIMAAN_PIUTANG") {
    if (coaPiutang === null) {
      throw new Error("COA Piutang Proyek tidak tersedia");
    }

    lines.push({
      id_coa: coaKas.id_coa,
      debit: nilaiPendapatan,
      kredit: 0,
      id_proyek: data.id_proyek,
    });

    lines.push({
      id_coa: coaPiutang.id_coa,
      debit: 0,
      kredit: nilaiPendapatan,
      id_proyek: data.id_proyek,
    });
  }

  /* ==========================================================
     4. UANG MUKA

     Debit  Kas Proyek
     Kredit Uang Muka Proyek

     Belum menjadi pendapatan.
  ========================================================== */

  if (data.jenis_transaksi === "UANG_MUKA") {
    if (coaUangMuka === null) {
      throw new Error("COA Uang Muka Proyek tidak tersedia");
    }

    lines.push({
      id_coa: coaKas.id_coa,
      debit: nilaiPendapatan,
      kredit: 0,
      id_proyek: data.id_proyek,
    });

    lines.push({
      id_coa: coaUangMuka.id_coa,
      debit: 0,
      kredit: nilaiPendapatan,
      id_proyek: data.id_proyek,
    });
  }

  /* ==========================================================
     5. REALISASI UANG MUKA

     Debit  Uang Muka Proyek  = nilai bersih
     Debit  Hutang Pajak      = nilai pajak
     Kredit Pendapatan        = nilai pendapatan
  ========================================================== */

  if (data.jenis_transaksi === "REALISASI_UANG_MUKA") {
    if (coaUangMuka === null || coaPendapatan === null) {
      throw new Error("COA Uang Muka atau Pendapatan Proyek tidak tersedia");
    }

    lines.push({
      id_coa: coaUangMuka.id_coa,
      debit: nilaiBersih,
      kredit: 0,
      id_proyek: data.id_proyek,
    });

    if (nilaiPajak > 0) {
      if (coaPajak === null) {
        throw new Error("COA pajak pendapatan proyek tidak tersedia");
      }

      lines.push({
        id_coa: coaPajak.id_coa,
        debit: nilaiPajak,
        kredit: 0,
        id_proyek: data.id_proyek,
      });
    }

    lines.push({
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: nilaiPendapatan,
      id_proyek: data.id_proyek,
    });
  }

  /* ==========================================================
     VALIDASI BARIS JURNAL
  ========================================================== */

  if (lines.length < 2) {
    throw new Error("Jurnal pendapatan proyek tidak menghasilkan baris jurnal");
  }

  /* ==========================================================
     HITUNG TOTAL DEBIT DAN KREDIT
  ========================================================== */

  const totalDebit = Number(
    lines.reduce((total, line) => total + line.debit, 0).toFixed(2),
  );

  const totalKredit = Number(
    lines.reduce((total, line) => total + line.kredit, 0).toFixed(2),
  );

  /* ==========================================================
     VALIDASI BALANCE
  ========================================================== */

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Total debit atau kredit jurnal tidak valid");
  }

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  /* ==========================================================
     POST JOURNAL
  ========================================================== */

  const idJurnal = await postJournal({
    tanggal: data.tanggal,
    no_bukti: data.no_bukti,
    keterangan: data.keterangan ?? `Pendapatan Proyek - ${data.id_proyek}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: null,
    id_proyek: data.id_proyek,
    lines,
  });

  /* ==========================================================
     VALIDASI HASIL POSTING
  ========================================================== */

  if (!Number.isSafeInteger(idJurnal) || idJurnal <= 0) {
    throw new Error(
      "Posting jurnal berhasil dipanggil tetapi ID jurnal tidak valid",
    );
  }

  /*
   * Tidak melakukan UPDATE pendapatan_proyek di sini.
   * API pendapatan yang bertanggung jawab menyimpan id_jurnal.
   */

  return idJurnal;
}
