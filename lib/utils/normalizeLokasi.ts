import { LokasiEnum, Lokasi } from "@/lib/enums/lokasi";

/**
 * Normalize input lokasi:
 * - trim spasi
 * - uppercase
 * - validasi ke enum resmi
 */
export function normalizeLokasi(input: string): Lokasi {
  const normalized = input.trim().toUpperCase();

  const parsed = LokasiEnum.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`Lokasi tidak valid: ${input}`);
  }

  return parsed.data;
}
