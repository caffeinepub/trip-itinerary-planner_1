import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalBlob,
  type TripDocument,
  type TripEntry,
  UserRole,
} from "../backend";
import type { backendInterface } from "../backend";
import { markBlobAsPdf } from "../utils/pdfTracker";
import { useActor } from "./useActor";

/**
 * Wait for the actor to become available via the React Query cache.
 * Polls the query cache every 200ms for up to `timeoutMs`.
 */
async function waitForActorInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  timeoutMs = 10_000,
): Promise<backendInterface> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      // React Query caches the actor under a key that includes the identity principal.
      // We search for any "actor" query that has resolved data.
      const actorQuery = queryClient
        .getQueriesData<backendInterface>({ queryKey: ["actor"], exact: false })
        .find(([, data]) => !!data);

      if (actorQuery?.[1]) {
        resolve(actorQuery[1]);
        return;
      }
      if (Date.now() >= deadline) {
        reject(
          new Error(
            "Connection not ready. Please wait a moment and try again.",
          ),
        );
        return;
      }
      setTimeout(poll, 200);
    };
    poll();
  });
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
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
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
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
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
      const entry = await resolvedActor.createEntry(
        placeName,
        visitDate,
        visitTime,
        description,
        transportMode,
        venueType,
        imageIds,
      );
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
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
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
      const entry = await resolvedActor.updateEntry(
        id,
        placeName,
        visitDate,
        visitTime,
        description,
        transportMode,
        venueType,
        imageIds,
      );
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
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
      return resolvedActor.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
      return resolvedActor.saveCallerUserProfile({ name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<UserRole>({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
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
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
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
      const resolvedActor = actor ?? (await waitForActorInCache(queryClient));
      return resolvedActor.deleteDocument(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
