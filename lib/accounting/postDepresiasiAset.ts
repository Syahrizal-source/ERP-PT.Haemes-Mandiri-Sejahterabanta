import { postJournal } from "./postJournal";
import {
  getCoaMappingDetail,
  KategoriAset,
  KategoriCoa,
} from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postDepresiasiAset(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  kategoriAset: KategoriAset,
  nilai: number,
): Promise<number> {
  const mapping: Record<
    KategoriAset,
    {
      beban: KategoriCoa;
      akumulasi: KategoriCoa;
    }
  > = {
    ALAT_BERAT: {
      beban: "BEBAN_ALAT_BERAT",
      akumulasi: "AKUMULASI_ALAT_BERAT",
    },
    ARMADA: {
      beban: "BEBAN_ARMADA",
      akumulasi: "AKUMULASI_ARMADA",
    },
    KENDARAAN: {
      beban: "BEBAN_KENDARAAN",
      akumulasi: "AKUMULASI_KENDARAAN",
    },
    INVENTARIS: {
      beban: "BEBAN_INVENTARIS",
      akumulasi: "AKUMULASI_INVENTARIS",
    },
    PERALATAN: {
      beban: "BEBAN_PERALATAN",
      akumulasi: "AKUMULASI_PERALATAN",
    },
    BANGUNAN: {
      beban: "BEBAN_BANGUNAN",
      akumulasi: "AKUMULASI_BANGUNAN",
    },
  };

  const config = mapping[kategoriAset];

  if (!config) {
    throw new Error(
      `Kategori aset '${kategoriAset}' belum memiliki konfigurasi mapping.`,
    );
  }

  const beban = await getCoaMappingDetail("ASET", mapping[kategoriAset].beban);

  const akumulasi = await getCoaMappingDetail(
    "ASET",
    mapping[kategoriAset].akumulasi,
  );

  if (nilai <= 0) {
    throw new Error("Nilai depresiasi tidak valid");
  }

  const lines: JurnalLine[] = [
    {
      id_coa: beban.id_coa,
      debit: nilai,
      kredit: 0,
    },
    {
      id_coa: akumulasi.id_coa,
      debit: 0,
      kredit: nilai,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal depresiasi tidak balance");
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "ASET",
    modul: "ACCOUNTING",
    lines,
  });
}
