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

/**
 * Convert "HH:MM" 24h string to "h:MM AM/PM" display format
 * e.g. "14:30" → "2:30 PM", "09:05" → "9:05 AM"
 * Returns empty string for empty/null/invalid input.
 */
export function formatDisplayTime(time: string): string {
  if (!time || !time.includes(":")) return "";
  const [hStr, mStr] = time.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = String(m).padStart(2, "0");
  return `${hour12}:${minutes} ${period}`;
}
