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

export async function exportToPDF(entries: TripEntry[]): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 80, 80);
  doc.text("Trip Itinerary", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 100, 80);
  doc.text(`Exported on ${new Date().toLocaleDateString("en-GB")}`, 14, 26);

  const rows = entries.map((e) => {
    const r = formatRow(e);
    return [r.place, r.date, r.time, r.transport, r.description];
  });

  autoTable(doc, {
    startY: 32,
    head: [["Place", "Date", "Time", "Transport", "Description"]],
    body: rows,
    headStyles: {
      fillColor: [40, 100, 100],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 40, 30],
    },
    alternateRowStyles: {
      fillColor: [248, 244, 236],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 40 },
      2: { cellWidth: 22 },
      3: { cellWidth: 32 },
      4: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save("trip-itinerary.pdf");
}

export async function exportToExcel(entries: TripEntry[]): Promise<void> {
  const XLSX = await import("xlsx");

  const data = [
    ["Place", "Date", "Time", "Transport", "Description"],
    ...entries.map((e) => {
      const r = formatRow(e);
      return [r.place, r.date, r.time, r.transport, r.description];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = [
    { wch: 30 },
    { wch: 22 },
    { wch: 10 },
    { wch: 18 },
    { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
  XLSX.writeFile(wb, "trip-itinerary.xlsx");
}
