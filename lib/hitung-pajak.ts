export function hitungPajak(nilaiDasar: number, tarif: number): number {
  if (nilaiDasar < 0) throw new Error("Nilai dasar tidak boleh minus");
  if (tarif < 0) throw new Error("Tarif tidak boleh minus");

  return Math.round((nilaiDasar * tarif) / 100);
}
