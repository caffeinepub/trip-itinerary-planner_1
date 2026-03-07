import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TripEntry } from "../../backend";
import { useDeleteEntry } from "../../hooks/useQueries";

interface DeleteConfirmDialogProps {
  entry: TripEntry | null;
  onClose: () => void;
}

export function DeleteConfirmDialog({
  entry,
  onClose,
}: DeleteConfirmDialogProps) {
  const deleteEntry = useDeleteEntry();

  const handleConfirm = async () => {
    if (!entry) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success(`"${entry.placeName}" removed`);
      onClose();
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  return (
    <AlertDialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent data-ocid="delete_confirm.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-display">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Entry
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <strong>&quot;{entry?.placeName}&quot;</strong>? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            data-ocid="delete_confirm.cancel_button"
            variant="outline"
            onClick={onClose}
            disabled={deleteEntry.isPending}
          >
            Cancel
          </Button>
          <Button
            data-ocid="delete_confirm.confirm_button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteEntry.isPending}
          >
            {deleteEntry.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
