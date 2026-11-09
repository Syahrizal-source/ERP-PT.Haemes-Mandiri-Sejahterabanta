import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";
import { db } from "@/lib/supabase/server";

export async function postKasbonDireksi(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  idCoaKas: number,
): Promise<number> {
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal kasbon direksi tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank kasbon direksi tidak valid");
  }

  /**
   * Piutang Direksi wajib berasal dari mapping.
   *
   * KASBON_DIREKSI / PIUTANG
   * → 12005 Piutang Direksi
   * → id_coa 2517
   */
  const piutang = await getCoaMappingDetail("KASBON_DIREKSI", "PIUTANG");

  /**
   * Akun kas/bank dipilih berdasarkan transaksi.
   * Tidak mengambil KASBON_DIREKSI / KAS karena perusahaan
   * memiliki beberapa akun kas dan bank.
   */
  const { data: kas, error: kasError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (kasError) {
    throw new Error(
      `Gagal memvalidasi COA kas/bank ${idCoaKas}: ${kasError.message}`,
    );
  }

  if (!kas) {
    throw new Error(`COA kas/bank tidak ditemukan (id_coa=${idCoaKas})`);
  }

  if (!kas.aktif) {
    throw new Error(`COA kas/bank tidak aktif: ${kas.kode} - ${kas.nama}`);
  }

  if (!kas.is_cash) {
    throw new Error(`COA bukan akun kas/bank: ${kas.kode} - ${kas.nama}`);
  }

  if (kas.is_header) {
    throw new Error(
      `COA kas/bank tidak boleh berupa header: ${kas.kode} - ${kas.nama}`,
    );
  }

  const lines: JurnalLine[] = [
    {
      id_coa: piutang.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: idCoaKas,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal kasbon direksi tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "KASBON_DIREKSI",
    modul: "ACCOUNTING",
    lines,
  });
}
