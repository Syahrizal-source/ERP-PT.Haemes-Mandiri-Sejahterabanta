import { JurnalLine } from "@/types/accounting";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";

export async function buildLinesFromMapping(
  coaMappingId: number,
  jenisTransaksi: string,
  regionId: string,
  amount: number,
  blockId: string,
): Promise<JurnalLine[]> {
  if (amount <= 0) {
    throw new Error("Amount tidak valid");
  }

  const mapping = await getCoaMappingDetail(
    coaMappingId,
    jenisTransaksi,
    regionId,
  );

  return mapping.map((m) => ({
    id_coa: m.id_coa,
    debit: m.posisi === "DEBIT" ? amount : 0,
    kredit: m.posisi === "KREDIT" ? amount : 0,
    id_cost_center: blockId,
  }));
}
