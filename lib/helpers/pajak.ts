export function safeNumber(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function rupiah(v: number): number {
  return Math.round(safeNumber(v));
}

export type PajakResult = {
  ppn: number;
  pph21: number;
  pph23: number;
  pph4: number;
};

export function hitungPajak(
  jenis: string,
  nilai: number,
  regulasi: {
    ppn: number;
    pph21: number;
    pph23: number;
    pph4: number;
  }
): PajakResult {
  return {
    ppn: jenis === "PENJUALAN" ? nilai * regulasi.ppn : 0,
    pph21: jenis === "GAJI" ? nilai * regulasi.pph21 : 0,
    pph23: jenis === "JASA" ? nilai * regulasi.pph23 : 0,
    pph4: jenis === "JASA" ? nilai * regulasi.pph4 : 0,
  };
}
