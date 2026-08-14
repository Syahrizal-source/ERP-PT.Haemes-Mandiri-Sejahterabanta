import { z } from "zod";

export const StatusTagihanProyekSchema = z.enum([
  "Unpaid (Menunggu Pembayaran)",
  "Partial (Pembayaran Sebagian)",
  "Paid (Pembayaran Penuh/ Lunas)",
]);

export const SumberTagihanDetailSchema = z.enum([
  "MATERIAL",
  "ALAT_BERAT",
  "TENAGA_KERJA",
  "OPERASIONAL",
  "REALISASI",
  "SUBKON",
  "PROGRESS",
]);

export const TagihanProyekDetailSchema = z.object({
  sumber: SumberTagihanDetailSchema,

  id_referensi: z.string().uuid("ID referensi tidak valid."),

  no_bukti: z.string().trim().max(50).nullable().optional(),

  uraian: z.string().trim().nullable().optional(),

  qty: z.number().min(0, "Qty tidak boleh minus.").nullable().optional(),

  satuan: z.string().trim().max(20).nullable().optional(),

  harga: z.number().min(0, "Harga tidak boleh minus.").nullable().optional(),

  total: z.number().min(0, "Total tidak boleh minus.").nullable().optional(),

  id_jurnal: z.number().int().nullable().optional(),
});

export const TagihanProyekSchema = z.object({
  id_proyek: z.string().uuid("ID Proyek tidak valid."),

  nomor_invoice: z
    .string()
    .trim()
    .min(1, "Nomor invoice wajib diisi.")
    .max(100),

  no_bukti: z.string().trim().max(50).nullable().optional(),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  periode: z.string().trim().max(50).nullable().optional(),

  nilai: z.number().positive("Nilai tagihan harus lebih besar dari 0."),

  nilai_ppn: z.number().min(0, "Nilai PPN tidak boleh minus.").default(0),

  nilai_pph: z.number().min(0, "Nilai PPh tidak boleh minus.").default(0),

  status: StatusTagihanProyekSchema,

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),

  details: z.array(TagihanProyekDetailSchema).default([]),
});

export type TagihanProyekInput = z.infer<typeof TagihanProyekSchema>;

export type TagihanProyekDetailInput = z.infer<
  typeof TagihanProyekDetailSchema
>;
