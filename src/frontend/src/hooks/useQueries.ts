import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob, type TripEntry, UserRole } from "../backend";
import { useActor } from "./useActor";

export function useGetEntries() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<TripEntry[]>({
    queryKey: ["entries"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getEntries();
      return [...entries].sort((a, b) =>
        a.visitDate < b.visitDate ? -1 : a.visitDate > b.visitDate ? 1 : 0,
      );
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
      imageFiles,
      existingImages,
      onProgress,
    }: CreateEntryParams) => {
      if (!actor) throw new Error("Not authenticated");
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
      return actor.createEntry(
        placeName,
        visitDate,
        visitTime,
        description,
        transportMode,
        imageIds,
      );
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
      imageFiles,
      existingImages,
      onProgress,
    }: UpdateEntryParams) => {
      if (!actor) throw new Error("Not authenticated");
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
      return actor.updateEntry(
        id,
        placeName,
        visitDate,
        visitTime,
        description,
        transportMode,
        imageIds,
      );
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
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteEntry(id);
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
      if (!actor) throw new Error("Not authenticated");
      return actor.saveCallerUserProfile({ name });
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
