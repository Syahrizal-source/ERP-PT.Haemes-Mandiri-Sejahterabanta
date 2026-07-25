import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postKasKeluar(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
  idAkunKas: number,
  idAkunBeban: number,
): Promise<number> {
  /* =========================
     COA MAPPING
  ========================= */

  const hutangPajak = await getCoaMappingDetail("KAS_KELUAR", "HUTANG");
  const ppnMasukan = await getCoaMappingDetail("KAS_KELUAR", "PIUTANG");

  /* =========================
     HITUNG
  ========================= */

  const kasKeluar: number = nominal + ppn - pph23;

  /* =========================
     JURNAL
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: idAkunBeban,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: ppnMasukan.id_coa,
      debit: ppn, // ✅ TAMBAHAN INI (PPN MASUKAN)
      kredit: 0,
    },
    {
      id_coa: hutangPajak.id_coa,
      debit: 0,
      kredit: pph23,
    },
    {
      id_coa: idAkunKas,
      debit: 0,
      kredit: kasKeluar,
    },
  ];

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit: number = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit: number = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal kas keluar tidak balance");
  }

  /* =========================
     POST
  ========================= */

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "KAS_KELUAR",
    modul: "KAS_KELUAR",
    lines,
  });
}
