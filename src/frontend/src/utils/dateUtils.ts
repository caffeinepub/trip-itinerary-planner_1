/**
 * Convert a Date object to bigint nanoseconds for backend storage
 */
export function dateToBigIntNs(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}

/**
 * Convert bigint nanoseconds from backend to a Date object
 */
export function bigIntNsToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

/**
 * Format a Date as "Mon, 10 Mar 2026"
 */
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a Date as "YYYY-MM-DD" for HTML date input value
 */
export function formatInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse "YYYY-MM-DD" from date input to a Date (local midnight)
 */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
