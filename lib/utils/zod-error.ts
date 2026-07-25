import { z } from "zod";

export function getZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}
