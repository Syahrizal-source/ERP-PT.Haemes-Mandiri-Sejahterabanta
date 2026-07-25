import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import {
  normalizeRekeningKoran,
  validasiJenis,
  type RekeningKoranInput,
} from "@/lib/validators/rekeningKoran";
import type { JurnalLine } from "@/types/accounting";

export async function postRekeningKoran(
  input: RekeningKoranInput,
): Promise<number> {
  const data = normalizeRekeningKoran(input);
  validasiJenis(data);

  const debit: number = data.debit;
  const kredit: number = data.kredit;

  if (debit <= 0 && kredit <= 0) {
    throw new Error("Transaksi tidak valid");
  }

  /* =========================
     COA BANK (DARI REKENING)
  ========================= */
  const { data: rekening } = await db
    .from("rekening_bank")
    .select("id_coa")
    .eq("id", data.id_rekening)
    .single();

  if (!rekening || !rekening.id_coa) {
    throw new Error("COA rekening tidak ditemukan");
  }

  const coaBank: number = Number(rekening.id_coa);

  /* =========================
     COA LAIN
  ========================= */
  const coaBiaya = await getCoaMappingDetail("REKENING_KORAN", "BIAYA");

  const coaPajak = await getCoaMappingDetail("REKENING_KORAN", "PAJAK");

  const coaClearing = await getCoaMappingDetail("REKENING_KORAN", "CLEARING");

  let lines: JurnalLine[] = [];

  /* =========================
     MASUK
  ========================= */
  if (data.jenis === "MASUK") {
    lines = [
      {
        id_coa: coaBank,
        debit: debit,
        kredit: 0,
      },
      {
        id_coa: coaClearing.id_coa,
        debit: 0,
        kredit: debit,
      },
    ];
  }

  /* =========================
     KELUAR
  ========================= */
  if (data.jenis === "KELUAR") {
    lines = [
      {
        id_coa: coaClearing.id_coa,
        debit: kredit,
        kredit: 0,
      },
      {
        id_coa: coaBank,
        debit: 0,
        kredit: kredit,
      },
    ];
  }

  /* =========================
     BIAYA BANK
  ========================= */
  if (data.jenis === "BIAYA_BANK") {
    lines = [
      {
        id_coa: coaBiaya.id_coa,
        debit: kredit,
        kredit: 0,
      },
      {
        id_coa: coaBank,
        debit: 0,
        kredit: kredit,
      },
    ];
  }

  /* =========================
     PAJAK BANK
  ========================= */
  if (data.jenis === "PAJAK_BANK") {
    lines = [
      {
        id_coa: coaPajak.id_coa,
        debit: kredit,
        kredit: 0,
      },
      {
        id_coa: coaBank,
        debit: 0,
        kredit: kredit,
      },
    ];
  }

  /* =========================
     VALIDASI BALANCE
  ========================= */
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance");
  }

  /* =========================
     POST
  ========================= */
  const jurnalId = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `BANK-${Date.now()}`,
    keterangan: `Rekening Koran - ${data.deskripsi}`,
    sumber: "REKENING_KORAN",
    modul: "REKENING_KORAN",
    lines,
  });

  return jurnalId;
}
