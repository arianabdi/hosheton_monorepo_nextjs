'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuImages, LuUpload } from 'react-icons/lu';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import type { MediaProject, MediaWorkflowTemplate, TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { uploadFileInChunks } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { normalizeUploadPair, readMediaDimensions, removePreviewMedia, setCoverMedia } from '@/app/(developers)/templates/lib/preview-media';
import {
    EMPTY_TEMPLATE_FIELDS,
    rehydrateTemplateCreateStore,
    templateDraftHasContent,
    useTemplateCreateStore,
    type TemplateCreateFields,
} from '@/app/zustand/store/useTemplateCreateStore';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type { MarketplaceExploreCategory, TemplateTagCategoryItem } from '@/app/(marketplace)/lib/types';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { GalleryModal, galleryItemToPreviewMedia } from '@/app/(developers)/gallery';
import pageStyles from '@/app/(developers)/projects/ProjectsPage.module.scss';
import hubStyles from '@/app/(developers)/templates/TemplatesHub.module.scss';
import TemplatePreviewThumb from './TemplatePreviewThumb';
import TemplateFormGuide from './TemplateFormGuide';
import { PublisherSelect } from './components/PublisherSelect';
import { PublishStatusSelect } from './components/PublishStatusSelect';
import { useIsStaff } from './lib/personas';
import localStyles from './TemplateForm.module.scss';

type ProviderModelOption = ProviderModelItem & { providerName?: string };

function modelLabel(model: ProviderModelOption) {
    return (model.displayName || model.name || '').trim();
}

function applyTemplateToForm(
    template: MediaWorkflowTemplate,
    providerModels: ProviderModelOption[],
    setters: {
        setTitle: (v: string) => void;
        setDescription: (v: string) => void;
        setKind: (v: 'prompt' | 'workflow') => void;
        setPromptText: (v: string) => void;
        setSelectedModelIds: (v: string[]) => void;
        setSelectedTagKeys: (v: string[]) => void;
        setCategoryId: (v: string) => void;
        setPrice: (v: string) => void;
        setPreviewMedia: (v: TemplatePreviewMedia[]) => void;
    },
) {
    const modelNames = new Set((template.aiModels || []).map((name) => name.trim()).filter(Boolean));
    const matchedIds = providerModels
        .filter((model) => modelNames.has(modelLabel(model)))
        .map((model) => model._id);

    setters.setTitle(template.title || '');
    setters.setDescription(template.description || '');
    setters.setKind(template.kind === 'workflow' ? 'workflow' : 'prompt');
    setters.setPromptText(template.promptText || '');
    setters.setSelectedModelIds(matchedIds);
    setters.setSelectedTagKeys(template.tags || []);
    setters.setCategoryId(template.categoryIds?.[0] ? String(template.categoryIds[0]) : '');
    setters.setPrice(String(template.price ?? 0));
    const loaded = template.previewMedia || [];
    const hasCover = loaded.some((item) => item.isCover);
    setters.setPreviewMedia(loaded.map((item, index) => ({
        ...item,
        isCover: hasCover ? !!item.isCover : index === 0,
    })));
}

/**
 * یک فیلد فرم: در «ساخت قالب» از استور مشترک (همان که پنل «قالب» کنار چت پر می‌کند)،
 * در «ویرایش قالب موجود» state محلی همین صفحه.
 */
function useTemplateField<K extends keyof TemplateCreateFields>(key: K, shared: boolean) {
    const [local, setLocal] = useState<TemplateCreateFields[K]>(EMPTY_TEMPLATE_FIELDS[key]);
    const stored = useTemplateCreateStore((state) => state[key]);
    const setField = useTemplateCreateStore((state) => state.setField);
    const setValue = useCallback((value: SetStateAction<TemplateCreateFields[K]>) => {
        if (shared) setField(key, value);
        else setLocal(value);
    }, [shared, key, setField]);
    return [shared ? stored : local, setValue] as const;
}

