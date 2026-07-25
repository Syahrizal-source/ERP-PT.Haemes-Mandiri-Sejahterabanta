import { postJournal } from "./postJournal";
import { buildLinesFromMapping } from "./buildLinesFromMapping";
import { JenisTransaksiKebun } from "@/types/kebun";

export async function postKebun(
  coaMappingId: number,
  jenisTransaksi: JenisTransaksiKebun,
  regionId: string,
  tanggal: string,
  noBukti: string,
  keterangan: string,
  amount: number,
  blockId: string,
): Promise<number> {
  const lines = await buildLinesFromMapping(
    coaMappingId,
    jenisTransaksi,
    regionId,
    amount,
    blockId,
  );

  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "KEBUN",
    lines,
  });
}
