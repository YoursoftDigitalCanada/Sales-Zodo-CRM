export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function toDate(
  value: Date | string | number | null | undefined
): Date | null {
  if (value === null || value === undefined) return null;
  if (isValidDate(value)) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISOString(
  value: Date | string | number | null | undefined
): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export function toUnixSeconds(
  value: Date | string | number | null | undefined
): number | null {
  const date = toDate(value);
  return date ? Math.floor(date.getTime() / 1000) : null;
}
