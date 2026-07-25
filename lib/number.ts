export function nonNegative(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value;
}
