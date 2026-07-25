import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import {
  normalizePpn,
  hitungPpn,
  validatePpn,
  type PpnInput,
} from "@/lib/validators/ppn";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   AGGREGATE LINES
========================= */
function aggregateLines(lines: JurnalLine[]): JurnalLine[] {
  const map = new Map<number, JurnalLine>();

  for (const line of lines) {
    const existing = map.get(line.id_coa);

    if (existing) {
      existing.debit += line.debit;
      existing.kredit += line.kredit;
    } else {
      map.set(line.id_coa, { ...line });
    }
  }

  return Array.from(map.values());
}

/* =========================
   POST PPN
========================= */
export async function postPpn(input: PpnInput): Promise<number> {
  /* =========================
     NORMALIZE + VALIDATE
  ========================= */
  const data = normalizePpn(input);
  validatePpn(data);

  const hitung = hitungPpn(data);

  const nilaiPpn = hitung.nilai_ppn;

  if (nilaiPpn <= 0) {
    throw new Error("Nilai PPN tidak valid");
  }

  /* =========================
     COA MAPPING
  ========================= */
  const coaKas = await getCoaMappingDetail("PPN", "KAS");

  const coaHutang = await getCoaMappingDetail("PPN", "HUTANG");

  const coaAset = await getCoaMappingDetail("PPN", "ASET");

  const lines: JurnalLine[] = [];

  /* =========================
     PPN MASUKAN
  ========================= */
  if (data.jenis_ppn === "masukan") {
    lines.push(
      {
        id_coa: coaAset.id_coa,
        debit: nilaiPpn,
        kredit: 0,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: nilaiPpn,
      },
    );
  }

  /* =========================
     PPN KELUARAN
  ========================= */
  if (data.jenis_ppn === "keluaran") {
    lines.push(
      {
        id_coa: coaKas.id_coa,
        debit: nilaiPpn,
        kredit: 0,
      },
      {
        id_coa: coaHutang.id_coa,
        debit: 0,
        kredit: nilaiPpn,
      },
    );
  }

  if (lines.length === 0) {
    throw new Error("Tidak ada jurnal PPN");
  }

  /* =========================
     AGGREGATE
  ========================= */
  const finalLines = aggregateLines(lines);

  /* =========================
     VALIDASI BALANCE
  ========================= */
  const totalDebit = finalLines.reduce((s, l) => s + l.debit, 0);

  const totalKredit = finalLines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal PPN tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */
  const noBukti = `PPN-${Date.now()}`;

  const jurnalId = await postJournal({
    tanggal: data.tanggal_transaksi,
    no_bukti: noBukti,
    keterangan: `PPN ${data.jenis_ppn} - transaksi ${data.id_transaksi}`,
    sumber: "PAJAK",
    modul: "PPN",
    lines: finalLines,
  });

  return jurnalId;
}
