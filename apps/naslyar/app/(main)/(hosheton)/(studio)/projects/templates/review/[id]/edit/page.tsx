'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { uploadFileInChunks } from '@/app/utils/chunkUploader/chunkUploader';
import { templateReviewApi, normalizeTemplateSlugInput, type MediaWorkflowTemplate, type TemplatePreviewMedia } from '../../../../../lib/template-review-api';
import { getHoshetonStudioApiBase } from '../../../../../lib/studio-api-base';
import { getHoshetonStudioPublicUrl } from '../../../../../lib/studio-template-url';
import { fixHoshetonMediaUrl, normalizeUploadPair, readMediaDimensions, setCoverMedia, dropPreviewMedia } from '../../../../../lib/template-media';
import TemplatePreviewThumb from '../../../../../components/TemplatePreviewThumb';
import TagKeyPicker from '../../TagKeyPicker';
import PublisherPicker from '../../PublisherPicker';
import styles from '../../../../../projects/nodes/Providers.module.scss';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import localStyles from '../../TemplateForm.module.scss';

interface CategoryOption {
    _id: string;
    name: string;
}

interface ProviderModelOption {
    _id: string;
    name: string;
    displayName?: string;
    providerName?: string;
    class?: string;
    isActive?: boolean;
}

function modelLabel(model: ProviderModelOption) {
    return (model.displayName || model.name || '').trim();
}

function normalizeLoadedMedia(items?: TemplatePreviewMedia[]) {
    const next = (items || []).map((item) => ({
        ...item,
        url: fixHoshetonMediaUrl(item.url),
        thumbnailUrl: item.thumbnailUrl ? fixHoshetonMediaUrl(item.thumbnailUrl) : undefined,
        thumbnailUrlLarge: item.thumbnailUrlLarge ? fixHoshetonMediaUrl(item.thumbnailUrlLarge) : undefined,
        isCover: !!item.isCover,
        width: item.width,
        height: item.height,
        aspectRatio: item.aspectRatio,
    }));
    if (next.length && !next.some((item) => item.isCover)) {
        next[0] = { ...next[0], isCover: true };
    }
    return next;
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
        setSlug: (v: string) => void;
        setMetaTitle: (v: string) => void;
        setMetaDescription: (v: string) => void;
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
    setters.setSlug(normalizeTemplateSlugInput(template.slug || ''));
    setters.setMetaTitle(template.metaTitle || '');
    setters.setMetaDescription(template.metaDescription || '');
    setters.setPreviewMedia(normalizeLoadedMedia(template.previewMedia));
}

