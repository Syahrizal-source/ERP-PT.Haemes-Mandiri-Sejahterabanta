export interface Neraca {
  id: number;
  bulan: number;
  tahun: number;
  akun: string;
  saldo: number;
  posisi: 'AKTIVA' | 'PASIVA';
}
