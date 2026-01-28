import { z } from "zod";

export const jurnalPenutupSchema = z.object({
  id_periode: z.number().int().positive(),
});
