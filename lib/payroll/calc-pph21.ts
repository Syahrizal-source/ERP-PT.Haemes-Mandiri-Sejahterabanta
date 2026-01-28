export function calcPPH21(
  gajiBruto: number,
  biayaJabatan: number,
  iuran: number,
  tarif: number,
): number {
  const pkp = gajiBruto - biayaJabatan - iuran;
  if (pkp <= 0) return 0;
  const nilai = pkp * (tarif / 100);
  return Math.max(0, Math.round(nilai));
}
