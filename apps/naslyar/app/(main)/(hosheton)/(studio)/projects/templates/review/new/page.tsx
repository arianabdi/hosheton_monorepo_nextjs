'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { uploadFileInChunks } from '@/app/utils/chunkUploader/chunkUploader';
import { templateReviewApi, type TemplatePreviewMedia } from '../../../../lib/template-review-api';
import { getHoshetonStudioApiBase } from '../../../../lib/studio-api-base';
import { normalizeUploadPair, readMediaDimensions, setCoverMedia, dropPreviewMedia } from '../../../../lib/template-media';
import TemplatePreviewThumb from '../../../../components/TemplatePreviewThumb';
import TagKeyPicker from '../TagKeyPicker';
import PublisherPicker from '../PublisherPicker';
import styles from '../../../../projects/nodes/Providers.module.scss';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import localStyles from '../TemplateForm.module.scss';

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

export default function NewTemplatePage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const studioApiBase = getHoshetonStudioApiBase();
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
    const [publishAsUserId, setPublishAsUserId] = useState('');
    const [previewMedia, setPreviewMedia] = useState<TemplatePreviewMedia[]>([]);
    const [pendingUploads, setPendingUploads] = useState<Array<{ id: string; name: string; localUrl: string; progress: number }>>([]);
    const [removingKey, setRemovingKey] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        axios
            .get(`${baseUrl}/api/categories/panel?section=marketplace&limit=100&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    setCategories(res.data.data.categories || []);
                }
            })
            .catch(() => setCategories([]));

        axios
            .get(`${baseUrl}/api/provider-models?limit=200&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const models = (res.data.data.models || []) as ProviderModelOption[];
                    setProviderModels(models.filter((item) => item.isActive !== false));
                }
            })
            .catch(() => setProviderModels([]));
    }, [token, baseUrl]);

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
        if (files.length > remaining) {
            ErrorToaster({ message: `فقط ${remaining} فایل دیگر می‌توان اضافه کرد.` });
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

    const handleRemoveMedia = async (media: TemplatePreviewMedia) => {
        const key = media.fileId || media.fileKey || media.url;
        if (!key || removingKey) return;
        try {
            setRemovingKey(key);
            await templateReviewApi.purgePreviewMedia(media);
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
            await templateReviewApi.adminCreate({
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
                ...(publishAsUserId ? { publishAsUserId } : {}),
            });
            SuccessToaster({ message: 'قالب ساخته و منتشر شد.' });
            router.push('/projects/templates/review');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>افزودن قالب</h1>
                    <p className={styles.subtitle}>
                        ثبت قالب از پنل ادمین؛ پس از انتشار بلافاصله در صفحه ایده‌ها دیده می‌شود
                    </p>
                </div>
                <Link href="/projects/templates/review" className={styles.secondaryBtn}>
                    بازگشت به فهرست
                </Link>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>قبل از انتشار</h2>
                <p>
                    اگر دسته مورد نظر در فهرست نیست، ابتدا در
                    {' '}<Link href="/projects/marketplace/categories">دسته‌بندی موضوعی</Link>
                    {' '}آن را بسازید. مدل‌ها از
                    {' '}<Link href="/models">مدیریت مدل‌های هوش مصنوعی</Link>
                    {' '}لود می‌شوند؛ اگر مدل فعالی ندارید، اول آن را تعریف کنید.
                    حداقل یک تصویر پیش‌نمایش کمک می‌کند قالب در صفحه ایده‌ها بهتر دیده شود.
                </p>
            </section>

            <div className={parentStyles.formCard}>
                <h3 className={parentStyles.formSectionTitle}>هویت قالب</h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>عنوان *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثلاً افزایش کیفیت عکس پرتره"
                        />
                        <p className={hrStyles.fieldHint}>
                            نام رسمی که روی کارت و صفحه جزئیات قالب نمایش داده می‌شود.
                            کوتاه، مشخص و بدون پیشوندهای فنی باشد.
                        </p>
                    </div>
                    <div className={parentStyles.field}>
                        <label>نوع قالب</label>
                        <select value={kind} onChange={(e) => setKind(e.target.value === 'workflow' ? 'workflow' : 'prompt')}>
                            <option value="prompt">Prompt — فقط متن پرامپت</option>
                            <option value="workflow">Workflow — گره و اتصال</option>
                        </select>
                        <p className={hrStyles.fieldHint}>
                            Prompt برای قالب متنی است که کاربر کپی یا استفاده می‌کند.
                            Workflow وقتی معنا دارد که قالب از پروژه استودیو با گره ساخته شده باشد.
                            از پنل ادمین معمولاً Prompt انتخاب می‌شود.
                        </p>
                    </div>
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    نمایش در صفحه ایده‌ها
                </h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>دسته‌بندی</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">
                                {categories.length === 0 ? '— دسته‌ای ثبت نشده است —' : '— انتخاب نشده —'}
                            </option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <p className={hrStyles.fieldHint}>
                            دسته، فیلتر کارت‌های افقی بالای صفحه ایده‌ها را می‌سازد.
                            اگر خالی بماند، قالب فقط در «همه» دیده می‌شود. دسته‌ها را از
                            {' '}<Link href="/projects/marketplace/categories">دسته‌بندی موضوعی</Link> مدیریت کنید.
                        </p>
                    </div>
                    <div className={parentStyles.field}>
                        <label>برچسب‌ها</label>
                        <TagKeyPicker value={selectedTagKeys} onChange={setSelectedTagKeys} />
                        <p className={hrStyles.fieldHint}>
                            از فهرست موضوع‌ها جستجو کنید و با دکمه + یا Enter تگ را اضافه کنید. اولین تگ، دستهٔ اصلی
                            قالب است و آدرس صفحه زیر آن ساخته می‌شود (/explore/تگ/slug).
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
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="خلاصه کوتاه از کاربرد قالب برای کاربر"
                    />
                    <p className={hrStyles.fieldHint}>
                        یک یا دو جمله درباره نتیجه قالب. اگر پرامپت خالی باشد، همین متن به‌عنوان جایگزین نمایش داده می‌شود.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>متن پرامپت</label>
                    <textarea
                        className={localStyles.promptArea}
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="متنی که کاربر کپی می‌کند یا با آن پروژه می‌سازد"
                    />
                    <p className={hrStyles.fieldHint}>
                        متن اصلی قالب. برای قالب پولی تا قبل از خرید مخفی می‌ماند.
                        واضح بنویسید تا کاربر بداند دقیقاً چه چیزی را استفاده می‌کند.
                    </p>
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    مدل‌های هوش مصنوعی
                </h3>
                <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.75rem' }}>
                    مدل‌ها از فهرست فعال
                    {' '}<Link href="/models">Provider Model</Link>
                    {' '}لود می‌شوند. می‌توانید چند مدل اضافه کنید؛ نام نمایشی آن‌ها روی کارت قالب دیده می‌شود.
                </p>
                <div className={parentStyles.field}>
                    <label>افزودن مدل</label>
                    <select
                        value=""
                        onChange={(e) => {
                            addModel(e.target.value);
                            e.target.value = '';
                        }}
                        disabled={providerModels.length === 0}
                    >
                        <option value="">
                            {providerModels.length === 0
                                ? '— مدل فعالی ثبت نشده است —'
                                : '— انتخاب مدل —'}
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
                    <p className={hrStyles.fieldHint}>
                        پس از انتخاب، مدل به فهرست زیر اضافه می‌شود. مدل‌های انتخاب‌شده از فهرست حذف نمی‌شوند مگر با دکمه حذف روی هر مورد.
                        اگر مدل مورد نظر نیست، آن را در
                        {' '}<Link href="/models">مدیریت مدل‌ها</Link> بسازید و فعال کنید.
                    </p>
                </div>
                {selectedModels.length > 0 ? (
                    <div className={localStyles.chipRow}>
                        {selectedModels.map((model) => (
                            <span key={model._id} className={localStyles.chip}>
                                {modelLabel(model)}
                                <button type="button" onClick={() => removeModel(model._id)} aria-label={`حذف ${modelLabel(model)}`}>
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className={hrStyles.fieldHint} style={{ marginTop: '-0.4rem' }}>
                        هنوز مدلی انتخاب نشده است. انتخاب مدل اختیاری است اما به کاربر کمک می‌کند بداند قالب با چه مدلی ساخته شده.
                    </p>
                )}

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    قیمت‌گذاری
                </h3>
                <div className={parentStyles.field}>
                    <label>قیمت (تومان)</label>
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="۰"
                        dir="ltr"
                    />
                    <p className={hrStyles.fieldHint}>
                        مقدار ۰ یعنی قالب رایگان است و کاربر می‌تواند بلافاصله استفاده کند.
                        عدد بزرگ‌تر از صفر قالب را پولی می‌کند و پرامپت تا قبل از خرید مخفی می‌ماند.
                    </p>
                </div>

                <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                    مدیاهای پیش‌نمایش
                </h3>
                <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.85rem' }}>
                    چند فایل را همزمان انتخاب کنید. هر مورد به‌صورت thumbnail مربعی کنار بقیه دیده می‌شود.
                    ستاره را بزنید تا پوشش اصلی کارت صفحه ایده‌ها مشخص شود. حداکثر ۸ مورد.
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

                <div className={hrStyles.formNoteBox}>
                    <strong>وضعیت پس از ثبت:</strong> قالب با وضعیت «تایید شده» ساخته و منتشر می‌شود
                    و بدون صف بررسی در صفحه ایده‌ها دیده می‌شود. بعداً می‌توانید از فهرست قالب‌ها جزئیات را ببینید.
                </div>

                <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                    <button
                        type="button"
                        className={parentStyles.primaryBtn}
                        disabled={isSubmitting || !title.trim()}
                        onClick={() => void handleSubmit()}
                    >
                        {isSubmitting ? 'در حال انتشار...' : 'انتشار'}
                    </button>
                    <Link href="/projects/templates/review" className={tabStyles.smallBtn}>
                        انصراف
                    </Link>
                </div>
            </div>
        </div>
    );
}
