import { z } from "zod";
import { JenisTransaksiEnum } from "@/lib/enums/jenisTransaksi";
import { LokasiEnum } from "@/lib/enums/lokasi";
import { normalizeLokasi } from "@/lib/utils/normalizeLokasi";

/**
 * SCHEMA POSTING JURNAL KEBUN
 * - lokasi boleh input bebas (kalimantan / Kalimantan / KALIMANTAN)
 * - disimpan selalu uppercase sesuai enum
 */
export const PostingSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  no_bukti: z.string().min(1, "No bukti wajib diisi"),

  jenis_transaksi: JenisTransaksiEnum,

  nilai: z.number().nonnegative("Nilai tidak boleh minus"),

  lokasi: z
    .string()
    .transform((v) => normalizeLokasi(v))
    .pipe(LokasiEnum),

  keterangan: z.string().min(1, "Keterangan wajib diisi"),

  id_periode: z.number().int().positive("Periode tidak valid"),
});

export type PostingInput = z.infer<typeof PostingSchema>;
