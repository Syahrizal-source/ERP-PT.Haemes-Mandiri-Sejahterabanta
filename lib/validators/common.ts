import { z } from "zod";

export const uuidSchema = z.string().uuid("UUID tidak valid");

export const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Tanggal tidak valid",
  });

export const positiveNumber = (message: string) =>
  z.coerce.number().min(0, message);

export const booleanOptional = z.boolean().optional();
