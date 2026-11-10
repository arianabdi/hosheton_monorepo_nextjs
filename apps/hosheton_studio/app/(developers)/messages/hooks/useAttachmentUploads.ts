'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DirectAttachmentKind } from '@/app/(marketplace)/lib/types';
import { uploadFileInChunks, resolveUploadedFileRef } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { useAuthStore } from '@/app/zustand/store/authStore';

export const ATTACHMENTS_MAX = 10;
export const ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;

export type UploadItem = {
    id: string;
    file: File;
    kind: DirectAttachmentKind;
    /** objectURL برای پیش‌نمایش عکس/ویدیو پیش از اتمام آپلود */
    previewUrl: string;
    progress: number;
    status: 'uploading' | 'done' | 'error';
    fileId: string;
    width: number | null;
    height: number | null;
    error?: unknown;
};

export function attachmentKindOf(mimetype: string): DirectAttachmentKind {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
}

/** ابعاد واقعی عکس/ویدیو — کاشی پیام از اول با همان نسبت ساخته می‌شود */
function readDimensions(kind: DirectAttachmentKind, url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
        if (kind === 'image') {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = url;
        } else if (kind === 'video') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
            video.onerror = () => resolve(null);
            video.src = url;
        } else {
            resolve(null);
        }
    });
}

/** فایل‌های کلیپ‌بورد/رهاکردن — اسکرین‌شات گاهی فقط در items است نه files */
export function filesFromTransfer(data: DataTransfer | null | undefined): File[] {
    if (!data) return [];
    if (data.files?.length) return Array.from(data.files);
    return Array.from(data.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
}

/** فیلد ویرایشی دیگری غیر از کامپوزر (جستجو، فرم دیالوگ) — paste آن دست نخورد */
function isOtherEditable(target: EventTarget | null, composer: Element | null): boolean {
    if (!(target instanceof Element)) return false;
    if (composer?.contains(target)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

export function shouldTakePaste(target: EventTarget | null, composer: Element | null): boolean {
    return !isOtherEditable(target, composer) && !document.querySelector('[role="dialog"]');
}

type Rejection ={ reason: 'too_many' | 'too_large'; file?: File };

/**
 * پیوست‌های کامپوزر: هر فایل بلافاصله با آپلودر تکه‌ای استودیو به استوریج فعال می‌رود
 * (سهمیهٔ فضای کاربر همان‌جا چک می‌شود) و شناسهٔ رکورد File برای ارسال پیام نگه داشته می‌شود.
 */
export function useAttachmentUploads(onReject: (rejection: Rejection) => void) {
    const token = useAuthStore((s) => s.token);
    const [items, setItems] = useState<UploadItem[]>([]);
    const controllers = useRef(new Map<string, AbortController>());
    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const patch = useCallback((id: string, next: Partial<UploadItem>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));
    }, []);

    const upload = useCallback(async (item: UploadItem) => {
        if (!token) return;
        const controller = new AbortController();
        controllers.current.set(item.id, controller);
        patch(item.id, { status: 'uploading', progress: 0, error: undefined });
        try {
            const result = await uploadFileInChunks({
                file: item.file,
                token,
                metadata: { source: 'studio-direct-message' },
                abortSignal: controller.signal,
                onProgress: (progress) => patch(item.id, { progress }),
            });
            const { fileId } = resolveUploadedFileRef(result);
            if (!fileId) throw new Error('UPLOAD_NO_FILE_ID');
            patch(item.id, { status: 'done', progress: 100, fileId });
        } catch (error) {
            if (controller.signal.aborted) return;
            patch(item.id, { status: 'error', error });
        } finally {
            controllers.current.delete(item.id);
        }
    }, [token, patch]);

    const add = useCallback((files: File[]) => {
        const room = ATTACHMENTS_MAX - itemsRef.current.length;
        if (files.length > room) onReject({ reason: 'too_many' });
        const accepted: UploadItem[] = [];
        for (const file of files.slice(0, Math.max(0, room))) {
            if (file.size > ATTACHMENT_MAX_BYTES) {
                onReject({ reason: 'too_large', file });
                continue;
            }
            const kind = attachmentKindOf(file.type || '');
            accepted.push({
                id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                kind,
                previewUrl: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '',
                progress: 0,
                status: 'uploading',
                fileId: '',
                width: null,
                height: null,
            });
        }
        if (!accepted.length) return;
        setItems((prev) => [...prev, ...accepted]);
        for (const item of accepted) {
            if (item.previewUrl) {
                void readDimensions(item.kind, item.previewUrl).then((dims) => {
                    if (dims) patch(item.id, dims);
                });
            }
            void upload(item);
        }
    }, [onReject, patch, upload]);

    const remove = useCallback((id: string) => {
        controllers.current.get(id)?.abort();
        setItems((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const retry = useCallback((id: string) => {
        const item = itemsRef.current.find((i) => i.id === id);
        if (item) void upload(item);
    }, [upload]);

    /** بعد از ارسال: پیش‌نمایش‌ها آزاد نمی‌شوند چون پیام خوش‌بینانه هنوز از آن‌ها استفاده می‌کند */
    const clear = useCallback(() => setItems([]), []);

    useEffect(() => () => {
        controllers.current.forEach((controller) => controller.abort());
    }, []);

    return {
        items,
        add,
        remove,
        retry,
        clear,
        uploading: items.some((item) => item.status === 'uploading'),
        hasErrors: items.some((item) => item.status === 'error'),
    };
}
