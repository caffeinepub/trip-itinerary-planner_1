# Trip Itinerary Planner

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Trip itinerary manager with shareable view
- Trip entries (places of visit) with the following fields:
  - Place name
  - Date and time of visit
  - Description / notes
  - Transport mode (e.g., Flight, Train, Bus, Car, Taxi, Walk, Boat, Other)
  - Image upload (one or more images per entry)
- CRUD operations: create, read, edit, delete entries
- Reordering of entries (by date or manual drag)
- Export to PDF (client-side using jsPDF or similar)
- Export to Excel (client-side using SheetJS/xlsx)
- Shareable read-only link for the trip

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
- Data model: `TripEntry` with fields: id, placeName, date, time, description, transportMode, imageIds (array of blob references), createdAt, updatedAt
- CRUD APIs: createEntry, getEntries, updateEntry, deleteEntry
- Blob storage for images (via blob-storage component)
- Authorization for owner-only write access, public read for sharing

### Frontend (React + TypeScript)
- Main itinerary view: list of trip entries sorted by date
- Add/Edit entry modal/sheet with form fields:
  - Place name (text input)
  - Date + time (date/time picker)
  - Description (textarea)
  - Transport mode (select dropdown)
  - Image upload (drag-and-drop or file picker, preview thumbnails)
- Delete entry with confirmation dialog
- Export buttons: "Export PDF" and "Export Excel"
- Shareable link: copy-to-clipboard button
- Empty state when no entries exist
- Responsive layout
