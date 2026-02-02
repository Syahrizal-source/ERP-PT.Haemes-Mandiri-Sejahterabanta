import { z } from "zod";

export const siteCreateSchema = z.object({
  site_name: z.string().min(1, "Site name wajib diisi"),
  location: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const siteUpdateSchema = siteCreateSchema.partial();
