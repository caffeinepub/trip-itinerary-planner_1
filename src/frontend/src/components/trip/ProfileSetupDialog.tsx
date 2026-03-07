import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveProfile } from "../../hooks/useQueries";

interface ProfileSetupDialogProps {
  open: boolean;
}

export function ProfileSetupDialog({ open }: ProfileSetupDialogProps) {
  const [name, setName] = useState("");
  const saveProfile = useSaveProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await saveProfile.mutateAsync(name.trim());
      toast.success("Welcome to Trip Itinerary!");
    } catch {
      toast.error("Could not save profile");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
              <User className="w-5 h-5 text-teal" />
            </div>
            <DialogTitle className="font-display text-xl">
              Welcome! What&apos;s your name?
            </DialogTitle>
          </div>
          <DialogDescription>
            Set up your profile to personalize your trip itinerary.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Your name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-teal text-white hover:bg-teal/90"
            disabled={!name.trim() || saveProfile.isPending}
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
