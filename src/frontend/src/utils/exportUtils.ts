import type { TripEntry } from "../backend";
import {
  bigIntNsToDate,
  formatDisplayDate,
  formatDisplayTime,
} from "./dateUtils";

function formatRow(entry: TripEntry) {
  const date = bigIntNsToDate(entry.visitDate);
  return {
    place: entry.placeName,
    date: formatDisplayDate(date),
    time: formatDisplayTime(entry.visitTime) || "—",
    transport: entry.transportMode || "—",
    description: entry.description || "—",
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function imageToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return ""; // skip broken images
  }
}

/** Map transport mode to a hex color pair [bg, text] */
function transportColors(mode: string): [string, string] {
  const map: Record<string, [string, string]> = {
    Flight: ["#dbeafe", "#1e40af"],
    Train: ["#ede9fe", "#5b21b6"],
    Bus: ["#dcfce7", "#166534"],
    Car: ["#ffedd5", "#9a3412"],
    Taxi: ["#fef9c3", "#854d0e"],
    Walk: ["#d1fae5", "#065f46"],
    Boat: ["#cffafe", "#155e75"],
    Other: ["#f3f4f6", "#374151"],
  };
  return map[mode] ?? ["#f3f4f6", "#374151"];
}

/** Unicode transport icon */
function transportEmoji(mode: string): string {
  const map: Record<string, string> = {
    Flight: "✈️",
    Train: "🚆",
    Bus: "🚌",
    Car: "🚗",
    Taxi: "🚕",
    Walk: "🚶",
    Boat: "⛵",
    Other: "🧭",
  };
  return map[mode] ?? "🧭";
}

