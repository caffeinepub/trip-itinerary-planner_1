/**
 * Async PDF detector
 *
 * Fetches the first 5 bytes of a blob URL to check for the PDF magic number
 * (%PDF-). Results are cached in sessionStorage to avoid repeated fetches
 * within the same page session.
 */

const SESSION_KEY = "caffeine_pdf_detect_cache";

function loadCache(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, boolean>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage may be unavailable
  }
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/** Detect if a URL points to a PDF by reading the first 5 bytes. */
export async function detectIsPdf(url: string): Promise<boolean> {
  const cache = loadCache();
  if (url in cache) return cache[url];

  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-4" },
    });
    if (!response.ok) {
      cache[url] = false;
      saveCache(cache);
      return false;
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isPdf =
      bytes.length >= 5 && PDF_MAGIC.every((b, i) => bytes[i] === b);
    cache[url] = isPdf;
    saveCache(cache);
    return isPdf;
  } catch {
    cache[url] = false;
    saveCache(cache);
    return false;
  }
}
