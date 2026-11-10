'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';

/** سقف رسانه‌ی نمایشی هر قالب (همان سقف فرم) */
export const TEMPLATE_MAX_MEDIA = 8;

export type TemplateCreateFields = {
    title: string;
    description: string;
    kind: 'prompt' | 'workflow';
    sourceProjectId: string;
    promptText: string;
    selectedModelIds: string[];
    selectedTagKeys: string[];
    categoryId: string;
    price: string;
    previewMedia: TemplatePreviewMedia[];
    /** فقط ادمین: انتشار به نام این کاربر نمایشی ('' = خودم) */
    publishAsUserId: string;
    /** فقط ادمین: وضعیت انتشار بعد از ثبت (approved = منتشرشده بدون صف بررسی) */
    publishStatus: 'draft' | 'approved';
};

type FieldUpdate<K extends keyof TemplateCreateFields> =
    | TemplateCreateFields[K]
    | ((prev: TemplateCreateFields[K]) => TemplateCreateFields[K]);

type TemplateCreateState = TemplateCreateFields & {
    /** صاحب پیش‌نویس — با ورود کاربر دیگر پاک می‌شود */
    ownerUserId: string;
    hydrated: boolean;
    setField: <K extends keyof TemplateCreateFields>(key: K, value: FieldUpdate<K>) => void;
    patch: (fields: Partial<TemplateCreateFields>) => void;
    toggleMedia: (media: TemplatePreviewMedia) => void;
    /** افزودن (بدون برداشتن) — رسانه‌های تکراری نادیده، تا سقف قالب */
    addMedia: (items: TemplatePreviewMedia[]) => void;
    /** افزودن پرامپت اگر نیست */
    addPrompt: (text: string) => void;
    removeMedia: (media: TemplatePreviewMedia) => void;
    setCover: (media: TemplatePreviewMedia) => void;
    /** پرامپت یک نوبت چت به پرامپت قالب (اگر هست، برداشته می‌شود) */
    togglePrompt: (text: string) => void;
    addModelId: (modelId: string) => void;
    claimOwner: (userId: string | null | undefined) => void;
    reset: () => void;
};

export const EMPTY_TEMPLATE_FIELDS: TemplateCreateFields = {
    title: '',
    description: '',
    kind: 'prompt',
    sourceProjectId: '',
    promptText: '',
    selectedModelIds: [],
    selectedTagKeys: [],
    categoryId: '',
    price: '0',
    previewMedia: [],
    publishAsUserId: '',
    // بیشتر قالب‌های ادمین مستقیم منتشر می‌شوند
    publishStatus: 'approved',
};

export function templateMediaKey(media: Pick<TemplatePreviewMedia, 'fileId' | 'fileKey' | 'url'>) {
    return String(media.fileId || media.fileKey || media.url || '');
}

/** فقط فیلدهایی که قالب لازم دارد (بدون هزینه/نوبت/... رسانه‌ی چت) */
export function toTemplatePreviewMedia(media: TemplatePreviewMedia): TemplatePreviewMedia {
    return {
        url: media.url,
        type: media.type === 'video' ? 'video' : media.type === 'audio' ? 'audio' : 'image',
        fileId: media.fileId,
        fileKey: media.fileKey,
        thumbnailUrl: media.thumbnailUrl,
        thumbnailUrlLarge: media.thumbnailUrlLarge,
        label: media.label,
        width: media.width,
        height: media.height,
        aspectRatio: media.aspectRatio,
        durationSeconds: media.durationSeconds,
        source: media.source || 'generated',
    };
}

function withCover(items: TemplatePreviewMedia[]) {
    const hasCover = items.some((item) => item.isCover);
    return items.map((item, index) => ({ ...item, isCover: hasCover ? Boolean(item.isCover) : index === 0 }));
}

