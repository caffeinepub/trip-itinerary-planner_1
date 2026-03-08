# Trip Itinerary Planner

## Current State

Full-stack trip itinerary app with entries (place, date, time, transport, venue type, images/PDFs), export to PDF/Excel, offline caching, and a trip guide sheet per entry. No login UI is shown to end users.

Two bugs reported:
1. **"Fail to save entry"** -- The backend still has `AccessControl.hasPermission(accessControlState, caller, #user)` checks on createEntry, getEntries, updateEntry, deleteEntry, reorderEntries, createDocument, getDocuments, deleteDocument. Since login was removed, all callers are anonymous/guests who don't hold the `#user` role, so every mutation is rejected.
2. **Place type picker not visible** -- The `DialogContent` uses `max-h-[90vh] overflow-y-auto` but the form fields (including the 10-icon venue type grid) may scroll out of visible range. Additionally, the `<form>` tag closes before the `DialogFooter`, so the Save button is outside the form and `handleSubmit` is wired via `onClick` instead of the form's `onSubmit`, which is fragile.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- **Backend (`main.mo`)**: Remove all `AccessControl.hasPermission` guards from `createEntry`, `getEntries`, `updateEntry`, `deleteEntry`, `reorderEntries`, `createDocument`, `getDocuments`, `deleteDocument`. These should be open to any caller (no auth required). Keep authorization imports for admin/profile functions which still need them.
- **Frontend (`EntryForm.tsx`)**: Move the `<form>` closing tag so it wraps the `DialogFooter` save/cancel buttons. Ensure the dialog scrolls correctly so the place type picker section is always reachable (add `overflow-y-auto` on the inner form area, not just the dialog).

### Remove
- Nothing.

## Implementation Plan

1. Regenerate Motoko backend without authorization guards on trip entry and document CRUD functions (keep auth for getUserProfile, saveCallerUserProfile, getCallerUserProfile, assignCallerUserRole, isCallerAdmin).
2. Update `EntryForm.tsx` to wrap `DialogFooter` inside the `<form>` element so save/cancel are part of the form, and ensure the scrollable area covers all fields including the venue type grid.