export default function TemplateForm({
    mode,
    templateId,
}: {
    mode: 'create' | 'edit';
    templateId?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, i18n } = useTranslation('templates');
    const { t: tc } = useTranslation('common');
    const { t: tTag } = useTranslation('templateTags');
    const { token } = useAuthStore();
    const userId = useAppStore((s) => s.userId);
    const rtl = isRtlLanguage(i18n.language);

    const shared = mode === 'create';
    const [loading, setLoading] = useState(mode === 'edit');
    const storeHydrated = useTemplateCreateStore((state) => state.hydrated);
    const claimDraftOwner = useTemplateCreateStore((state) => state.claimOwner);
    const resetDraft = useTemplateCreateStore((state) => state.reset);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<MarketplaceExploreCategory[]>([]);
    const [providerModels, setProviderModels] = useState<ProviderModelOption[]>([]);
    const [title, setTitle] = useTemplateField('title', shared);
    const [description, setDescription] = useTemplateField('description', shared);
    const [kind, setKind] = useTemplateField('kind', shared);
    const [sourceProjectId, setSourceProjectId] = useTemplateField('sourceProjectId', shared);
    const [projects, setProjects] = useState<MediaProject[]>([]);
    const [promptText, setPromptText] = useTemplateField('promptText', shared);
    const [selectedModelIds, setSelectedModelIds] = useTemplateField('selectedModelIds', shared);
    const [selectedTagKeys, setSelectedTagKeys] = useTemplateField('selectedTagKeys', shared);
    const [tagCatalog, setTagCatalog] = useState<TemplateTagCategoryItem[]>([]);
    const [tagQuery, setTagQuery] = useState('');
    const [tagMenuOpen, setTagMenuOpen] = useState(false);
    const tagFieldRef = useRef<HTMLDivElement>(null);
    const [categoryId, setCategoryId] = useTemplateField('categoryId', shared);
    const [price, setPrice] = useTemplateField('price', shared);
    const [previewMedia, setPreviewMedia] = useTemplateField('previewMedia', shared);
    // فقط ادمین: منتشرکننده (کاربر نمایشی) — در ویرایش، مقدار اولیه برای تشخیص تغییر
    const isStaff = useIsStaff();
    const [publishAsUserId, setPublishAsUserId] = useTemplateField('publishAsUserId', shared);
    const [initialPublisher, setInitialPublisher] = useState('');
    // فقط ادمین: وضعیت انتشار بعد از ثبت (در ویرایش از وضعیت فعلی قالب)
    const [publishStatus, setPublishStatus] = useTemplateField('publishStatus', shared);
    const [pendingUploads, setPendingUploads] = useState<Array<{ id: string; name: string; localUrl: string; progress: number }>>([]);
    const [removingKey, setRemovingKey] = useState<string | null>(null);
    const [templateStatus, setTemplateStatus] = useState<MediaWorkflowTemplate['status'] | null>(null);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [addMenuStyle, setAddMenuStyle] = useState<CSSProperties | null>(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [categoryRes, tagRes, providerRes, modelRes, template, projectRes] = await Promise.all([
                    marketplaceApi.listCategories().catch(() => ({ categories: [] })),
                    marketplaceApi.listTemplateTags().catch(() => ({ tags: [] as TemplateTagCategoryItem[] })),
                    providersApi.listProviders().catch(() => ({ providers: [] })),
                    providersApi.listModels().catch(() => ({ models: [] })),
                    mode === 'edit' && templateId ? mediaApi.getTemplate(templateId) : Promise.resolve(null),
                    mode === 'create' ? mediaApi.listProjects().catch(() => ({ projects: [] as MediaProject[] })) : Promise.resolve({ projects: [] as MediaProject[] }),
                ]);

                if (cancelled) return;

                const providerMap = new Map(
                    (providerRes.providers || []).map((item) => [item._id, item.displayName || item.name]),
                );
                const models = (modelRes.models || []).map((item) => ({
                    ...item,
                    providerName: item.providerId ? providerMap.get(item.providerId) : undefined,
                }));

                setCategories(categoryRes.categories || []);
                setTagCatalog(tagRes.tags || []);
                setProviderModels(models);
                setProjects(projectRes.projects || []);

                if (mode === 'edit') {
                    if (!template) {
                        setLoadError(t('not_yours'));
                        return;
                    }
                    if (template.status === 'pending') {
                        setLoadError(t('pending_locked'));
                        return;
                    }
                    setTemplateStatus(template.status);
                    // authorUserId فقط وقتی هست که قالب به نام کاربر نمایشی منتشر شده
                    const publisher = template.authorUserId ? String(template.ownerUserId) : '';
                    setPublishAsUserId(publisher);
                    setInitialPublisher(publisher);
                    setPublishStatus(template.status === 'approved' ? 'approved' : 'draft');
                    applyTemplateToForm(template, models, {
                        setTitle,
                        setDescription,
                        setKind,
                        setPromptText,
                        setSelectedModelIds,
                        setSelectedTagKeys,
                        setCategoryId,
                        setPrice,
                        setPreviewMedia,
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    const status = isAxiosError(error) ? error.response?.status : 0;
                    setLoadError(status === 403 || status === 404 ? t('not_yours') : getApiErrorMessage(error, t('load_error')));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
        // setterها پایدارند (useTemplateField)؛ فقط برای قانون lint
    }, [mode, templateId, t, setTitle, setDescription, setKind, setPromptText, setSelectedModelIds, setSelectedTagKeys, setCategoryId, setPrice, setPreviewMedia, setPublishAsUserId, setPublishStatus]);

    useEffect(() => {
        if (mode !== 'create') return;
        if (searchParams.get('kind') === 'workflow') setKind('workflow');
        const source = searchParams.get('sourceProjectId')?.trim();
        if (source) setSourceProjectId(source);
    }, [mode, searchParams, setKind, setSourceProjectId]);

    // ساخت قالب: پیش‌نویس مشترک (localStorage) بعد از mount خوانده و به کاربر فعلی نسبت داده می‌شود
    useEffect(() => {
        if (shared) rehydrateTemplateCreateStore();
    }, [shared]);
    useEffect(() => {
        if (shared && storeHydrated) claimDraftOwner(userId);
    }, [shared, storeHydrated, userId, claimDraftOwner]);

    useLayoutEffect(() => {
        if (!addMenuOpen || !addBtnRef.current) return;
        const rect = addBtnRef.current.getBoundingClientRect();
        setAddMenuStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            left: Math.min(rect.left, window.innerWidth - 220),
            zIndex: 10040,
        });
    }, [addMenuOpen]);

    useEffect(() => {
        if (!addMenuOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (addBtnRef.current?.contains(target) || addMenuRef.current?.contains(target)) return;
            setAddMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [addMenuOpen]);

    const selectedModels = useMemo(
        () => providerModels.filter((model) => selectedModelIds.includes(model._id)),
        [providerModels, selectedModelIds],
    );

    const groupedModels = useMemo(() => {
        const groups = new Map<string, ProviderModelOption[]>();
        for (const model of providerModels) {
            const group = model.providerName || model.class || t('models_group_other');
            const list = groups.get(group) || [];
            list.push(model);
            groups.set(group, list);
        }
        return Array.from(groups.entries());
    }, [providerModels, t]);

    const addModel = (modelId: string) => {
        if (!modelId || selectedModelIds.includes(modelId)) return;
        setSelectedModelIds((prev) => [...prev, modelId]);
    };

    const removeModel = (modelId: string) => {
        setSelectedModelIds((prev) => prev.filter((id) => id !== modelId));
    };

    const tagLabel = (key: string) => tTag(key, { defaultValue: key });

    const availableTags = useMemo(() => {
        const selected = new Set(selectedTagKeys);
        const query = tagQuery.trim().toLowerCase();
        return tagCatalog.filter((item) => {
            if (selected.has(item.key)) return false;
            if (!query) return true;
            return item.key.includes(query) || tagLabel(item.key).toLowerCase().includes(query);
        });
    }, [tagCatalog, selectedTagKeys, tagQuery, tTag, i18n.language]);

    useEffect(() => {
        if (!tagCatalog.length) return;
        const allowed = new Set(tagCatalog.map((item) => item.key));
        setSelectedTagKeys((prev) => {
            const next = prev.filter((key) => allowed.has(key));
            return next.length === prev.length ? prev : next;
        });
    }, [tagCatalog, setSelectedTagKeys]);

    useEffect(() => {
        if (!tagMenuOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!tagFieldRef.current?.contains(event.target as Node)) setTagMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [tagMenuOpen]);

    const addTag = (key?: string) => {
        const match = key || availableTags[0]?.key;
        if (!match || selectedTagKeys.includes(match)) return;
        setSelectedTagKeys((prev) => [...prev, match]);
        setTagQuery('');
        setTagMenuOpen(true);
    };

    const removeTag = (key: string) => {
        setSelectedTagKeys((prev) => prev.filter((item) => item !== key));
    };

    const handleFilesSelected = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (!files.length || !token) return;

        const remaining = 8 - previewMedia.length - pendingUploads.length;
        if (remaining <= 0) {
            notifyError({ message: t('max_media') });
            return;
        }

        const selected = files.slice(0, remaining);
        if (files.length > remaining) {
            notifyError({ message: t('max_media_remaining', { count: remaining }) });
        }

        const batch = selected.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            localUrl: URL.createObjectURL(file),
        }));

        setPendingUploads((prev) => [
            ...prev,
            ...batch.map((item) => ({ id: item.id, name: item.file.name, localUrl: item.localUrl, progress: 0 })),
        ]);

        await Promise.all(batch.map(async (item) => {
            try {
                const result = await uploadFileInChunks({
                    file: item.file,
                    token,
                    onProgress: (value) => {
                        setPendingUploads((prev) => prev.map((pending) => (
                            pending.id === item.id ? { ...pending, progress: value } : pending
                        )));
                    },
                    metadata: {
                        mimetype: item.file.type || 'image/jpeg',
                        size: item.file.size,
                    },
                });

                const media = normalizeUploadPair(result);
                if (!media) {
                    notifyError({ message: t('upload_named_error', { name: item.file.name }) });
                    return;
                }
                const dimensions = await readMediaDimensions(item.file);
                if (media.type === 'image' && !media.thumbnailUrl) {
                    notifyError({ message: t('thumb_missing', { name: item.file.name }) });
                }
                setPreviewMedia((prev) => {
                    if (prev.length >= 8) return prev;
                    return [...prev, { ...media, ...dimensions, isCover: prev.length === 0 }];
                });
            } catch (error) {
                notifyError(error);
            } finally {
                URL.revokeObjectURL(item.localUrl);
                setPendingUploads((prev) => prev.filter((pending) => pending.id !== item.id));
            }
        }));
    };

    const previewMediaKey = (media: TemplatePreviewMedia) => media.fileId || media.fileKey || media.url;

    const handleRemoveMedia = (media: TemplatePreviewMedia) => {
        const key = previewMediaKey(media);
        if (!key || removingKey) return;
        setRemovingKey(key);
        setPreviewMedia((prev) => removePreviewMedia(prev, media));
        setRemovingKey(null);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            notifyError({ message: t('title_required') });
            return;
        }
        try {
            setIsSubmitting(true);
            const priceNumber = Number(price) || 0;
            const payload = {
                title: title.trim(),
                description: description.trim() || undefined,
                kind,
                promptText: promptText.trim() || undefined,
                aiModels: selectedModels.map(modelLabel).filter(Boolean),
                tags: selectedTagKeys,
                categoryIds: categoryId ? [categoryId] : [],
                previewMedia,
                isForSale: priceNumber > 0,
                price: priceNumber > 0 ? priceNumber : 0,
                ...(mode === 'create' && kind === 'workflow' && sourceProjectId
                    ? { sourceProjectId }
                    : {}),
            };
            const publisherChanged = isStaff && publishAsUserId !== initialPublisher;
            if (mode === 'edit' && templateId) {
                let savedId = templateId;
                if (templateStatus === 'approved' && kind === 'prompt') {
                    savedId = (await mediaApi.forkPromptTemplateRevision(templateId, payload))._id || templateId;
                } else {
                    await mediaApi.updateTemplate(templateId, payload);
                }
                if (publisherChanged) await mediaApi.setTemplatePublisher(savedId, publishAsUserId);
                if (isStaff) {
                    // ذخیره/نسخهٔ جدید ممکن است قالب را از انتشار درآورده باشد → دوباره منتشر؛ «پیش‌نویس» = قالب قبلی هم خصوصی شود
                    if (publishStatus === 'approved') await mediaApi.setTemplateStatus(savedId, 'approved');
                    else if (templateStatus === 'approved') await mediaApi.setTemplateStatus(templateId, 'draft');
                }
                SuccessToaster({ message: t('update_success') });
            } else {
                const created = await mediaApi.createStandaloneTemplate({
                    ...payload,
                    ...(isStaff && publishAsUserId ? { publishAsUserId } : {}),
                });
                if (isStaff && publishStatus === 'approved' && created?._id) {
                    await mediaApi.setTemplateStatus(created._id, 'approved');
                }
                SuccessToaster({ message: t('create_success') });
            }
            if (shared) resetDraft();
            router.push('/templates');
        } catch (error) {
            notifyError(error, { fallback: mode === 'edit' ? t('save_version_error') : t('create_error') });
            setIsSubmitting(false);
        }
    };

    if (loading || (shared && !storeHydrated)) {
        return <p className={pageStyles.emptyState}>{tc('loading')}</p>;
    }
    const draftHasContent = shared && templateDraftHasContent({
        title, description, kind, sourceProjectId, promptText, selectedModelIds, selectedTagKeys, categoryId, price, previewMedia, publishAsUserId, publishStatus,
    });

    if (loadError) {
        return (
            <div className={`${pageStyles.container} ${pageStyles.rtl}`} dir={rtl ? 'rtl' : 'ltr'}>
                <p className={pageStyles.emptyState}>{loadError}</p>
                <Link href="/templates" className={hubStyles.secondaryBtn}>{tc('back')}</Link>
            </div>
        );
    }

    return (
        <div className={`${pageStyles.container} ${pageStyles.rtl}`} dir={rtl ? 'rtl' : 'ltr'}>
            <header className={`${pageStyles.header} ${pageStyles.headerRow}`}>
                <div>
                    <h1 className={pageStyles.mainTitle}>{mode === 'edit' ? t('edit') : t('create_title')}</h1>
                    <p className={pageStyles.subtitle}>
                        {mode === 'edit' ? t('form_note_edit') : t('create_lead')}
                    </p>
                </div>
                <div className={hubStyles.inlineActions}>
                    {draftHasContent ? (
                        // پیش‌نویس مشترک با پنل «قالب» چت — شروع از نو هر دو را خالی می‌کند
                        <button type="button" className={hubStyles.secondaryBtn} onClick={resetDraft}>
                            {t('draft_reset', { defaultValue: 'شروع از نو' })}
                        </button>
                    ) : null}
                    <Link href="/templates" className={hubStyles.secondaryBtn}>
                        {tc('back')}
                    </Link>
                </div>
            </header>

            {mode === 'create' ? <TemplateFormGuide /> : null}

            <div className={hubStyles.formCard}>
                <h3 className={hubStyles.formSectionTitle}>{t('section_identity')}</h3>
                <div className={hubStyles.row2}>
                    <div className={hubStyles.field}>
                        <label>{t('form_title_label')}</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('title_ph')}
                        />
                        <p className={hubStyles.fieldHint}>{t('title_hint')}</p>
                    </div>
                    <div className={hubStyles.field}>
                        <label>{t('kind_label')}</label>
                        <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value === 'workflow' ? 'workflow' : 'prompt')}
                        >
                            <option value="prompt">{t('kind_prompt_option')}</option>
                            <option value="workflow">{t('kind_workflow_option')}</option>
                        </select>
                        <p className={hubStyles.fieldHint}>{t('kind_hint')}</p>
                    </div>
                </div>
                {mode === 'create' && kind === 'workflow' ? (
                    <div className={hubStyles.field} style={{ marginTop: '1rem' }}>
                        <label>{t('source_project')}</label>
                        <select
                            value={sourceProjectId}
                            onChange={(e) => setSourceProjectId(e.target.value)}
                        >
                            <option value="">{t('category_none')}</option>
                            {sourceProjectId && !projects.some((project) => project._id === sourceProjectId) ? (
                                <option value={sourceProjectId}>{sourceProjectId}</option>
                            ) : null}
                            {projects.map((project) => (
                                <option key={project._id} value={project._id}>{project.title}</option>
                            ))}
                        </select>
                        <p className={hubStyles.fieldHint}>{t('source_hint')}</p>
                    </div>
                ) : null}
                <h3 className={hubStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    {t('section_explore')}
                </h3>
                <div className={hubStyles.row2}>
                    <div className={hubStyles.field}>
                        <label>{t('category_label')}</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">
                                {categories.length === 0 ? t('category_empty') : t('category_none')}
                            </option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <p className={hubStyles.fieldHint}>{t('category_hint')}</p>
                    </div>
                    <div className={hubStyles.field}>
                        <label>{t('tags')}</label>
                        <div className={localStyles.tagField} ref={tagFieldRef}>
                            <input
                                className={localStyles.tagInput}
                                value={tagQuery}
                                onChange={(e) => {
                                    setTagQuery(e.target.value);
                                    setTagMenuOpen(true);
                                }}
                                onFocus={() => setTagMenuOpen(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                placeholder={t('tags_search_ph')}
                            />
                            <button
                                type="button"
                                className={localStyles.tagAddBtn}
                                aria-label={t('tags_add')}
                                onClick={() => addTag()}
                            >
                                +
                            </button>
                            {tagMenuOpen ? (
                                <div className={localStyles.tagMenu} role="listbox">
                                    {availableTags.length === 0 ? (
                                        <div className={localStyles.tagMenuEmpty}>{t('tags_no_match')}</div>
                                    ) : (
                                        availableTags.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                role="option"
                                                className={localStyles.tagOption}
                                                onClick={() => addTag(item.key)}
                                            >
                                                {tagLabel(item.key)}
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>
                        {selectedTagKeys.length > 0 ? (
                            <div className={localStyles.tagChipRow}>
                                {selectedTagKeys.map((key) => (
                                    <span key={key} className={localStyles.chip}>
                                        {tagLabel(key)}
                                        <button type="button" onClick={() => removeTag(key)} aria-label={tc('delete')}>×</button>
                                    </span>
                                ))}
                            </div>
                        ) : null}
                        <p className={hubStyles.fieldHint}>{t('tags_hint')} {t('tags_first_is_url')}</p>
                    </div>
                </div>
                {isStaff ? (
                    // فقط ادمین (مثل حالت توسعه‌دهنده) — بعد از تگ‌ها چون فهرست با حوزهٔ همین تگ‌ها فیلتر می‌شود
                    <div className={`${hubStyles.field} ${localStyles.staffField}`} style={{ marginTop: '1rem' }}>
                        <label>
                            {t('publisher_label', { defaultValue: 'منتشرکننده' })}
                            <small className={localStyles.staffBadge}>{t('publisher_staff_only', { defaultValue: 'فقط ادمین' })}</small>
                        </label>
                        <PublisherSelect
                            value={publishAsUserId}
                            onChange={setPublishAsUserId}
                            tagKeys={selectedTagKeys}
                            hintClassName={`${hubStyles.fieldHint} ${localStyles.domainHint}`}
                        />
                        <p className={hubStyles.fieldHint}>
                            {t('publisher_hint', { defaultValue: 'قالب به نام این کاربر نمایشی در اکسپلور و پروفایلش دیده می‌شود و پیام‌های خریداران در صندوق ادمین‌ها می‌آید. خودتان همچنان آن را در «قالب‌های من» دارید.' })}
                        </p>
                    </div>
                ) : null}
                {isStaff ? (
                    <div className={`${hubStyles.field} ${localStyles.staffField}`} style={{ marginTop: '1rem' }}>
                        <label>
                            {t('publish_status_label', { defaultValue: 'وضعیت انتشار' })}
                            <small className={localStyles.staffBadge}>{t('publisher_staff_only', { defaultValue: 'فقط ادمین' })}</small>
                        </label>
                        <PublishStatusSelect value={publishStatus} onChange={setPublishStatus} />
                        <p className={hubStyles.fieldHint}>
                            {t('publish_status_hint', { defaultValue: '«منتشرشده» بعد از ثبت بدون صف بررسی در اکسپلور دیده می‌شود؛ «پیش‌نویس» خصوصی می‌ماند.' })}
                        </p>
                    </div>
                ) : null}

                <h3 className={hubStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    {t('section_content')}
                </h3>
                <div className={hubStyles.field}>
                    <label>{tc('description')}</label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('desc_ph')}
                    />
                    <p className={hubStyles.fieldHint}>{t('desc_hint')}</p>
                </div>
                <div className={hubStyles.field}>
                    <label>{t('prompt_text')}</label>
                    <textarea
                        className={localStyles.promptArea}
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder={t('prompt_ph')}
                    />
                    <p className={hubStyles.fieldHint}>{t('prompt_hint')}</p>
                </div>

                <h3 className={hubStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    {t('section_models')}
                </h3>
                <p className={hubStyles.fieldHintBlock}>{t('models_hint')}</p>
                <div className={hubStyles.field}>
                    <label>{t('models_add')}</label>
                    <select
                        value=""
                        onChange={(e) => {
                            addModel(e.target.value);
                            e.target.value = '';
                        }}
                        disabled={providerModels.length === 0}
                    >
                        <option value="">
                            {providerModels.length === 0 ? t('no_model') : t('models_select')}
                        </option>
                        {groupedModels.map(([group, models]) => (
                            <optgroup key={group} label={group}>
                                {models.map((model) => (
                                    <option
                                        key={model._id}
                                        value={model._id}
                                        disabled={selectedModelIds.includes(model._id)}
                                    >
                                        {modelLabel(model)}
                                        {model.class ? ` — ${model.class}` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                {selectedModels.length > 0 ? (
                    <div className={localStyles.chipRow}>
                        {selectedModels.map((model) => (
                            <span key={model._id} className={localStyles.chip}>
                                {modelLabel(model)}
                                <button
                                    type="button"
                                    onClick={() => removeModel(model._id)}
                                    aria-label={`${tc('delete')} ${modelLabel(model)}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className={hubStyles.fieldHint} style={{ marginTop: '-0.4rem' }}>
                        {t('models_empty')}
                    </p>
                )}

                <h3 className={hubStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    {t('section_pricing')}
                </h3>
                <div className={hubStyles.field}>
                    <label>{t('price_toman')}</label>
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        dir="ltr"
                    />
                    <p className={hubStyles.fieldHint}>{t('price_hint')}</p>
                </div>

                <h3 className={hubStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    {t('section_preview')}
                </h3>
                <p className={hubStyles.fieldHintBlock}>{t('preview_hint')}</p>
                <div className={localStyles.mediaStrip}>
                    {previewMedia.map((media, index) => (
                        <TemplatePreviewThumb
                            key={`${media.fileId || media.fileKey || media.url}-${index}`}
                            media={media}
                            isCover={!!media.isCover}
                            onSetCover={() => setPreviewMedia((prev) => setCoverMedia(prev, media))}
                            removing={removingKey === previewMediaKey(media)}
                            onRemove={() => handleRemoveMedia(media)}
                        />
                    ))}
                    {pendingUploads.map((pending) => (
                        <div key={pending.id} className={`${localStyles.thumb} ${localStyles.thumbPending}`}>
                            <img src={pending.localUrl} alt={pending.name} />
                            <span className={localStyles.thumbProgress}>{pending.progress}%</span>
                        </div>
                    ))}
                    {previewMedia.length + pendingUploads.length < 8 && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                hidden
                                onChange={(e) => {
                                    void handleFilesSelected(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                ref={addBtnRef}
                                type="button"
                                className={localStyles.thumbAdd}
                                onClick={() => setAddMenuOpen((open) => !open)}
                                aria-expanded={addMenuOpen}
                            >
                                <span>+</span>
                            </button>
                        </>
                    )}
                </div>

                {addMenuOpen && addMenuStyle && typeof document !== 'undefined' && createPortal(
                    <div ref={addMenuRef} className={localStyles.addMenu} style={addMenuStyle}>
                        <button
                            type="button"
                            className={localStyles.addMenuItem}
                            onClick={() => {
                                setAddMenuOpen(false);
                                fileInputRef.current?.click();
                            }}
                        >
                            <LuUpload /> {t('add_from_device', { defaultValue: 'از دستگاه' })}
                        </button>
                        <button
                            type="button"
                            className={localStyles.addMenuItem}
                            onClick={() => {
                                setAddMenuOpen(false);
                                setGalleryOpen(true);
                            }}
                        >
                            <LuImages /> {t('add_from_gallery', { defaultValue: 'از گالری' })}
                        </button>
                    </div>,
                    document.body,
                )}

                <GalleryModal
                    open={galleryOpen}
                    onClose={() => setGalleryOpen(false)}
                    scope="all"
                    mode="multi-select"
                    initialTab="image"
                    selectedIds={previewMedia.flatMap((item) => (
                        [item.id, item.fileId, item.fileKey, item.url].filter(Boolean) as string[]
                    ))}
                    onSelectMany={(items) => {
                        setPreviewMedia((prev) => {
                            const next = [...prev];
                            for (const item of items.map(galleryItemToPreviewMedia)) {
                                if (next.length >= 8) break;
                                if (next.some((existing) => (
                                    (existing.fileId && existing.fileId === item.fileId)
                                    || (existing.url && existing.url === item.url)
                                ))) continue;
                                next.push({ ...item, isCover: next.length === 0 });
                            }
                            return next;
                        });
                    }}
                />

                <div className={hubStyles.formNoteBox}>
                    {mode === 'edit' ? t('form_note_edit') : t('form_note_create')}
                </div>

                <div className={hubStyles.inlineActions}>
                    <button
                        type="button"
                        className={hubStyles.primaryBtn}
                        disabled={isSubmitting || !title.trim()}
                        onClick={() => void handleSubmit()}
                    >
                        {isSubmitting
                            ? t('submit_saving')
                            : mode === 'edit'
                                ? t('submit_update')
                                : t('submit_create')}
                    </button>
                    <Link href="/templates" className={hubStyles.secondaryBtn}>
                        {tc('cancel')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