export default function EditTemplatePage() {
    const params = useParams();
    const router = useRouter();
    const templateId = String(params.id || '');
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const studioApiBase = getHoshetonStudioApiBase();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [providerModels, setProviderModels] = useState<ProviderModelOption[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [kind, setKind] = useState<'prompt' | 'workflow'>('prompt');
    const [promptText, setPromptText] = useState('');
    const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
    const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [price, setPrice] = useState('0');
    // '' = سازندهٔ واقعی؛ authorUserId فقط وقتی هست که قالب به نام کاربر نمایشی منتشر شده
    const [publishAsUserId, setPublishAsUserId] = useState('');
    const [slug, setSlug] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [previewMedia, setPreviewMedia] = useState<TemplatePreviewMedia[]>([]);
    const [pendingUploads, setPendingUploads] = useState<Array<{ id: string; name: string; localUrl: string; progress: number }>>([]);
    const [removingKey, setRemovingKey] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        Promise.all([
            axios.get(`${baseUrl}/api/categories/panel?section=marketplace&limit=100&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            }),
            axios.get(`${baseUrl}/api/provider-models?limit=200&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            }),
            templateReviewApi.getById(templateId),
        ])
            .then(([categoriesRes, modelsRes, template]) => {
                const nextCategories = categoriesRes.data.statusCode === 200
                    ? (categoriesRes.data.data.categories || [])
                    : [];
                const nextModels = modelsRes.data.statusCode === 200
                    ? ((modelsRes.data.data.models || []) as ProviderModelOption[]).filter((item) => item.isActive !== false)
                    : [];

                setCategories(nextCategories);
                setProviderModels(nextModels);
                applyTemplateToForm(template, nextModels, {
                    setTitle,
                    setDescription,
                    setKind,
                    setPromptText,
                    setSelectedModelIds,
                    setSelectedTagKeys,
                    setCategoryId,
                    setPrice,
                    setSlug,
                    setMetaTitle,
                    setMetaDescription,
                    setPreviewMedia,
                });
                setPublishAsUserId(template.authorUserId ? String(template.ownerUserId) : '');
            })
            .catch((error) => ErrorToaster(error))
            .finally(() => setLoading(false));
    }, [token, baseUrl, templateId]);

    const selectedModels = useMemo(
        () => providerModels.filter((model) => selectedModelIds.includes(model._id)),
        [providerModels, selectedModelIds],
    );

    const groupedModels = useMemo(() => {
        const groups = new Map<string, ProviderModelOption[]>();
        for (const model of providerModels) {
            const group = model.providerName || model.class || 'سایر';
            const list = groups.get(group) || [];
            list.push(model);
            groups.set(group, list);
        }
        return Array.from(groups.entries());
    }, [providerModels]);

    const addModel = (modelId: string) => {
        if (!modelId || selectedModelIds.includes(modelId)) return;
        setSelectedModelIds((prev) => [...prev, modelId]);
    };

    const removeModel = (modelId: string) => {
        setSelectedModelIds((prev) => prev.filter((id) => id !== modelId));
    };

    const handleFilesSelected = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (!files.length || !token) return;

        const remaining = 8 - previewMedia.length - pendingUploads.length;
        if (remaining <= 0) {
            ErrorToaster({ message: 'حداکثر ۸ مدیا می‌توانید اضافه کنید.' });
            return;
        }

        const selected = files.slice(0, remaining);
        const batch = selected.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            localUrl: URL.createObjectURL(file),
        }));

        setPendingUploads((prev) => [
            ...prev,
            ...batch.map((item) => ({ id: item.id, name: item.file.name, localUrl: item.localUrl, progress: 0 })),
        ]);

        const isPausedRef = { current: false };

        await Promise.all(batch.map(async (item) => {
            try {
                const result = await uploadFileInChunks({
                    file: item.file,
                    token,
                    baseUrl: studioApiBase,
                    isPausedRef,
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
                    ErrorToaster({ message: `آپلود «${item.file.name}» ناموفق بود.` });
                    return;
                }
                const dimensions = await readMediaDimensions(item.file);
                if (media.type === 'image' && !media.thumbnailUrl) {
                    ErrorToaster({ message: `برای «${item.file.name}» thumbnail ساخته نشد.` });
                }
                setPreviewMedia((prev) => {
                    if (prev.length >= 8) return prev;
                    const next = { ...media, ...dimensions, isCover: prev.length === 0 };
                    return [...prev, next];
                });
            } catch (error) {
                ErrorToaster(error);
            } finally {
                URL.revokeObjectURL(item.localUrl);
                setPendingUploads((prev) => prev.filter((pending) => pending.id !== item.id));
            }
        }));
    };

    const previewMediaKey = (media: TemplatePreviewMedia) => media.fileId || media.fileKey || media.url;

    const handleRemoveMedia = async (media: TemplatePreviewMedia) => {
        const key = previewMediaKey(media);
        if (!key || removingKey) return;
        try {
            setRemovingKey(key);
            await templateReviewApi.adminRemovePreviewMedia(templateId, media);
            setPreviewMedia((prev) => dropPreviewMedia(prev, media));
        } catch {
            ErrorToaster({ message: 'حذف ناموفق' });
        } finally {
            setRemovingKey(null);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            ErrorToaster({ message: 'عنوان قالب الزامی است.' });
            return;
        }
        try {
            setIsSubmitting(true);
            const priceNumber = Number(price) || 0;
            await templateReviewApi.adminUpdate(templateId, {
                title: title.trim(),
                description: description.trim() || undefined,
                kind,
                promptText: promptText.trim() || undefined,
                aiModels: selectedModels.map(modelLabel).filter(Boolean),
                tags: selectedTagKeys,
                categoryIds: categoryId ? [categoryId] : [],
                previewMedia,
                slug: slug.trim() ? normalizeTemplateSlugInput(slug) : undefined,
                metaTitle: metaTitle.trim() || undefined,
                metaDescription: metaDescription.trim() || undefined,
                isForSale: priceNumber > 0,
                price: priceNumber > 0 ? priceNumber : 0,
                publishAsUserId,
            });
            SuccessToaster({ message: 'قالب با موفقیت به‌روزرسانی شد.' });
            router.push('/projects/templates/review');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>ویرایش قالب</h1>
                    <p className={styles.subtitle}>
                        تغییرات بلافاصله روی قالب منتشرشده در صفحه ایده‌ها اعمال می‌شود
                    </p>
                </div>
                <Link href="/projects/templates/review" className={styles.secondaryBtn}>
                    بازگشت به فهرست
                </Link>
            </header>

            <div className={parentStyles.formCard}>
                <h3 className={parentStyles.formSectionTitle}>هویت قالب</h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>عنوان *</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className={parentStyles.field}>
                        <label>نوع قالب</label>
                        <select value={kind} onChange={(e) => setKind(e.target.value === 'workflow' ? 'workflow' : 'prompt')}>
                            <option value="prompt">Prompt</option>
                            <option value="workflow">Workflow</option>
                        </select>
                    </div>
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    نمایش در صفحه ایده‌ها
                </h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>دسته‌بندی</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">— انتخاب نشده —</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className={parentStyles.field}>
                        <label>برچسب‌ها</label>
                        <TagKeyPicker value={selectedTagKeys} onChange={setSelectedTagKeys} />
                        <p className={hrStyles.fieldHint}>
                            اولین تگ، دستهٔ اصلی قالب است: آدرس صفحه زیر آن ساخته می‌شود (/explore/تگ/slug).
                        </p>
                    </div>
                </div>
                {/* بعد از تگ‌ها: فهرست منتشرکننده‌ها با حوزهٔ همین تگ‌ها فیلتر می‌شود */}
                <div className={hrStyles.formRow}>
                    <PublisherPicker value={publishAsUserId} onChange={setPublishAsUserId} tagKeys={selectedTagKeys} />
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    محتوا و پرامپت
                </h3>
                <div className={parentStyles.field}>
                    <label>توضیحات</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className={parentStyles.field}>
                    <label>متن پرامپت</label>
                    <textarea
                        className={localStyles.promptArea}
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                    />
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    مدل‌های هوش مصنوعی
                </h3>
                <div className={parentStyles.field}>
                    <label>افزودن مدل</label>
                    <select
                        value=""
                        onChange={(e) => {
                            addModel(e.target.value);
                            e.target.value = '';
                        }}
                    >
                        <option value="">— انتخاب مدل —</option>
                        {groupedModels.map(([group, models]) => (
                            <optgroup key={group} label={group}>
                                {models.map((model) => (
                                    <option
                                        key={model._id}
                                        value={model._id}
                                        disabled={selectedModelIds.includes(model._id)}
                                    >
                                        {modelLabel(model)}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                {selectedModels.length > 0 && (
                    <div className={localStyles.chipRow}>
                        {selectedModels.map((model) => (
                            <span key={model._id} className={localStyles.chip}>
                                {modelLabel(model)}
                                <button type="button" onClick={() => removeModel(model._id)}>×</button>
                            </span>
                        ))}
                    </div>
                )}

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    قیمت‌گذاری
                </h3>
                <div className={parentStyles.field}>
                    <label>قیمت (تومان)</label>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} dir="ltr" />
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    سئو (نحوه نمایش در گوگل)
                </h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>اسلاگ آدرس (خالی = خودکار از عنوان)</label>
                        <input
                            value={slug}
                            onChange={(e) => setSlug(normalizeTemplateSlugInput(e.target.value))}
                            dir="ltr"
                            placeholder="iranian-art-portrait-a1b2c3"
                        />
                        <p className={hrStyles.fieldHintBlock} style={{ marginTop: '0.4rem' }} dir="ltr">
                            {getHoshetonStudioPublicUrl()}/explore/{slug || '…'}
                        </p>
                    </div>
                    <div className={parentStyles.field}>
                        <label>عنوان سئو ({metaTitle.length}/60)</label>
                        <input
                            value={metaTitle}
                            onChange={(e) => setMetaTitle(e.target.value.slice(0, 200))}
                            placeholder={title || 'عنوان قالب'}
                        />
                    </div>
                </div>
                <div className={parentStyles.field}>
                    <label>توضیحات سئو ({metaDescription.length}/160)</label>
                    <textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value.slice(0, 500))}
                        placeholder={description || 'توضیحات کوتاه قالب برای نتایج جست‌وجو'}
                        rows={3}
                    />
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    مدیاهای پیش‌نمایش
                </h3>
                <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.85rem' }}>
                    ستاره را بزنید تا پوشش اصلی کارت صفحه ایده‌ها مشخص شود. روی هر تصویر می‌توانید thumbnail یا تصویر اصلی را در تب جدید باز کنید.
                </p>
                <div className={localStyles.mediaStrip}>
                    {previewMedia.map((media) => (
                        <TemplatePreviewThumb
                            key={`${media.fileId || media.url}`}
                            media={media}
                            isCover={!!media.isCover}
                            onSetCover={() => setPreviewMedia((prev) => setCoverMedia(prev, media))}
                            removing={removingKey === (media.fileId || media.fileKey || media.url)}
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
                        <label className={localStyles.thumbAdd}>
                            <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={(e) => {
                                    void handleFilesSelected(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            <span>+</span>
                        </label>
                    )}
                </div>

                <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                    <button
                        type="button"
                        className={parentStyles.primaryBtn}
                        disabled={isSubmitting || !title.trim()}
                        onClick={() => void handleSubmit()}
                    >
                        {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                    </button>
                    <Link href="/projects/templates/review" className={tabStyles.smallBtn}>
                        انصراف
                    </Link>
                </div>
            </div>
        </div>
    );
}
