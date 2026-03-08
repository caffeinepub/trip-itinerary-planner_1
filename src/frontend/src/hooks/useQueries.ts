import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalBlob,
  type TripDocument,
  type TripEntry,
  UserRole,
} from "../backend";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { markBlobAsPdf } from "../utils/pdfTracker";
import { useActor } from "./useActor";

/**
 * Get the actor from cache, or create a fresh anonymous actor as a last resort.
 * Polls the query cache every 200ms for up to `timeoutMs`, then falls back to
 * creating a new anonymous actor directly.
 */
async function getOrCreateActor(
  queryClient: ReturnType<typeof useQueryClient>,
  timeoutMs = 5_000,
): Promise<backendInterface> {
  const deadline = Date.now() + timeoutMs;

  // Poll cache first
  const fromCache = await new Promise<backendInterface | null>((resolve) => {
    const poll = () => {
      const allQueries = queryClient.getQueriesData<backendInterface>({
        queryKey: ["actor"],
        exact: false,
      });
      const found = allQueries.find(([, data]) => !!data);
      if (found?.[1]) {
        resolve(found[1]);
        return;
      }
      // Fallback: scan all cached queries for actor-like entries
      const allCached = queryClient.getQueriesData<backendInterface>({});
      const fallback = allCached.find(
        ([key, data]) =>
          !!data &&
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          (key[0] as string).includes("actor"),
      );
      if (fallback?.[1]) {
        resolve(fallback[1]);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      setTimeout(poll, 200);
    };
    poll();
  });

  if (fromCache) return fromCache;

  // Cache miss after timeout — create a fresh anonymous actor directly
  return await createActorWithConfig();
}

export function useGetEntries() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<TripEntry[]>({
    queryKey: ["entries"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getEntries();
      return [...entries].sort((a, b) => {
        if (a.visitDate < b.visitDate) return -1;
        if (a.visitDate > b.visitDate) return 1;
        // Same date — sort by time string "HH:MM"
        const ta = a.visitTime || "00:00";
        const tb = b.visitTime || "00:00";
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useIsAdmin() {
  // App has no login — always return false without calling the backend
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => false,
    initialData: false,
  });
}

export function useGetCallerUserProfile() {
  // App has no login — always return null without calling the backend (would trap for anonymous)
  const query = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: async () => null,
    initialData: null,
    retry: false,
  });
  return {
    ...query,
    isLoading: false,
    isFetched: true,
  };
}

export interface CreateEntryParams {
  placeName: string;
  visitDate: bigint;
  visitTime: string;
  description: string;
  transportMode: string;
  venueType: string;
  imageFiles: File[];
  existingImages: ExternalBlob[];
  onProgress?: (fileIndex: number, pct: number) => void;
}

export function useCreateEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      placeName,
      visitDate,
      visitTime,
      description,
      transportMode,
      venueType,
      imageFiles,
      existingImages,
      onProgress,
    }: CreateEntryParams) => {
      const resolvedActor = actor ?? (await getOrCreateActor(queryClient));
      if (!resolvedActor) {
        throw new Error("Backend not ready. Please refresh and try again.");
      }
      const newBlobs = await Promise.all(
        imageFiles.map(async (file, i) => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
            onProgress?.(i, pct),
          );
          return blob;
        }),
      );
      const imageIds = [...existingImages, ...newBlobs];
      const attemptCreate = async (
        actorToUse: backendInterface,
      ): Promise<Awaited<ReturnType<backendInterface["createEntry"]>>> => {
        try {
          return await actorToUse.createEntry(
            placeName,
            visitDate,
            visitTime,
            description,
            transportMode,
            venueType,
            imageIds,
          );
        } catch (err: unknown) {
          // Normalize IC rejection objects into proper Error instances
          if (err && typeof err === "object" && !(err instanceof Error)) {
            const e = err as Record<string, unknown>;
            const msg =
              (typeof e.message === "string" && e.message) ||
              (typeof e.errorMessage === "string" && e.errorMessage) ||
              (typeof e.reject_message === "string" && e.reject_message) ||
              "Failed to save entry";
            throw new Error(msg);
          }
          throw err;
        }
      };

      let entry: Awaited<ReturnType<backendInterface["createEntry"]>>;
      try {
        entry = await attemptCreate(resolvedActor);
      } catch {
        // Retry once with a fresh actor after a short delay (handles canister restarts)
        await new Promise((r) => setTimeout(r, 2_000));
        const freshActor = await createActorWithConfig();
        entry = await attemptCreate(freshActor);
      }
      // Mark any newly uploaded PDF blobs so they can be identified at display time
      imageFiles.forEach((file, i) => {
        if (file.type === "application/pdf") {
          const url = newBlobs[i]?.getDirectURL();
          if (url) markBlobAsPdf(url);
        }
      });
      // Also mark blobs from the saved entry (authoritative URLs)
      entry.imageIds.forEach((blob, idx) => {
        const originalFile = imageFiles[idx - existingImages.length];
        if (originalFile?.type === "application/pdf") {
          markBlobAsPdf(blob.getDirectURL());
        }
      });
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export interface UpdateEntryParams extends CreateEntryParams {
  id: bigint;
}

