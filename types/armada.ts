export interface ArmadaRow {
  id: number;
  // user_id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  no_pintu: string;
  supir: string;
  hp: string | null;
  buangan_galian: string;
  "m³": number;
  rit: number;
  tagihan: number;
  uang_jalan: number;
  belanja: number;
  do_qty: number;
  mel: number;
  tambal_ban: number;
  inap_um: number;
  sub_bak_besar: number;
  perg_solar: number;
  kaca_film_bemper: number;
  sparepart: number;
  koordinasi: number;
  adm: number;
  stnk_kir: number;
  jumlah_tagihan: number;
  jumlah_uang_jalan: number;
  jumlah_do: number;
  bersih: number;
  created_at: string;
  status?: "DRAFT" | "POSTED" | "CANCELLED";
  total_pembayaran?: number;
  sisa_tagihan?: number;
  pembayaran_tagihan?: ArmadaPembayaranTagihan[];
}

export interface ArmadaPembayaranTagihan {
  id: string;

  armada_id: number;

  tanggal: string;

  no_bukti: string;

  nominal: number;

  metode_pembayaran: string;

  id_coa_kas: number | null;

  keterangan: string | null;

  status: "DRAFT" | "POSTED" | "CANCELLED";

  id_jurnal: number | null;

  created_at: string;

  updated_at: string;
}
