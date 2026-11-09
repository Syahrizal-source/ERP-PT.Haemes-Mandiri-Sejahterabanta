import { postJournal } from "./postJournal";
import type { JurnalLine } from "@/types/accounting";
import { db } from "@/lib/supabase/server";

export type BiayaUmumKategori =
  | "ATK"
  | "LISTRIK"
  | "PAM"
  | "TELPON"
  | "BUNGA_BANK";

interface CoaValidationResult {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_header: boolean;
  is_cash: boolean;
  tipe: string;
}

export async function postBiayaUmum(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  id_coa_beban: number,
  id_coa_kas: number,
  kategori: BiayaUmumKategori,
): Promise<number> {
  if (nominal <= 0) {
    throw new Error("Nominal biaya umum harus lebih besar dari 0.");
  }

  if (!Number.isInteger(id_coa_beban) || id_coa_beban <= 0) {
    throw new Error("COA beban tidak valid.");
  }

  if (!Number.isInteger(id_coa_kas) || id_coa_kas <= 0) {
    throw new Error("COA kas/bank tidak valid.");
  }

  if (id_coa_beban === id_coa_kas) {
    throw new Error(
      `COA beban dan COA kas/bank tidak boleh sama. id_coa=${id_coa_beban}.`,
    );
  }

  const { data: bebanData, error: bebanError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, is_cash, tipe")
    .eq("id_coa", id_coa_beban)
    .maybeSingle();

  if (bebanError) {
    throw new Error(
      `Gagal mengambil COA beban ${id_coa_beban}: ${bebanError.message}`,
    );
  }

  if (!bebanData) {
    throw new Error(`COA beban tidak ditemukan. id_coa=${id_coa_beban}.`);
  }

  const beban: CoaValidationResult = {
    id_coa: Number(bebanData.id_coa),
    kode: bebanData.kode,
    nama: bebanData.nama,
    aktif: bebanData.aktif,
    is_header: bebanData.is_header ?? false,
    is_cash: bebanData.is_cash,
    tipe: bebanData.tipe,
  };

  if (!beban.aktif) {
    throw new Error(`COA beban tidak aktif: ${beban.kode} - ${beban.nama}.`);
  }

  if (beban.is_header) {
    throw new Error(
      `COA beban tidak boleh menggunakan COA header: ` +
        `${beban.kode} - ${beban.nama}.`,
    );
  }

  if (beban.tipe !== "BEBAN") {
    throw new Error(
      `COA ${beban.kode} - ${beban.nama} bukan tipe BEBAN. ` +
        `Tipe saat ini: ${beban.tipe}.`,
    );
  }

  const { data: kasData, error: kasError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, is_cash, tipe")
    .eq("id_coa", id_coa_kas)
    .maybeSingle();

  if (kasError) {
    throw new Error(
      `Gagal mengambil COA kas/bank ${id_coa_kas}: ${kasError.message}`,
    );
  }

  if (!kasData) {
    throw new Error(`COA kas/bank tidak ditemukan. id_coa=${id_coa_kas}.`);
  }

  const kas: CoaValidationResult = {
    id_coa: Number(kasData.id_coa),
    kode: kasData.kode,
    nama: kasData.nama,
    aktif: kasData.aktif,
    is_header: kasData.is_header ?? false,
    is_cash: kasData.is_cash,
    tipe: kasData.tipe,
  };

  if (!kas.aktif) {
    throw new Error(`COA kas/bank tidak aktif: ${kas.kode} - ${kas.nama}.`);
  }

  if (kas.is_header) {
    throw new Error(
      `COA kas/bank tidak boleh menggunakan COA header: ` +
        `${kas.kode} - ${kas.nama}.`,
    );
  }

  if (!kas.is_cash) {
    throw new Error(`COA ${kas.kode} - ${kas.nama} bukan COA kas/bank.`);
  }

  if (kas.tipe !== "ASET") {
    throw new Error(
      `COA kas/bank ${kas.kode} - ${kas.nama} harus bertipe ASET. ` +
        `Tipe saat ini: ${kas.tipe}.`,
    );
  }

  const lines: JurnalLine[] = [
    {
      id_coa: beban.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: kas.id_coa,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit = lines.reduce((total, item) => total + item.debit, 0);

  const totalKredit = lines.reduce((total, item) => total + item.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal biaya umum tidak balance. ` +
        `Debit=${totalDebit}, ` +
        `Kredit=${totalKredit}.`,
    );
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan: `${keterangan} [${kategori}]`,
    sumber: "UMUM",
    modul: "ACCOUNTING",
    lines,
  });
}