export function useUpdateEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      placeName,
      visitDate,
      visitTime,
      description,
      transportMode,
      venueType,
      imageFiles,
      existingImages,
      onProgress,
    }: UpdateEntryParams) => {
      const resolvedActor = actor ?? (await getOrCreateActor(queryClient));
      if (!resolvedActor) {
        throw new Error("Backend not ready. Please refresh and try again.");
      }
      const newBlobs = await Promise.all(
        imageFiles.map(async (file, i) => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
            onProgress?.(i, pct),
          );
          return blob;
        }),
      );
      const imageIds = [...existingImages, ...newBlobs];
      const attemptUpdate = async (
        actorToUse: backendInterface,
      ): Promise<Awaited<ReturnType<backendInterface["updateEntry"]>>> => {
        try {
          return await actorToUse.updateEntry(
            id,
            placeName,
            visitDate,
            visitTime,
            description,
            transportMode,
            venueType,
            imageIds,
          );
        } catch (err: unknown) {
          if (err && typeof err === "object" && !(err instanceof Error)) {
            const e = err as Record<string, unknown>;
            const msg =
              (typeof e.message === "string" && e.message) ||
              (typeof e.errorMessage === "string" && e.errorMessage) ||
              (typeof e.reject_message === "string" && e.reject_message) ||
              "Failed to update entry";
            throw new Error(msg);
          }
          throw err;
        }
      };

      let entry: Awaited<ReturnType<backendInterface["updateEntry"]>>;
      try {
        entry = await attemptUpdate(resolvedActor);
      } catch {
        // Retry once with a fresh actor after a short delay (handles canister restarts)
        await new Promise((r) => setTimeout(r, 2_000));
        const freshActor = await createActorWithConfig();
        entry = await attemptUpdate(freshActor);
      }
      // Mark any newly uploaded PDF blobs so they can be identified at display time
      imageFiles.forEach((file, i) => {
        if (file.type === "application/pdf") {
          const url = newBlobs[i]?.getDirectURL();
          if (url) markBlobAsPdf(url);
        }
      });
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useDeleteEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const resolvedActor = actor ?? (await getOrCreateActor(queryClient));
      return resolvedActor.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useSaveProfile() {
  // App has no login — no-op mutation (saveCallerUserProfile traps for anonymous users)
  return useMutation({
    mutationFn: async (_name: string) => {
      // no-op
    },
  });
}

export function useGetCallerUserRole() {
  // App has no login — always return guest without calling the backend (would trap for anonymous)
  return useQuery<UserRole>({
    queryKey: ["callerUserRole"],
    queryFn: async () => UserRole.guest,
    initialData: UserRole.guest,
  });
}

// ---- Trip Documents ----

export function useGetDocuments() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<TripDocument[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      if (!actor) return [];
      const docs = await actor.getDocuments();
      return [...docs].sort((a, b) =>
        a.docDate < b.docDate ? -1 : a.docDate > b.docDate ? 1 : 0,
      );
    },
    enabled: !!actor && !actorFetching,
  });
}

export interface CreateDocumentParams {
  title: string;
  docDate: bigint;
  note: string;
  file: File;
  onProgress?: (pct: number) => void;
}

export function useCreateDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      docDate,
      note,
      file,
      onProgress,
    }: CreateDocumentParams) => {
      const resolvedActor = actor ?? (await getOrCreateActor(queryClient));
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        onProgress?.(pct),
      );
      return resolvedActor.createDocument(title, docDate, note, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const resolvedActor = actor ?? (await getOrCreateActor(queryClient));
      return resolvedActor.deleteDocument(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
