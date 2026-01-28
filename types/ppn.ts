export interface PPNRow {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
}
