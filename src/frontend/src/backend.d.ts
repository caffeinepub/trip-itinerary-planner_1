import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface TripDocument {
    id: bigint;
    title: string;
    note: string;
    createdAt: bigint;
    fileId: ExternalBlob;
    docDate: bigint;
}
export interface TripEntry {
    id: bigint;
    placeName: string;
    order: bigint;
    createdAt: bigint;
    visitDate: bigint;
    visitTime: string;
    description: string;
    updatedAt: bigint;
    imageIds: Array<ExternalBlob>;
    transportMode: string;
    venueType: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDocument(title: string, docDate: bigint, note: string, fileId: ExternalBlob): Promise<TripDocument>;
    createEntry(placeName: string, visitDate: bigint, visitTime: string, description: string, transportMode: string, venueType: string, imageIds: Array<ExternalBlob>): Promise<TripEntry>;
    deleteDocument(id: bigint): Promise<void>;
    deleteEntry(id: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDocuments(): Promise<Array<TripDocument>>;
    getEntries(): Promise<Array<TripEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    reorderEntries(newOrder: Array<bigint>): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateEntry(id: bigint, placeName: string, visitDate: bigint, visitTime: string, description: string, transportMode: string, venueType: string, imageIds: Array<ExternalBlob>): Promise<TripEntry>;
}
