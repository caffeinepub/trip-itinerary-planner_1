import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";
import type { TripEntry } from "./backend";
import { DeleteConfirmDialog } from "./components/trip/DeleteConfirmDialog";
import { EntryForm } from "./components/trip/EntryForm";
import { ProfileSetupDialog } from "./components/trip/ProfileSetupDialog";
import { TripEntryCard } from "./components/trip/TripEntryCard";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetEntries,
  useIsAdmin,
} from "./hooks/useQueries";
import { exportToExcel, exportToPDF } from "./utils/exportUtils";

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const { data: entries = [], isLoading: entriesLoading } = useGetEntries();
  const { data: isAdmin = false } = useIsAdmin();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TripEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TripEntry | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Login failed";
        if (msg === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleExportPDF = async () => {
    if (!entries.length) {
      toast.error("No entries to export");
      return;
    }
    setExportingPdf(true);
    try {
      await exportToPDF(entries);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!entries.length) {
      toast.error("No entries to export");
      return;
    }
    setExportingExcel(true);
    try {
      await exportToExcel(entries);
      toast.success("Excel file downloaded!");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Could not copy link"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <Toaster richColors position="top-right" />

      {/* Profile Setup */}
      <ProfileSetupDialog open={showProfileSetup} />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
      />

      {/* Entry Form */}
      <EntryForm
        open={addFormOpen || !!editEntry}
        editEntry={editEntry}
        onClose={() => {
          setAddFormOpen(false);
          setEditEntry(null);
        }}
      />

      {/* ===== HEADER ===== */}
      <header
        data-ocid="header.section"
        className="relative overflow-hidden bg-gradient-to-r from-teal to-[oklch(0.45_0.14_205)] text-white shadow-lg"
      >
        {/* Background hero image */}
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(/assets/generated/trip-hero-bg.dim_1200x400.png)",
          }}
        />

        <div className="relative container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight leading-tight">
                Trip Itinerary
              </h1>
              {userProfile?.name && (
                <p className="text-white/70 text-sm">
                  {userProfile.name}&apos;s Journey
                </p>
              )}
            </div>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium ml-1">
                <ShieldCheck className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Link */}
            <Button
              data-ocid="header.share_link_button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
              onClick={handleCopyLink}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>

            {/* Export PDF */}
            <Button
              data-ocid="export.pdf_button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
              onClick={handleExportPDF}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-1.5" />
              )}
              PDF
            </Button>

            {/* Export Excel */}
            <Button
              data-ocid="export.excel_button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
              onClick={handleExportExcel}
              disabled={exportingExcel}
            >
              {exportingExcel ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              )}
              Excel
            </Button>

            {/* Auth */}
            {isInitializing ? (
              <div className="w-24 h-8 bg-white/20 rounded-md animate-pulse" />
            ) : isAuthenticated ? (
              <Button
                data-ocid="auth.logout_button"
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 border border-white/30"
                onClick={handleAuth}
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </Button>
            ) : (
              <Button
                data-ocid="auth.login_button"
                size="sm"
                className="bg-white text-teal hover:bg-white/90 font-medium"
                onClick={handleAuth}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-1.5" />
                )}
                {isLoggingIn ? "Logging in..." : "Login"}
              </Button>
            )}
          </div>
        </div>

        {/* Bottom wave */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 bg-background"
          style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }}
        />
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Entries loading skeleton */}
        {entriesLoading && (
          <div data-ocid="entries.loading_state" className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="postcard p-5 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Entry list */}
        {!entriesLoading && entries.length > 0 && (
          <div data-ocid="entries.list" className="space-y-4">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, index) => (
                <TripEntryCard
                  key={String(entry.id)}
                  entry={entry}
                  index={index}
                  isAdmin={isAdmin}
                  onEdit={setEditEntry}
                  onDelete={setDeleteEntry}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {!entriesLoading && entries.length === 0 && (
          <motion.div
            data-ocid="entries.empty_state"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <img
              src="/assets/generated/empty-state-travel.dim_400x300.png"
              alt="No trip entries yet"
              className="w-56 h-auto mb-6 opacity-90"
            />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              No adventures planned yet
            </h2>
            <p className="text-muted-foreground max-w-xs mb-6">
              {isAdmin
                ? "Start building your dream itinerary by adding your first destination."
                : "Log in as admin to start planning your trip."}
            </p>
            {isAdmin && (
              <Button
                data-ocid="add_entry.open_modal_button"
                className="bg-teal text-white hover:bg-teal/90"
                onClick={() => setAddFormOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            )}
          </motion.div>
        )}
      </main>

      {/* ===== FLOATING ADD BUTTON ===== */}
      {isAdmin && entries.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="fixed bottom-8 right-8 z-40"
        >
          <Button
            data-ocid="add_entry.open_modal_button"
            size="lg"
            className="h-14 w-14 rounded-full bg-terracotta text-white hover:bg-terracotta/90 shadow-xl hover:shadow-2xl transition-shadow"
            onClick={() => setAddFormOpen(true)}
            title="Add new entry"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>
          &copy; {new Date().getFullYear()}. Built with{" "}
          <span className="text-terracotta">♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
