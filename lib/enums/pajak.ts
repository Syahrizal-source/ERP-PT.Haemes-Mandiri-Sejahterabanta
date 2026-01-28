import { z } from "zod";

export const JenisPajakEnum = z.enum(["PPN", "PPH21", "PPH23", "PPH_FINAL"]);

export type JenisPajak = z.infer<typeof JenisPajakEnum>;
