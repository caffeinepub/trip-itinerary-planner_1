import type { TripEntry } from "../backend";
import { bigIntNsToDate, formatDisplayDate } from "./dateUtils";

function formatRow(entry: TripEntry) {
  const date = bigIntNsToDate(entry.visitDate);
  return {
    place: entry.placeName,
    date: formatDisplayDate(date),
    time: entry.visitTime || "—",
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

export async function exportToPDF(entries: TripEntry[]): Promise<void> {
  const rows = entries.map((e) => formatRow(e));
  const exportDate = new Date().toLocaleDateString("en-GB");

  const tableRows = rows
    .map(
      (r, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8f4ec" : "#ffffff"}">
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${escapeHtml(r.place)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${escapeHtml(r.date)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${escapeHtml(r.time)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${escapeHtml(r.transport)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${escapeHtml(r.description)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Trip Itinerary</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
    h1 { color: #286060; font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #786450; font-size: 12px; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th { background:#286464; color:#fff; padding:8px 10px; font-size:11px; text-align:left; border:1px solid #286464; }
    @media print { body { margin: 15px; } }
  </style>
</head>
<body>
  <h1>Trip Itinerary</h1>
  <p class="subtitle">Exported on ${exportDate}</p>
  <table>
    <thead>
      <tr>
        <th>Place</th><th>Date</th><th>Time</th><th>Transport</th><th>Description</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
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
