import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postKasMasuk(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
): Promise<number> {
  /* =========================
     COA MAPPING
  ========================= */

  const kas = await getCoaMappingDetail("PENDAPATAN", "KAS");
  const pendapatan = await getCoaMappingDetail("PENDAPATAN", "PENDAPATAN");
  const hutang = await getCoaMappingDetail("PENDAPATAN", "HUTANG");
  const piutang = await getCoaMappingDetail("PENDAPATAN", "PIUTANG");

  /* =========================
     HITUNG
  ========================= */

  const kasMasuk: number = nominal + ppn - pph23;

  /* =========================
     JURNAL
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: kas.id_coa,
      debit: kasMasuk,
      kredit: 0,
    },
    {
      id_coa: piutang.id_coa,
      debit: pph23, // ✅ PPh23 jadi PIUTANG
      kredit: 0,
    },
    {
      id_coa: pendapatan.id_coa,
      debit: 0,
      kredit: nominal,
    },
    {
      id_coa: hutang.id_coa,
      debit: 0,
      kredit: ppn,
    },
  ];

  /* =========================
     VALIDASI
  ========================= */

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal kas masuk tidak balance");
  }

  /* =========================
     POST
  ========================= */

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "KAS_MASUK",
    modul: "KAS_MASUK",
    lines,
  });
}
