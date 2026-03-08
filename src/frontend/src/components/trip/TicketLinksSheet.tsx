import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExternalLink, Link2, Plus, Tag, Ticket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TicketLink {
  id: string;
  label: string;
  url: string;
}

interface TicketLinksSheetProps {
  open: boolean;
  onClose: () => void;
  entryId: bigint;
  placeName: string;
}

function getStorageKey(entryId: bigint) {
  return `ticket_links_${entryId.toString()}`;
}

function loadLinks(entryId: bigint): TicketLink[] {
  try {
    const raw = localStorage.getItem(getStorageKey(entryId));
    if (!raw) return [];
    return JSON.parse(raw) as TicketLink[];
  } catch {
    return [];
  }
}

function saveLinks(entryId: bigint, links: TicketLink[]) {
  localStorage.setItem(getStorageKey(entryId), JSON.stringify(links));
}

export function TicketLinksSheet({
  open,
  onClose,
  entryId,
  placeName,
}: TicketLinksSheetProps) {
  const [links, setLinks] = useState<TicketLink[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Load links whenever the sheet opens or entryId changes
  useEffect(() => {
    if (open) {
      setLinks(loadLinks(entryId));
    }
  }, [open, entryId]);

  const handleAdd = () => {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();

    if (!trimmedLabel) {
      setFormError("Please enter a label for this website.");
      return;
    }
    if (
      !trimmedUrl.startsWith("http://") &&
      !trimmedUrl.startsWith("https://")
    ) {
      setFormError("URL must start with http:// or https://");
      return;
    }

    const newLink: TicketLink = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      url: trimmedUrl,
    };
    const updated = [...links, newLink];
    setLinks(updated);
    saveLinks(entryId, updated);
    setLabel("");
    setUrl("");
    setFormError(null);
  };

  const handleDelete = (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    if (!window.confirm(`Remove "${link.label}" from ticket links?`)) return;
    const updated = links.filter((l) => l.id !== id);
    setLinks(updated);
    saveLinks(entryId, updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        data-ocid="ticket_sheet.sheet"
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="truncate">Buy Tickets</span>
          </SheetTitle>
          <SheetDescription className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground/70 truncate">
              {placeName}
            </span>
            <span>Save ticket websites to compare prices</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-5">
            {/* ===== Add Link Form ===== */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-3 border border-border">
              <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Add Ticket Website
              </h3>

              <div className="space-y-2">
                <div className="relative">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    data-ocid="ticket_sheet.label_input"
                    placeholder="e.g. GetYourGuide, Viator, Klook"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setFormError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-8 h-9 text-sm bg-background"
                  />
                </div>

                <div className="relative">
                  <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    data-ocid="ticket_sheet.url_input"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setFormError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-8 h-9 text-sm bg-background font-mono"
                    type="url"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                    {formError}
                  </p>
                )}

                <Button
                  data-ocid="ticket_sheet.add_button"
                  type="button"
                  size="sm"
                  className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-medium"
                  onClick={handleAdd}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Link
                </Button>
              </div>
            </div>

            {/* ===== Saved Links ===== */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-foreground">
                  Saved Websites
                </h3>
                {links.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {links.length} {links.length === 1 ? "site" : "sites"}
                  </span>
                )}
              </div>

              {links.length === 0 ? (
                <div
                  data-ocid="ticket_sheet.empty_state"
                  className="py-10 text-center flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-emerald-500/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No ticket websites saved yet
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Add one above to compare prices
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link, idx) => {
                    const markerIdx = idx + 1;
                    return (
                      <div
                        key={link.id}
                        data-ocid={`ticket_sheet.link.item.${markerIdx}`}
                        className="group flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-emerald-500/40 hover:shadow-sm transition-all duration-200"
                      >
                        {/* Site favicon-style icon */}
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-4 h-4 text-emerald-600" />
                        </div>

                        {/* Label + URL */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">
                            {link.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {link.url}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => window.open(link.url, "_blank")}
                            title={`Open ${link.label}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            data-ocid={`ticket_sheet.link.delete_button.${markerIdx}`}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(link.id)}
                            title={`Remove ${link.label}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
