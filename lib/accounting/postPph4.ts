import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph4, type Pph4Input } from "@/lib/validators/pph4";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST PPH4
========================= */

export async function postPph4(
  input: Pph4Input,
  pph4Id: number,
): Promise<number> {
  /* =========================
     VALIDASI INPUT
  ========================= */

  if (!Number.isInteger(pph4Id) || pph4Id <= 0) {
    throw new Error("ID PPh4 tidak valid");
  }

  if (!Number.isFinite(input.nilai_transaksi)) {
    throw new Error("Nilai transaksi tidak valid");
  }

  if (input.nilai_transaksi < 0) {
    throw new Error("Nilai transaksi tidak boleh minus");
  }

  if (!Number.isFinite(input.tarif_pph4)) {
    throw new Error("Tarif PPh4 tidak valid");
  }

  if (input.tarif_pph4 < 0) {
    throw new Error("Tarif PPh4 tidak boleh minus");
  }

  /* =========================
     VALIDASI PPN

     PPN hanya menjadi data
     pendukung transaksi PPh4.

     PPN TIDAK digunakan untuk
     mengurangi dasar PPh4.

     PPN juga TIDAK diposting
     sebagai jurnal tambahan
     di sini.
  ========================= */

  const ppn: number = Math.max(0, input.ppn ?? 0);

  if (!Number.isFinite(ppn)) {
    throw new Error("Nilai PPN tidak valid");
  }

  /* =========================
     HITUNG PPH4 OTOMATIS

     POTONGAN TIDAK DIAMBIL
     DARI INPUT.

     Rumus:

     Nilai Transaksi
     ×
     Tarif PPh4
     /
     100

     Contoh:

     241.384.655 × 4%
     = 9.655.386,20
  ========================= */

  const nilaiPph4: number = hitungPph4(input);

  if (!Number.isFinite(nilaiPph4)) {
    throw new Error("Nilai PPh4 tidak valid");
  }

  const nilaiFinal: number = Math.max(0, nilaiPph4);

  if (nilaiFinal <= 0) {
    throw new Error("Nilai PPh4 tidak valid");
  }

  /* =========================
     AMBIL COA MAPPING
  ========================= */

  const coaBeban = await getCoaMappingDetail("PAJAK_PPH4", "BEBAN");

  const coaHutang = await getCoaMappingDetail("PAJAK_PPH4", "HUTANG");

  /* =========================
     JURNAL PPH4

     Beban PPh4       Debit
     Hutang PPh4      Kredit

     Nilainya berasal dari
     hasil perhitungan otomatis.
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaBeban.id_coa,
      debit: nilaiFinal,
      kredit: 0,
    },
    {
      id_coa: coaHutang.id_coa,
      debit: 0,
      kredit: nilaiFinal,
    },
  ];

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error("Jurnal PPh4 tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId: number = await postJournal({
    tanggal: input.tanggal_transaksi,
    no_bukti: `PPH4-${pph4Id}`,
    keterangan: `PPh4 - ${input.jenis_objek}`,
    sumber: "PAJAK_PPH4",
    modul: "PAJAK_PPH4",
    lines,
  });

  return jurnalId;
}
