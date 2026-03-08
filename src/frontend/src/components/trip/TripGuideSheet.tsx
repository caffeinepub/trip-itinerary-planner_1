import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import type { TripEntry } from "../../backend";
import { bigIntNsToDate, formatDisplayDate } from "../../utils/dateUtils";
import {
  TRANSPORT_OPTIONS,
  getTransportOption,
} from "../../utils/transportConfig";

interface TripGuideSheetProps {
  open: boolean;
  onClose: () => void;
  entries: TripEntry[];
}

// Map transport mode to Google Maps travelmode
function toGoogleTravelMode(transportMode: string): string {
  switch (transportMode) {
    case "Flight":
      return "flying";
    case "Train":
    case "Bus":
    case "Boat":
      return "transit";
    case "Car":
    case "Taxi":
    case "Other":
      return "driving";
    case "Walk":
      return "walking";
    default:
      return "driving";
  }
}

function buildDirectionsUrl(
  from: string,
  to: string,
  transportMode: string,
): string {
  const mode = toGoogleTravelMode(transportMode);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}&hl=en&entry=tts`;
}

function buildSearchUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}&hl=en&entry=tts`;
}

export function TripGuideSheet({
  open,
  onClose,
  entries,
}: TripGuideSheetProps) {
  // Sort entries by visitDate
  const sortedEntries = [...entries].sort((a, b) =>
    a.visitDate < b.visitDate ? -1 : a.visitDate > b.visitDate ? 1 : 0,
  );

  // Transport mode summary
  const transportCounts = sortedEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      const mode = entry.transportMode || "Other";
      acc[mode] = (acc[mode] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const transportSummary = Object.entries(transportCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([mode, count]) => ({
      mode,
      count,
      option: getTransportOption(mode),
    }));

  // Navigation pairs: consecutive entries
  const navPairs = sortedEntries.slice(0, -1).map((entry, idx) => {
    const next = sortedEntries[idx + 1];
    return {
      from: entry,
      to: next,
      index: idx + 1,
    };
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        data-ocid="guide.sheet"
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal" />
            Trip Guide
          </SheetTitle>
          <SheetDescription>
            Transport summary and navigation links for your journey
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-6">
            {/* ===== Section 1: Transport Summary ===== */}
            <section data-ocid="guide.transport_summary.section">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-teal/10 flex items-center justify-center">
                  <Navigation className="w-3.5 h-3.5 text-teal" />
                </div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Transport Summary
                </h3>
              </div>

              {transportSummary.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No entries yet to summarize
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {transportSummary.map(({ mode, count, option }) => (
                    <div
                      key={mode}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border ${option.color}/30 bg-card`}
                    >
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${option.color}`}
                      >
                        {option.icon}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${option.textColor}`}
                        >
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "trip" : "trips"}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="ml-auto flex-shrink-0 h-5 text-xs px-1.5"
                      >
                        ×{count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {sortedEntries.length > 0 && (
                <div className="mt-3 px-3 py-2 bg-secondary/30 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Total destinations
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {sortedEntries.length}
                  </span>
                </div>
              )}
            </section>

            <Separator />

            {/* ===== Section 2: Navigation Links ===== */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-terracotta" />
                </div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Navigation Links
                </h3>
                {sortedEntries.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {sortedEntries.length}{" "}
                    {sortedEntries.length === 1 ? "stop" : "stops"}
                  </Badge>
                )}
              </div>

              {sortedEntries.length === 0 && (
                <div className="py-6 text-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Add trip entries to see navigation links
                  </p>
                </div>
              )}

              {/* Single entry — show search link */}
              {sortedEntries.length === 1 && (
                <div
                  data-ocid="guide.nav_link.1"
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-teal/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Starting Point
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {sortedEntries[0].placeName}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {formatDisplayDate(
                        bigIntNsToDate(sortedEntries[0].visitDate),
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-shrink-0 h-8 px-2.5 text-teal hover:bg-teal/10 hover:text-teal"
                    onClick={() =>
                      window.open(
                        buildSearchUrl(sortedEntries[0].placeName),
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Maps
                  </Button>
                </div>
              )}

              {/* Multiple entries — show direction pairs */}
              {navPairs.length > 0 && (
                <div className="space-y-2">
                  {navPairs.map(({ from, to, index }) => {
                    const transportOpt = getTransportOption(
                      to.transportMode || "Other",
                    );
                    const mapsUrl = buildDirectionsUrl(
                      from.placeName,
                      to.placeName,
                      to.transportMode,
                    );
                    return (
                      <div
                        key={`${String(from.id)}-${String(to.id)}`}
                        data-ocid={`guide.nav_link.${index}`}
                        className="p-3 bg-card border border-border rounded-lg hover:border-teal/40 transition-colors group"
                      >
                        {/* Entry count label */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground/60 font-medium">
                            Leg {index}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${transportOpt.color} ${transportOpt.textColor}`}
                          >
                            {transportOpt.icon}
                            {transportOpt.label}
                          </span>
                        </div>

                        {/* From → To */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">
                              From
                            </p>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {from.placeName}
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              {formatDisplayDate(
                                bigIntNsToDate(from.visitDate),
                              )}
                            </p>
                          </div>
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-xs text-muted-foreground">To</p>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {to.placeName}
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              {formatDisplayDate(bigIntNsToDate(to.visitDate))}
                            </p>
                          </div>
                        </div>

                        {/* Open in Maps button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs border-teal/30 text-teal hover:bg-teal/10 hover:border-teal hover:text-teal opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => window.open(mapsUrl, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3 mr-1.5" />
                          Open in Google Maps
                        </Button>
                      </div>
                    );
                  })}

                  {/* Final destination */}
                  {sortedEntries.length > 1 && (
                    <div className="p-3 bg-secondary/20 border border-dashed border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Final Destination
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-terracotta flex-shrink-0" />
                          <span className="text-sm font-semibold text-foreground">
                            {sortedEntries[sortedEntries.length - 1].placeName}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-teal hover:bg-teal/10"
                          onClick={() =>
                            window.open(
                              buildSearchUrl(
                                sortedEntries[sortedEntries.length - 1]
                                  .placeName,
                              ),
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
