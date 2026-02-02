import { z } from "zod";

export const safetyIncidentCreateSchema = z
  .object({
    equipment_id: z.string().uuid().nullable().optional(),
    incident_date: z.string(), // ISO date
    description: z.string().min(1, "Deskripsi wajib diisi"),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })
  // anti minus versi logis → tanggal tidak boleh di masa depan
  .refine((data) => new Date(data.incident_date).getTime() <= Date.now(), {
    message: "Tanggal kejadian tidak boleh di masa depan",
    path: ["incident_date"],
  });

export const safetyIncidentUpdateSchema = safetyIncidentCreateSchema.partial();
