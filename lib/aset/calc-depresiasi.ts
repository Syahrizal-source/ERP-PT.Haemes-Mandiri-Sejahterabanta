export function calcDepresiasiBulanan(
  nilaiPerolehan: number,
  umurManfaat: number,
): number {
  if (nilaiPerolehan <= 0 || umurManfaat <= 0) {
    return 0;
  }

  const totalBulan = umurManfaat * 12;
  const depresiasi = nilaiPerolehan / totalBulan;

  return Math.max(0, Math.round(depresiasi * 100) / 100);
}
