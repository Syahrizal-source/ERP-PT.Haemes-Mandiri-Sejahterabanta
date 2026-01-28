export function calcPPN(nilaiDasar: number, tarif: number): number {
  if (nilaiDasar <= 0 || tarif <= 0) return 0;
  const nilai = nilaiDasar * (tarif / 100);
  return Math.max(0, Math.round(nilai));
}
