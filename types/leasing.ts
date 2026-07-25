export type StatusLeasing = "OPEN" | "ACTIVE" | "LUNAS" | "CLOSED";

export interface HutangLeasingInput {
  tanggal: string;

  no_kontrak: string;

  nama_pt_leasing: string;

  keterangan_unit: string;

  jumlah_unit: number;

  uang_muka: number;

  hutang_pokok: number;

  persentase_bunga: number;

  bunga: number;

  hutang_pembiayaan: number;

  tenor_bulan: number;

  angsuran_perbulan: number;

  tanggal_mulai: string;

  tanggal_selesai: string;

  bulan_terbayar: number;

  total_sudah_dibayar: number;

  angsuran_tahun_berjalan: number;

  tanggal_pembayaran: number;

  sisa_hutang: number;

  sisa_bulan: number;

  hutang_jangka_pendek: number;

  hutang_jangka_panjang: number;

  status: StatusLeasing;
}

export interface LeasingCalculation {
  totalPembiayaan: number;

  totalBunga: number;

  totalKewajiban: number;

  angsuranPerBulan: number;

  sisaHutang: number;

  sisaJangkaPendek: number;

  sisaJangkaPanjang: number;
}
