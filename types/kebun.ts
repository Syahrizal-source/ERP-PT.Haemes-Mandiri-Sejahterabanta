export type LokasiKebun = "KALIMANTAN" | "DURI" | "BALAM";

export interface PanenTbs {
  id_panen: string;
  tanggal_panen: string;
  id_blok: string;
  jumlah_tandan: number;
  berat_tbs_kg: number;
  hasil_per_ha: number;
  mandor: string;
  kualitas: "A" | "B" | "C";
  lokasi: LokasiKebun;
}

export interface CoaMappingDetail {
  id_coa: number;
  posisi: "DEBIT" | "KREDIT";
}
