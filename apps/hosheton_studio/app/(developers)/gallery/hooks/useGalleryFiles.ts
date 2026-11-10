'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { uniqueGalleryFiles } from '../lib/gallery-adapters';
import { mediaGalleryApi } from '../lib/gallery-api';
import type { GalleryFileItem, GalleryPersonalFilter, GalleryScope } from '../lib/gallery-types';

export function isMongoObjectId(value?: string) {
    return /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());
}

async function loadGalleryFiles(options: {
    scope: GalleryScope;
    projectId?: string;
    chatId?: string;
    personalFilter?: GalleryPersonalFilter;
}): Promise<GalleryFileItem[]> {
    const { scope, projectId, chatId, personalFilter = 'all' } = options;

    if (scope === 'personal') {
        // Always load every personal-chat file (no this-chat / all-chats UI split).
        const res = await mediaGalleryApi.getPersonalChatFiles();
        return uniqueGalleryFiles(res.files ?? []);
    }

    if (scope === 'project' && projectId) {
        // This workflow's media + the personal (main) chat + this project's chats.
        // Other projects' chats are excluded server-side (and again here as a guard).
        const [project, chats] = await Promise.all([
            mediaGalleryApi.getProjectFiles(projectId),
            mediaGalleryApi.getPersonalChatFiles(undefined, projectId),
        ]);
        return uniqueGalleryFiles([
            ...(project.files ?? []),
            ...(chats.files ?? []).filter((file) => !file.projectId || file.projectId === projectId),
        ]);
    }

    // `all` pickers: merge workflow media (generated + assetRef uploads) with
    // personal-chat attachments so every call site sees both sources.
    const [workflow, personal] = await Promise.all([
        mediaGalleryApi.getAllFiles(),
        mediaGalleryApi.getPersonalChatFiles(),
    ]);
    return uniqueGalleryFiles([
        ...(workflow.files ?? []),
        ...(personal.files ?? []),
    ]);
}

/**
 * Shared loader for GalleryModal (and any future picker). Always returns both
 * uploaded and generated items for the active scope; `all` merges projects + chats.
 */
export function useGalleryFiles(options: {
    open: boolean;
    scope: GalleryScope;
    projectId?: string;
    chatId?: string;
    personalFilter?: GalleryPersonalFilter;
}) {
    const { t } = useTranslation('projects');
    const { open, scope, projectId, chatId, personalFilter = 'all' } = options;
    const [files, setFiles] = useState<GalleryFileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const frame = window.requestAnimationFrame(() => {
            setLoading(true);
            setError(null);
            loadGalleryFiles({ scope, projectId, chatId, personalFilter })
                .then((next) => {
                    if (!cancelled) setFiles(next);
                })
                .catch((err) => {
                    if (!cancelled) setError(getApiErrorMessage(err, t('gallery_error')));
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        });
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame);
        };
    }, [open, scope, projectId, chatId, personalFilter, t]);

    return { files, loading, error };
}
