export type LokasiKebun = "KALIMANTAN" | "DURI" | "BALAM";

export interface KebunBiaya {
  id: string;
  tanggal: string;
  jenis_biaya: string;
  jumlah: number;
  id_blok: string | null;
  lokasi: LokasiKebun;
  referensi: string | null;
}
