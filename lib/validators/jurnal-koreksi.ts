import { z } from "zod";

/* =========================
   TYPES
========================= */

export interface JurnalKoreksiLineInput {
  id_coa: number;
  debit: number;
  kredit: number;
}

export interface JurnalKoreksiInput {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  alasan: string;
  id_jurnal_asal: number;
  lines: JurnalKoreksiLineInput[];
}

/* =========================
   JURNAL LINE
========================= */

export const jurnalKoreksiLineSchema = z.object({
  id_coa: z.number().positive("COA wajib dipilih"),

  debit: z.number().min(0, "Debit wajib diisi"),

  kredit: z.number().min(0, "Kredit wajib diisi"),
});

/* =========================
   VALIDASI BARIS
========================= */

export function validateKoreksiLines(lines: JurnalKoreksiLineInput[]): void {
  if (lines.length === 0) {
    throw new Error("Minimal 1 baris jurnal wajib diisi");
  }

  for (const line of lines) {
    if (line.debit === 0 && line.kredit === 0) {
      throw new Error("Debit atau kredit harus diisi");
    }

    if (line.debit > 0 && line.kredit > 0) {
      throw new Error("Debit dan kredit tidak boleh terisi bersamaan");
    }
  }

  const totalDebit = lines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.debit),
    0,
  );

  const totalKredit = lines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.kredit),
    0,
  );

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal koreksi tidak balance");
  }
}

/* =========================
   HEADER
========================= */

export const jurnalKoreksiSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  no_bukti: z.string().min(1, "No bukti wajib diisi"),

  keterangan: z.string().min(3, "Keterangan wajib diisi"),

  alasan: z.string().min(3, "Alasan koreksi wajib diisi"),

  id_jurnal_asal: z.number().positive("Jurnal asal wajib dipilih"),

  lines: z.array(jurnalKoreksiLineSchema).min(1, "Minimal 1 baris jurnal"),
});
