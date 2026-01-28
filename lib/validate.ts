import { z } from "zod";

// validateBody.ts
export function validateBody<T>(
  schema: z.ZodType<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> } {
  try {
    const parsedData = schema.parse(data); // parse otomatis throw ZodError
    return { success: true, data: parsedData };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return { success: false, errors: fieldErrors };
    }
    return { success: false, errors: { unknown: ["Invalid data"] } };
  }
}
