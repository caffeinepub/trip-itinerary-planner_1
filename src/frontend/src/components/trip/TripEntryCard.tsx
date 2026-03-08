import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit2,
  Images,
  MapPin,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { TripEntry } from "../../backend";
import {
  bigIntNsToDate,
  formatDisplayDate,
  formatDisplayTime,
} from "../../utils/dateUtils";
import { ImageLightbox } from "./ImageLightbox";
import { TransportBadge } from "./TransportBadge";

interface TripEntryCardProps {
  entry: TripEntry;
  index: number;
  onEdit: (entry: TripEntry) => void;
  onDelete: (entry: TripEntry) => void;
  onGuide: () => void;
}

export function TripEntryCard({
  entry,
  index,
  onEdit,
  onDelete,
  onGuide,
}: TripEntryCardProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const date = bigIntNsToDate(entry.visitDate);
  const formattedDate = formatDisplayDate(date);
  const imageUrls = entry.imageIds.map((img) => img.getDirectURL());

  const markerIdx = index + 1;

  return (
    <>
      <motion.article
        data-ocid={`entries.item.${markerIdx}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.4, ease: "easeOut" }}
        className="postcard group relative overflow-hidden"
      >
        {/* Left accent stripe — day number */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-terracotta to-teal rounded-l-lg" />

        <div className="pl-5 pr-5 pt-5 pb-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Step number */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal text-white text-xs font-bold font-display flex-shrink-0">
                  {index + 1}
                </span>
                <TransportBadge mode={entry.transportMode} size="sm" />
              </div>

              {/* Place name */}
              <h2 className="font-display font-bold text-xl text-foreground leading-tight truncate">
                <MapPin className="inline w-4 h-4 text-terracotta mr-1.5 -mt-0.5" />
                {entry.placeName}
              </h2>

              {/* Date & time */}
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
                {entry.visitTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDisplayTime(entry.visitTime)}
                  </span>
                )}
              </div>
            </div>

            {/* Entry actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Guide button — always visible */}
              <Button
                data-ocid={`entry.guide_button.${markerIdx}`}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-teal hover:text-teal/80 hover:bg-teal/10"
                onClick={onGuide}
                title="Open trip guide"
              >
                <Compass className="w-4 h-4" />
              </Button>

              {/* Edit & Delete — hover-only */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  data-ocid={`entry.edit_button.${markerIdx}`}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-teal hover:bg-secondary"
                  onClick={() => onEdit(entry)}
                  title="Edit entry"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  data-ocid={`entry.delete_button.${markerIdx}`}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(entry)}
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Description */}
          {entry.description && (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed line-clamp-3">
              {entry.description}
            </p>
          )}

          {/* Photos toggle + expanded grid */}
          {imageUrls.length > 0 && (
            <div className="mt-3">
              <Button
                data-ocid={`entry.toggle.${markerIdx}`}
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-sm font-medium text-teal hover:text-teal/80 hover:bg-teal/10 px-2 h-8 -ml-2"
                onClick={() => setPhotosExpanded((v) => !v)}
              >
                <Images className="w-4 h-4" />
                {photosExpanded
                  ? "Hide Photos"
                  : `Show Photos (${imageUrls.length})`}
                {photosExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                )}
              </Button>

              <AnimatePresence initial={false}>
                {photosExpanded && (
                  <motion.div
                    key="photos"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {imageUrls.map((url, imgIdx) => (
                        <button
                          // biome-ignore lint/suspicious/noArrayIndexKey: image list is stable per entry
                          key={imgIdx}
                          type="button"
                          className="relative aspect-[4/3] rounded-lg overflow-hidden ring-2 ring-transparent hover:ring-terracotta transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                          onClick={() => setLightboxIndex(imgIdx)}
                          title={`View photo ${imgIdx + 1} of ${imageUrls.length}`}
                        >
                          <img
                            src={url}
                            alt={`${entry.placeName} view ${imgIdx + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.article>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={imageUrls}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
