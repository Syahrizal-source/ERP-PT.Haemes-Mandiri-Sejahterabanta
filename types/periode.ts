export type PeriodeStatus = "OPEN" | "CLOSED";

export interface Periode {
  id_periode: string;
  bulan: number;
  tahun: number;
  tanggal_mulai: string;
  tanggal_akhir: string;
  status: PeriodeStatus;
  created_at: string;
}
