import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, FileText, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { ExternalBlob, TripEntry } from "../../backend";
import { useCreateEntry, useUpdateEntry } from "../../hooks/useQueries";
import {
  bigIntNsToDate,
  dateToBigIntNs,
  formatInputDate,
  parseDateInput,
} from "../../utils/dateUtils";
import { isBlobPdf } from "../../utils/pdfTracker";
import { TRANSPORT_OPTIONS } from "../../utils/transportConfig";

interface EntryFormProps {
  open: boolean;
  editEntry: TripEntry | null;
  onClose: () => void;
}

interface ImagePreview {
  id: string;
  url: string;
  file?: File;
  existing?: ExternalBlob;
  isPdf?: boolean;
  fileName?: string;
}

let previewCounter = 0;
function newId() {
  previewCounter += 1;
  return `img-${previewCounter}`;
}

export function EntryForm({ open, editEntry, onClose }: EntryFormProps) {
  const isEditing = !!editEntry;

  const [placeName, setPlaceName] = useState(editEntry?.placeName ?? "");
  const [visitDate, setVisitDate] = useState(
    editEntry ? formatInputDate(bigIntNsToDate(editEntry.visitDate)) : "",
  );
  const [visitTime, setVisitTime] = useState(editEntry?.visitTime ?? "");
  const [transportMode, setTransportMode] = useState(
    editEntry?.transportMode ?? "Flight",
  );
  const [description, setDescription] = useState(editEntry?.description ?? "");
  const [images, setImages] = useState<ImagePreview[]>(() => {
    if (!editEntry) return [];
    return editEntry.imageIds.map((blob) => {
      const directUrl = blob.getDirectURL();
      const isPdf = isBlobPdf(directUrl);
      return {
        id: newId(),
        url: directUrl,
        existing: blob,
        isPdf,
        fileName: isPdf
          ? directUrl.split("/").pop() || "PDF Document"
          : undefined,
      };
    });
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const isSubmitting = createEntry.isPending || updateEntry.isPending;

  const resetForm = useCallback(() => {
    setPlaceName("");
    setVisitDate("");
    setVisitTime("");
    setTransportMode("Flight");
    setDescription("");
    setImages([]);
    setUploadProgress({});
  }, []);

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const addImageFiles = (files: FileList | null) => {
    if (!files) return;
    const newPreviews: ImagePreview[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) continue;
      const url = URL.createObjectURL(file);
      newPreviews.push({
        id: newId(),
        url,
        file,
        isPdf: isPdf || undefined,
        fileName: isPdf ? file.name : undefined,
      });
    }
    setImages((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => {
        if (img.id === id) {
          if (img.file) URL.revokeObjectURL(img.url);
          return false;
        }
        return true;
      });
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addImageFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      toast.error("Place name is required");
      return;
    }
    if (!visitDate) {
      toast.error("Please select a visit date");
      return;
    }

    const dateObj = parseDateInput(visitDate);
    const visitDateBigInt = dateToBigIntNs(dateObj);
    const existingImages = images
      .filter((img) => img.existing)
      .map((img) => img.existing!);
    const newFiles = images.filter((img) => img.file).map((img) => img.file!);

    const imageIdMap = images.filter((img) => img.file).map((img) => img.id);

    const handleProgress = (fileIdx: number, pct: number) => {
      const imgId = imageIdMap[fileIdx];
      if (imgId) {
        setUploadProgress((prev) => ({ ...prev, [imgId]: pct }));
      }
    };

    try {
      if (isEditing && editEntry) {
        await updateEntry.mutateAsync({
          id: editEntry.id,
          placeName: placeName.trim(),
          visitDate: visitDateBigInt,
          visitTime,
          description,
          transportMode,
          imageFiles: newFiles,
          existingImages,
          onProgress: handleProgress,
        });
        toast.success("Entry updated!");
      } else {
        await createEntry.mutateAsync({
          placeName: placeName.trim(),
          visitDate: visitDateBigInt,
          visitTime,
          description,
          transportMode,
          imageFiles: newFiles,
          existingImages,
          onProgress: handleProgress,
        });
        toast.success("Entry added!");
      }
      resetForm();
      onClose();
    } catch (err) {
      console.error("Save entry error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save entry. Please try again.";
      toast.error(msg);
    }
  };

  // Reset form when entry changes (dialog re-opens)
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  const currentEditId = editEntry ? String(editEntry.id) : null;
  if (currentEditId !== lastEditId) {
    setLastEditId(currentEditId);
    setPlaceName(editEntry?.placeName ?? "");
    setVisitDate(
      editEntry ? formatInputDate(bigIntNsToDate(editEntry.visitDate)) : "",
    );
    setVisitTime(editEntry?.visitTime ?? "");
    setTransportMode(editEntry?.transportMode ?? "Flight");
    setDescription(editEntry?.description ?? "");
    setImages(
      editEntry
        ? editEntry.imageIds.map((blob) => {
            const directUrl = blob.getDirectURL();
            const isPdf = isBlobPdf(directUrl);
            return {
              id: newId(),
              url: directUrl,
              existing: blob,
              isPdf: isPdf || undefined,
              fileName: isPdf
                ? directUrl.split("/").pop() || "PDF Document"
                : undefined,
            };
          })
        : [],
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="entry_form.dialog"
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Edit Entry" : "Add New Entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Place Name */}
          <div className="space-y-1.5">
            <Label htmlFor="place-name">
              Place Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="place-name"
              data-ocid="entry_form.place_input"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g. Eiffel Tower, Paris"
              required
            />
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visit-date"
                data-ocid="entry_form.date_input"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-time">Time</Label>
              <Input
                id="visit-time"
                data-ocid="entry_form.time_input"
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Transport Mode */}
          <div className="space-y-1.5">
            <Label>Transport Mode</Label>
            <Select value={transportMode} onValueChange={setTransportMode}>
              <SelectTrigger data-ocid="entry_form.transport_select">
                <SelectValue placeholder="Select transport" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-ocid="entry_form.description_textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's special about this place? Activities, notes, tips..."
              rows={3}
            />
          </div>

          {/* Image & PDF Upload */}
          <div className="space-y-2">
            <Label>Photos & Documents</Label>

            {/* Drop zone — label acts as click target for the hidden file input */}
            <label
              data-ocid="entry_form.image_upload.dropzone"
              htmlFor="file-upload"
              className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-teal bg-teal/5"
                  : "border-border hover:border-teal/50 hover:bg-secondary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files here, or{" "}
                <span className="text-teal font-medium">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images (JPG, PNG, WebP) and PDFs supported
              </p>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => addImageFiles(e.target.files)}
              />
            </label>

            {/* File previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img) => (
                  <div key={img.id} className="relative group">
                    {img.isPdf ? (
                      /* PDF preview card */
                      <div className="w-16 h-16 bg-secondary rounded-md ring-1 ring-border flex flex-col items-center justify-center gap-0.5 px-1">
                        <FileText className="w-6 h-6 text-terracotta flex-shrink-0" />
                        <span className="text-[9px] text-muted-foreground leading-tight text-center truncate w-full px-0.5">
                          {img.fileName
                            ? img.fileName.replace(/\.pdf$/i, "")
                            : "PDF"}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt={`Selected ${img.file ? "new upload" : "existing"}`}
                        className="w-16 h-16 object-cover rounded-md ring-1 ring-border"
                      />
                    )}
                    {/* Upload progress (images and PDFs) */}
                    {img.file &&
                      uploadProgress[img.id] !== undefined &&
                      uploadProgress[img.id] < 100 && (
                        <div className="absolute inset-0 bg-black/60 rounded-md flex flex-col items-center justify-center">
                          <Progress
                            value={uploadProgress[img.id]}
                            className="w-12 h-1.5"
                          />
                          <span className="text-white text-xs mt-1">
                            {uploadProgress[img.id]}%
                          </span>
                        </div>
                      )}
                    {img.file && uploadProgress[img.id] === 100 && (
                      <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      onClick={() => removeImage(img.id)}
                      aria-label={img.isPdf ? "Remove PDF" : "Remove image"}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  data-ocid="entry_form.upload_button"
                  className="w-16 h-16 border-2 border-dashed border-border rounded-md flex items-center justify-center text-muted-foreground hover:border-teal hover:text-teal transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add more files"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="entry_form.cancel_button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            data-ocid="entry_form.save_button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-teal text-white hover:bg-teal/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Entry"
            ) : (
              "Add Entry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
