export function calcPPH23(nilaiTransaksi: number, tarif: number): number {
  if (nilaiTransaksi <= 0 || tarif <= 0) return 0;
  const nilai = nilaiTransaksi * (tarif / 100);
  return Math.max(0, Math.round(nilai));
}
