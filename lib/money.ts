const MAX_AMOUNT = 1_000_000_000_000n; // 1 TRILIUN

export function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.floor(value));
  if (typeof value === "string" && value !== "") return BigInt(value);
  throw new Error("Nilai uang tidak valid");
}

export function validateMoney(value: bigint, field: string) {
  if (value < 0n) {
    throw new Error(`${field} tidak boleh negatif`);
  }
  if (value > MAX_AMOUNT) {
    throw new Error(`${field} melebihi batas 1 triliun`);
  }
}
