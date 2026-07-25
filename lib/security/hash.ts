import crypto from "crypto";

export function generateReportHash(payload: unknown): string {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex");
}
