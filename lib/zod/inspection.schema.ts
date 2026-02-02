import { z } from "zod";

export const inspectionCreateSchema = z.object({
  equipment_id: z.string().uuid(),
  inspection_date: z.string(), // ISO date
  inspection_type: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const inspectionUpdateSchema = inspectionCreateSchema.partial();