export function promptBlocks(promptText: string) {
    return promptText.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

/** پیش‌نویس قدیمی فرم (template-form-draft) — یک بار به استور منتقل می‌شود */
const LEGACY_DRAFT_PREFIX = 'hosheton.template-form-draft.';

function readLegacyDraft(userId: string): Partial<TemplateCreateFields> | null {
    try {
        const key = `${LEGACY_DRAFT_PREFIX}${userId || 'guest'}`;
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        window.localStorage.removeItem(key);
        const draft = JSON.parse(raw) as Partial<TemplateCreateFields> & { mode?: string };
        return draft?.mode === 'create' ? draft : null;
    } catch {
        return null;
    }
}

function hasContent(fields: TemplateCreateFields) {
    return Boolean(
        fields.title.trim() || fields.description.trim() || fields.promptText.trim()
        || fields.previewMedia.length || fields.selectedTagKeys.length || fields.selectedModelIds.length
        || (Number(fields.price) || 0) > 0,
    );
}

/**
 * فرم «ساخت قالب» — یک state مشترک بین صفحه‌ی /templates/new و پنل «قالب» کنار چت.
 * هرچه در پنل چت اضافه شود همان لحظه در صفحه‌ی ساخت قالب هست و برعکس (localStorage، بین تب‌ها و رفرش).
 * حالت «ویرایش قالب موجود» این استور را لمس نمی‌کند.
 */
export const useTemplateCreateStore = create<TemplateCreateState>()(
    persist(
        (set, get) => ({
            ...EMPTY_TEMPLATE_FIELDS,
            ownerUserId: '',
            hydrated: false,
            setField: (key, value) => set((state) => ({
                [key]: typeof value === 'function'
                    ? (value as (prev: TemplateCreateFields[typeof key]) => TemplateCreateFields[typeof key])(state[key])
                    : value,
            } as Partial<TemplateCreateState>)),
            patch: (fields) => set(fields),
            toggleMedia: (media) => set((state) => {
                const key = templateMediaKey(media);
                if (!key) return state;
                if (state.previewMedia.some((item) => templateMediaKey(item) === key)) {
                    return { previewMedia: withCover(state.previewMedia.filter((item) => templateMediaKey(item) !== key)) };
                }
                if (state.previewMedia.length >= TEMPLATE_MAX_MEDIA) return state;
                return { previewMedia: withCover([...state.previewMedia, toTemplatePreviewMedia(media)]) };
            }),
            addMedia: (items) => set((state) => {
                const next = [...state.previewMedia];
                for (const media of items) {
                    const key = templateMediaKey(media);
                    if (!key || next.some((item) => templateMediaKey(item) === key)) continue;
                    if (next.length >= TEMPLATE_MAX_MEDIA) break;
                    next.push(toTemplatePreviewMedia(media));
                }
                return { previewMedia: withCover(next) };
            }),
            addPrompt: (text) => set((state) => {
                const value = String(text || '').trim();
                const blocks = promptBlocks(state.promptText);
                return !value || blocks.includes(value) ? state : { promptText: [...blocks, value].join('\n\n') };
            }),
            removeMedia: (media) => set((state) => ({
                previewMedia: withCover(state.previewMedia.filter((item) => templateMediaKey(item) !== templateMediaKey(media))),
            })),
            setCover: (media) => set((state) => ({
                previewMedia: state.previewMedia.map((item) => ({ ...item, isCover: templateMediaKey(item) === templateMediaKey(media) })),
            })),
            togglePrompt: (text) => set((state) => {
                const value = String(text || '').trim();
                if (!value) return state;
                const blocks = promptBlocks(state.promptText);
                const next = blocks.includes(value) ? blocks.filter((block) => block !== value) : [...blocks, value];
                return { promptText: next.join('\n\n') };
            }),
            addModelId: (modelId) => set((state) => {
                const id = String(modelId || '').trim();
                return !id || state.selectedModelIds.includes(id) ? state : { selectedModelIds: [...state.selectedModelIds, id] };
            }),
            claimOwner: (userId) => {
                const id = String(userId || '');
                if (!id) return;
                const { ownerUserId } = get();
                if (ownerUserId === id) return;
                // پیش‌نویس کاربر دیگری روی این مرورگر بود → از نو؛ پیش‌نویس قدیمی همین کاربر منتقل می‌شود
                const legacy = readLegacyDraft(id);
                const base = ownerUserId ? { ...EMPTY_TEMPLATE_FIELDS } : pickFields(get());
                set({
                    ...base,
                    ...(legacy && !hasContent(base) ? pickFields({ ...EMPTY_TEMPLATE_FIELDS, ...legacy }) : {}),
                    ownerUserId: id,
                });
            },
            reset: () => set({ ...EMPTY_TEMPLATE_FIELDS }),
        }),
        {
            name: 'hosheton.template-create',
            storage: createJSONStorage(() => localStorage),
            // بعد از mount خوانده می‌شود (rehydrateTemplateCreateStore) تا HTML سرور و کلاینت یکی بماند
            skipHydration: true,
            partialize: (state) => ({ ...pickFields(state), ownerUserId: state.ownerUserId }),
            onRehydrateStorage: () => () => {
                useTemplateCreateStore.setState({ hydrated: true });
            },
        },
    ),
);

function pickFields(state: TemplateCreateFields): TemplateCreateFields {
    return {
        title: state.title || '',
        description: state.description || '',
        kind: state.kind === 'workflow' ? 'workflow' : 'prompt',
        sourceProjectId: state.sourceProjectId || '',
        promptText: state.promptText || '',
        selectedModelIds: Array.isArray(state.selectedModelIds) ? state.selectedModelIds : [],
        selectedTagKeys: Array.isArray(state.selectedTagKeys) ? state.selectedTagKeys : [],
        categoryId: state.categoryId || '',
        price: String(state.price ?? '0'),
        previewMedia: Array.isArray(state.previewMedia) ? state.previewMedia : [],
        publishAsUserId: typeof state.publishAsUserId === 'string' ? state.publishAsUserId : '',
        publishStatus: state.publishStatus === 'draft' ? 'draft' : 'approved',
    };
}

let rehydrateStarted = false;
let crossTabSyncStarted = false;

/** یک بار بعد از mount: خواندن از localStorage + همگام‌سازی بین تب‌ها (پنل چت در یک تب، فرم در تب دیگر) */
export function rehydrateTemplateCreateStore() {
    if (typeof window === 'undefined') return;
    if (!rehydrateStarted) {
        rehydrateStarted = true;
        void useTemplateCreateStore.persist.rehydrate();
    }
    if (!crossTabSyncStarted) {
        crossTabSyncStarted = true;
        window.addEventListener('storage', (event) => {
            if (event.key === 'hosheton.template-create') void useTemplateCreateStore.persist.rehydrate();
        });
    }
}

export function templateDraftHasContent(state: TemplateCreateFields) {
    return hasContent(state);
}
