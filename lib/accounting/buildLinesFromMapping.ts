import type { JurnalLine } from "@/types/accounting";
import {
  getCoaMappingDetail,
  type KategoriCoa,
  type ModulERP,
} from "@/lib/accounting/getcoamapping";

/**
 * Membentuk satu baris jurnal dari mapping COA aktif.
 * Source of truth mapping tetap public.coa_mapping.
 */
export async function buildLinesFromMapping(
  modul: ModulERP,
  kategori: KategoriCoa,
  amount: number,
  blockId: string,
  posisi: "DEBIT" | "KREDIT" = "DEBIT",
): Promise<JurnalLine[]> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount harus berupa angka lebih besar dari 0.");
  }

  const mapping = await getCoaMappingDetail(modul, kategori);

  return [
    {
      id_coa: mapping.id_coa,
      debit: posisi === "DEBIT" ? amount : 0,
      kredit: posisi === "KREDIT" ? amount : 0,
      id_cost_center: blockId,
    },
  ];
}
