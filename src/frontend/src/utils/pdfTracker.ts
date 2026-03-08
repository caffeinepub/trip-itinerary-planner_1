/**
 * PDF Blob Tracker
 *
 * Since ExternalBlob URLs don't carry content-type info, we track which
 * blob URLs are PDFs in localStorage at upload time. This lets us reliably
 * detect PDFs at display time without fetching the blob content.
 */

const STORAGE_KEY = "caffeine_pdf_blob_urls";

function loadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveSet(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

/** Mark a blob URL as a PDF. Call this after uploading a PDF file. */
export function markBlobAsPdf(url: string): void {
  const set = loadSet();
  set.add(url);
  saveSet(set);
}

/** Check if a blob URL is a known PDF. */
export function isBlobPdf(url: string): boolean {
  // Fallback: also check common URL patterns
  if (url.toLowerCase().includes(".pdf")) return true;
  const set = loadSet();
  return set.has(url);
}

/** Remove a blob URL from the PDF registry (e.g. when an entry is deleted). */
export function unmarkBlobAsPdf(url: string): void {
  const set = loadSet();
  if (set.delete(url)) {
    saveSet(set);
  }
}
