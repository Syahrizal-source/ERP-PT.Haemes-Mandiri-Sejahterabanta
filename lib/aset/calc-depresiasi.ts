export interface DepresiasiResult {
  depresiasiBulanan: number;
  depresiasiTahunan: number;
  tarifPersen: number;
}

export function calcDepresiasi(
  nilaiPerolehan: number,
  umurManfaat: number,
): DepresiasiResult {
  if (nilaiPerolehan <= 0 || umurManfaat <= 0) {
    return {
      depresiasiBulanan: 0,
      depresiasiTahunan: 0,
      tarifPersen: 0,
    };
  }

  const depresiasiTahunan = nilaiPerolehan / umurManfaat;
  const depresiasiBulanan = depresiasiTahunan / 12;
  const tarifPersen = 100 / umurManfaat;

  return {
    depresiasiBulanan: Number(depresiasiBulanan.toFixed(2)),
    depresiasiTahunan: Number(depresiasiTahunan.toFixed(2)),
    tarifPersen: Number(tarifPersen.toFixed(2)),
  };
}
