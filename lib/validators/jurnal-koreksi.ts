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
  id_detail_asal: number;
  id_coa_tujuan: number;
  nilai_koreksi: number;
  lines: JurnalKoreksiLineInput[];
}

export interface JurnalKoreksiRow {
  id: number;
  id_jurnal_asal: number;
  id_jurnal_koreksi: number;
  alasan: string;
  created_at: string | null;
}

/* =========================
   JURNAL LINE
========================= */

export const jurnalKoreksiLineSchema = z.object({
  id_coa: z.number().int().positive("COA wajib dipilih"),

  debit: z.number().finite().min(0, "Debit tidak boleh negatif"),

  kredit: z.number().finite().min(0, "Kredit tidak boleh negatif"),
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

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (Math.abs(totalDebit - totalKredit) > 0.000001) {
    throw new Error("Jurnal koreksi tidak balance");
  }
}

/* =========================
   FORM HEADER
========================= */

export const jurnalKoreksiSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  no_bukti: z.string().trim().min(1, "No bukti wajib diisi"),

  keterangan: z.string().trim().min(3, "Keterangan minimal 3 karakter"),

  alasan: z.string().trim().min(3, "Alasan koreksi minimal 3 karakter"),

  id_jurnal_asal: z.number().int().positive("Jurnal asal wajib dipilih"),

  id_detail_asal: z.number().int().positive("Detail jurnal asal wajib dipilih"),

  id_coa_tujuan: z.number().int().positive("COA tujuan koreksi wajib dipilih"),

  nilai_koreksi: z
    .number()
    .finite()
    .positive("Nilai koreksi harus lebih besar dari 0"),

  lines: z.array(jurnalKoreksiLineSchema).min(1, "Minimal 1 baris jurnal"),
});

/* =========================
   DATABASE ROW SCHEMA
========================= */

export const jurnalKoreksiRowSchema = z.object({
  id: z.number().int().positive(),

  id_jurnal_asal: z.number().int().positive(),

  id_jurnal_koreksi: z.number().int().positive(),

  alasan: z.string(),

  created_at: z.string().nullable(),
});

/* =========================
   VALIDASI INPUT
========================= */

export function validateJurnalKoreksi(input: unknown): JurnalKoreksiInput {
  const result = jurnalKoreksiSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  validateKoreksiLines(result.data.lines);

  return result.data;
}