export async function exportToPDF(entries: TripEntry[]): Promise<void> {
  const exportDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Pre-fetch all images as base64 in parallel per entry (max 6 each)
  const entryImages: string[][] = await Promise.all(
    entries.map((e) =>
      Promise.all(
        e.imageIds.slice(0, 6).map((img) => imageToBase64(img.getDirectURL())),
      ),
    ),
  );

  const entryCards = entries
    .map((entry, i) => {
      const date = bigIntNsToDate(entry.visitDate);
      const formattedDate = formatDisplayDate(date);
      const formattedTime = formatDisplayTime(entry.visitTime);
      const [transportBg, transportText] = transportColors(entry.transportMode);
      const transportIcon = transportEmoji(entry.transportMode);

      const photos = entryImages[i].filter(Boolean);
      const photoGrid =
        photos.length > 0
          ? `
        <div class="photo-grid">
          ${photos
            .map(
              (src) =>
                `<div class="photo-cell"><img src="${src}" alt="Photo of ${escapeHtml(entry.placeName)}" /></div>`,
            )
            .join("")}
        </div>`
          : "";

      return `
      <div class="entry-card">
        <div class="card-accent"></div>
        <div class="card-body">
          <div class="card-header">
            <div class="step-circle">${i + 1}</div>
            ${
              entry.transportMode
                ? `<span class="transport-badge" style="background:${transportBg};color:${transportText}">${transportIcon} ${escapeHtml(entry.transportMode)}</span>`
                : ""
            }
          </div>

          <h2 class="place-name">📍 ${escapeHtml(entry.placeName)}</h2>

          <div class="meta-row">
            <span class="meta-chip">📅 ${escapeHtml(formattedDate)}</span>
            ${formattedTime ? `<span class="meta-chip">🕐 ${escapeHtml(formattedTime)}</span>` : ""}
          </div>

          ${
            entry.description
              ? `<p class="description">${escapeHtml(entry.description)}</p>`
              : ""
          }

          ${photoGrid}
        </div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Trip Itinerary</title>
  <style>
    /* ── Base ───────────────────────────────────────── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #faf8f5;
      color: #2d2520;
      padding: 0;
    }

    /* ── Header Banner ──────────────────────────────── */
    .banner {
      background: linear-gradient(135deg, #286060 0%, #1a4040 60%, #0f2b2b 100%);
      padding: 48px 40px 40px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .banner::before {
      content: "";
      position: absolute;
      top: -60px; right: -60px;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
    }
    .banner::after {
      content: "";
      position: absolute;
      bottom: -40px; left: 30%;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.03);
    }
    .banner-inner {
      position: relative;
      z-index: 1;
    }
    .banner-eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      opacity: 0.65;
      margin-bottom: 8px;
    }
    .banner-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 10px;
    }
    .banner-subtitle {
      font-size: 13px;
      opacity: 0.7;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .banner-count {
      display: inline-flex;
      align-items: center;
      background: rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 16px;
    }

    /* ── Body wrapper ───────────────────────────────── */
    .page-body {
      padding: 32px 32px 40px;
      max-width: 860px;
      margin: 0 auto;
    }

    /* ── Entry Card ─────────────────────────────────── */
    .entry-card {
      display: flex;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 2px 8px rgba(40,96,96,0.08), 0 1px 3px rgba(0,0,0,0.06);
      margin-bottom: 24px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-accent {
      width: 6px;
      flex-shrink: 0;
      background: linear-gradient(180deg, #c4714a 0%, #286060 100%);
    }
    .card-body {
      flex: 1;
      padding: 22px 24px 20px;
    }

    /* ── Card Header ────────────────────────────────── */
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #286060;
      color: white;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .transport-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
    }

    /* ── Place Name ─────────────────────────────────── */
    .place-name {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      font-weight: 700;
      color: #1a2e2e;
      line-height: 1.25;
      margin-bottom: 8px;
    }

    /* ── Meta Row ───────────────────────────────────── */
    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #5a6e6e;
      background: #f0f5f5;
      border-radius: 6px;
      padding: 3px 10px;
      font-weight: 500;
    }

    /* ── Description ────────────────────────────────── */
    .description {
      font-size: 13px;
      line-height: 1.65;
      color: #4a5568;
      margin-bottom: 14px;
      padding-left: 2px;
    }

    /* ── Photo Grid ─────────────────────────────────── */
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 14px;
    }
    .photo-cell {
      aspect-ratio: 4 / 3;
      border-radius: 8px;
      overflow: hidden;
      background: #e8e2d8;
    }
    .photo-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ── Footer ─────────────────────────────────────── */
    .pdf-footer {
      text-align: center;
      padding: 24px 0 8px;
      font-size: 11px;
      color: #9aa8a8;
      border-top: 1px solid #e8e2d8;
      margin-top: 8px;
    }
    .pdf-footer a {
      color: #286060;
      text-decoration: none;
    }

    /* ── Print Overrides ────────────────────────────── */
    @media print {
      body { background: white; }
      .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card-accent { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .step-circle { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .transport-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta-chip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .entry-card { box-shadow: none; border: 1px solid #e0dbd3; }
      .page-body { padding: 20px 24px 32px; }
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="banner">
    <div class="banner-inner">
      <div class="banner-eyebrow">Travel Document</div>
      <div class="banner-title">Trip Itinerary</div>
      <div class="banner-subtitle">Exported on ${escapeHtml(exportDate)}</div>
      <div class="banner-count">🗺️ &nbsp;${entries.length} destination${entries.length !== 1 ? "s" : ""}</div>
    </div>
  </div>

  <!-- Entry Cards -->
  <div class="page-body">
    ${entryCards}

    <!-- Footer -->
    <div class="pdf-footer">
      Generated with <strong>Trip Itinerary Planner</strong> · caffeine.ai
    </div>
  </div>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.addEventListener("load", () => {
      printWindow.print();
      // Revoke after a delay to allow print dialog
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  } else {
    // Fallback: download as HTML file
    const a = document.createElement("a");
    a.href = url;
    a.download = "trip-itinerary.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function exportToExcel(entries: TripEntry[]): Promise<void> {
  const rows = entries.map((e) => formatRow(e));

  // Build a CSV file (opens in Excel)
  const headers = ["Place", "Date", "Time", "Transport", "Description"];
  const csvRows = [
    headers,
    ...rows.map((r) => [r.place, r.date, r.time, r.transport, r.description]),
  ];

  const csvContent = csvRows
    .map((row) =>
      row
        .map((cell) => {
          // Quote cells that contain commas, quotes, or newlines
          const str = String(cell).replace(/"/g, '""');
          return /[,"\n\r]/.test(str) ? `"${str}"` : str;
        })
        .join(","),
    )
    .join("\r\n");

  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "trip-itinerary.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
