import { z } from "zod";

export const PiutangNonProyekSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  deskripsi: z.string().min(1, "Deskripsi wajib diisi"),

  debit: z.number().min(0, "Debit tidak boleh minus"),

  kredit: z.number().min(0, "Kredit tidak boleh minus"),

  saldo: z.number().min(0, "Saldo tidak boleh minus"),
});

export type PiutangNonProyekInput = z.infer<typeof PiutangNonProyekSchema>;
