export function validatePositive(value: number, field: string) {
  if (value < 0) throw new Error(`${field} tidak boleh minus`);
}

export function assertRequired<T>(
  value: T | null | undefined,
  field: string,
): T {
  if (!value) throw new Error(`${field} wajib diisi`);
  return value;
}
