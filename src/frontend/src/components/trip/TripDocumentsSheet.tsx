import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  File,
  FileText,
  FolderOpen,
  Image,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TripDocument } from "../../backend";
import {
  useCreateDocument,
  useDeleteDocument,
  useGetDocuments,
} from "../../hooks/useQueries";
import {
  bigIntNsToDate,
  dateToBigIntNs,
  formatDisplayDate,
  formatInputDate,
  parseDateInput,
} from "../../utils/dateUtils";

interface TripDocumentsSheetProps {
  open: boolean;
  onClose: () => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "doc", "docx"].includes(ext)) {
    return <FileText className="w-5 h-5 text-terracotta" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return <Image className="w-5 h-5 text-teal" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function getFileTypeLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "Image";
  return ext.toUpperCase() || "File";
}

export function TripDocumentsSheet({ open, onClose }: TripDocumentsSheetProps) {
  const { data: documents = [], isLoading } = useGetDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState(formatInputDate(new Date()));
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TripDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDocDate(formatInputDate(new Date()));
    setNote("");
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Document title is required");
      return;
    }
    if (!docDate) {
      toast.error("Please select a date");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    const dateObj = parseDateInput(docDate);
    const docDateBigInt = dateToBigIntNs(dateObj);

    setUploadProgress(0);
    try {
      await createDocument.mutateAsync({
        title: title.trim(),
        docDate: docDateBigInt,
        note: note.trim(),
        file: selectedFile,
        onProgress: (pct) => setUploadProgress(pct),
      });
      toast.success("Document uploaded!");
      resetForm();
    } catch {
      toast.error("Failed to upload document. Please try again.");
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument.mutateAsync(deleteTarget.id);
      toast.success("Document deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete document");
    }
  };

  // Group documents by date
  const groupedDocs = documents.reduce<Record<string, TripDocument[]>>(
    (acc, doc) => {
      const date = formatDisplayDate(bigIntNsToDate(doc.docDate));
      if (!acc[date]) acc[date] = [];
      acc[date].push(doc);
      return acc;
    },
    {},
  );

  const isUploading = createDocument.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          data-ocid="documents.sheet"
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
            <SheetTitle className="font-display text-xl flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-terracotta" />
              Trip Documents
            </SheetTitle>
            <SheetDescription>
              Upload hotel bookings, flight tickets, and other travel docs
            </SheetDescription>
          </SheetHeader>

          {/* Upload form */}
          <div className="px-5 py-4 border-b border-border bg-secondary/20 flex-shrink-0">
            <form onSubmit={handleUpload} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="doc-title" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="doc-title"
                  data-ocid="documents.title_input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flight Ticket - Delhi to Paris"
                  className="h-9 text-sm"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-date" className="text-sm font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="doc-date"
                  data-ocid="documents.date_input"
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="h-9 text-sm"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-note" className="text-sm font-medium">
                  Note{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="doc-note"
                  data-ocid="documents.note_textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Booking ref, seat info, check-in details..."
                  rows={2}
                  className="text-sm resize-none"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  File <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid="documents.upload_button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 h-9 px-3 flex items-center gap-2 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-teal hover:text-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-background"
                  >
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {selectedFile
                        ? selectedFile.name
                        : "Choose PDF, image, or Word doc"}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    {getFileTypeLabel(selectedFile.name)} ·{" "}
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              {/* Upload progress */}
              {isUploading && uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {uploadProgress}%
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  isUploading || !selectedFile || !title.trim() || !docDate
                }
                className="w-full bg-terracotta text-white hover:bg-terracotta/90 h-9"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Documents list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4">
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-secondary/40 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!isLoading && documents.length === 0 && (
                <div
                  data-ocid="documents.empty_state"
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <FolderOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No documents yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Upload your hotel bookings and flight tickets above
                  </p>
                </div>
              )}

              {!isLoading && documents.length > 0 && (
                <div className="space-y-5">
                  {Object.entries(groupedDocs).map(([dateLabel, docs]) => (
                    <div key={dateLabel}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-teal uppercase tracking-wide">
                          {dateLabel}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-2">
                        {docs.map((doc) => {
                          const globalIdx =
                            documents.findIndex((d) => d.id === doc.id) + 1;
                          return (
                            <div
                              key={String(doc.id)}
                              data-ocid={`documents.item.${globalIdx}`}
                              className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-teal/40 transition-colors group"
                            >
                              <div className="flex-shrink-0 w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                                {getFileIcon(doc.title)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {doc.title}
                                </p>
                                {doc.note && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {doc.note}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground/60 mt-0.5">
                                  {formatDisplayDate(
                                    bigIntNsToDate(doc.docDate),
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  data-ocid={`documents.view_button.${globalIdx}`}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-teal hover:text-teal hover:bg-teal/10"
                                  onClick={() =>
                                    window.open(
                                      doc.fileId.getDirectURL(),
                                      "_blank",
                                    )
                                  }
                                  title="View document"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  data-ocid={`documents.delete_button.${globalIdx}`}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(doc)}
                                  title="Delete document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently deleted. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="documents.delete_cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="documents.delete_confirm_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
