'use client';

import { useEffect, useState } from 'react';

export interface AssetUploadSession {
    uploading: boolean;
    progress: number;
    started: boolean;
}

const sessions = new Map<string, AssetUploadSession>();
const pendingFiles = new Map<string, File[]>();
const listeners = new Map<string, Set<() => void>>();

function emit(nodeId: string) {
    listeners.get(nodeId)?.forEach((listener) => listener());
}

export function getAssetUploadSession(nodeId: string): AssetUploadSession | undefined {
    return sessions.get(nodeId);
}

export function subscribeAssetUploadSession(nodeId: string, onChange: () => void): () => void {
    let set = listeners.get(nodeId);
    if (!set) {
        set = new Set();
        listeners.set(nodeId, set);
    }
    set.add(onChange);
    return () => {
        set!.delete(onChange);
        if (set!.size === 0) listeners.delete(nodeId);
    };
}

export function enqueuePendingAssetFiles(nodeId: string, files: File[]) {
    if (!files.length) return;
    const current = pendingFiles.get(nodeId) ?? [];
    pendingFiles.set(nodeId, [...current, ...files]);
    sessions.set(nodeId, { uploading: true, progress: 0, started: false });
    emit(nodeId);
}

export function enqueuePendingAssetFile(nodeId: string, file: File) {
    enqueuePendingAssetFiles(nodeId, [file]);
}

export function takePendingAssetFiles(nodeId: string): File[] {
    const files = pendingFiles.get(nodeId) ?? [];
    pendingFiles.delete(nodeId);
    return files;
}

export function takePendingAssetFile(nodeId: string): File | undefined {
    return takePendingAssetFiles(nodeId)[0];
}

/** Returns false if another uploader already owns this node. */
export function beginAssetUpload(nodeId: string): boolean {
    const current = sessions.get(nodeId);
    if (current?.started) return false;
    sessions.set(nodeId, { uploading: true, progress: 0, started: true });
    emit(nodeId);
    return true;
}

export function updateAssetUploadProgress(nodeId: string, progress: number) {
    const current = sessions.get(nodeId);
    if (!current) return;
    sessions.set(nodeId, { ...current, progress });
    emit(nodeId);
}

export function endAssetUpload(nodeId: string) {
    sessions.delete(nodeId);
    pendingFiles.delete(nodeId);
    emit(nodeId);
}

export function useAssetUploadSession(nodeId?: string): AssetUploadSession | undefined {
    const [session, setSession] = useState<AssetUploadSession | undefined>(
        () => (nodeId ? getAssetUploadSession(nodeId) : undefined),
    );

    useEffect(() => {
        if (!nodeId) {
            setSession(undefined);
            return;
        }
        setSession(getAssetUploadSession(nodeId));
        return subscribeAssetUploadSession(nodeId, () => {
            setSession(getAssetUploadSession(nodeId));
        });
    }, [nodeId]);

    return session;
}
