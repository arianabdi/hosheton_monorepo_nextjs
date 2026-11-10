'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { GoogleSearchPreviewSEO } from '@/app/(main)/blog/components/GoogleSearchPreviewSEO/GoogleSearchPreviewSEO';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from './ContentCategories.module.scss';
import {
    buildCategoryTree,
    categoryErrorMessage,
    contentCategoryApi,
    descendantIds,
    normalizeSlug,
    type ContentCategoryInput,
    type ContentCategoryNode,
    type ContentCategorySectionConfig,
} from './content-categories';

const EMPTY: ContentCategoryInput = {
    name: '',
    slug: '',
    description: '',
    parentId: null,
    metaTitle: '',
    metaDescription: '',
    content: '',
    image: '',
    sortOrder: 0,
    noindex: false,
};

/** فرم افزودن/ویرایش دستهٔ سئو — مشترک همهٔ بخش‌ها (بلاگ، مستندات، قالب‌ها) و همهٔ اپ‌ها */
export default function ContentCategoryForm({
    config,
    categoryId,
}: {
    config: ContentCategorySectionConfig;
    /** خالی = افزودن */
    categoryId?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const isEdit = !!categoryId;
    const label = config.hierarchical ? 'دسته' : 'موضوع';

    const [form, setForm] = useState<ContentCategoryInput>(() => ({
        ...EMPTY,
        parentId: searchParams.get('parent') || null,
    }));
    const [slugTouched, setSlugTouched] = useState(isEdit);
    const [tree, setTree] = useState<ContentCategoryNode[]>([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token || !baseUrl) return;
        let active = true;
        (async () => {
            try {
                const [items, current] = await Promise.all([
                    contentCategoryApi.list(baseUrl, token, config.section),
                    categoryId ? contentCategoryApi.get(baseUrl, token, categoryId) : Promise.resolve(null),
                ]);
                if (!active) return;
                setTree(buildCategoryTree(items));
                if (current) {
                    setForm({
                        name: current.name || '',
                        slug: current.slug || '',
                        description: current.description || '',
                        parentId: current.parentId ? String(current.parentId) : null,
                        metaTitle: current.metaTitle || '',
                        metaDescription: current.metaDescription || '',
                        content: current.content || '',
                        image: current.image || '',
                        sortOrder: current.sortOrder ?? 0,
                        noindex: !!current.noindex,
                    });
                }
            } catch (e) {
                ErrorToaster(e);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [token, baseUrl, config.section, categoryId]);

    const blockedParents = useMemo(
        () => (categoryId ? descendantIds(tree, categoryId) : new Set<string>()),
        [tree, categoryId],
    );
    const parent = tree.find((node) => node._id === form.parentId) || null;
    const urlPath = `${config.urlPrefix}/${[...(config.hierarchical && parent ? parent.path : []), form.slug || 'slug'].join('/')}`;

    const set = <K extends keyof ContentCategoryInput>(key: K, value: ContentCategoryInput[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const onNameChange = (value: string) => {
        setForm((prev) => ({ ...prev, name: value, ...(slugTouched ? {} : { slug: normalizeSlug(value) }) }));
    };

    const submit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            ErrorToaster({ message: 'نام و شناسه (slug) الزامی است' });
            return;
        }
        setSaving(true);
        try {
            const body = { ...form, name: form.name.trim(), parentId: config.hierarchical ? form.parentId || null : null };
            if (isEdit && categoryId) await contentCategoryApi.update(baseUrl, token, categoryId, body);
            else await contentCategoryApi.create(baseUrl, token, config.section, body);
            SuccessToaster({ message: isEdit ? `${label} ذخیره شد` : `${label} ساخته شد` });
            router.push(config.basePath);
        } catch (e) {
            const message = categoryErrorMessage(e);
            if (message) ErrorToaster({ message });
            else ErrorToaster(e);
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>{isEdit ? `ویرایش ${label}` : `افزودن ${label}`}</h1>
                            <p className={parentStyles.subtitle}>{config.title} — صفحهٔ فرود عمومی با آدرس و سئوی مستقل.</p>
                        </div>
                        <Link href={config.basePath} className={tabStyles.smallBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <p>
                            نام و slug آدرس صفحه را می‌سازند؛ {config.hierarchical ? 'با انتخاب والد، این دسته زیر مسیر آن قرار می‌گیرد. ' : ''}
                            عنوان و توضیح متا همان چیزی است که در نتیجهٔ گوگل دیده می‌شود. متن معرفی بالای صفحهٔ دسته
                            می‌نشیند و جلوی «صفحهٔ کم‌محتوا» را می‌گیرد.
                        </p>
                    </section>

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <div className={parentStyles.formCard}>
                            <h3 className={parentStyles.formSectionTitle}>هویت و آدرس</h3>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>نام *</label>
                                    <input value={form.name} onChange={(e) => onNameChange(e.target.value)} />
                                    <p className={hrStyles.fieldHint}>عنوان H1 صفحه و متن breadcrumb.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>شناسه (slug) *</label>
                                    <input
                                        dir="ltr"
                                        value={form.slug}
                                        onChange={(e) => {
                                            setSlugTouched(true);
                                            set('slug', normalizeSlug(e.target.value));
                                        }}
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        آدرس: <code dir="ltr">{urlPath}</code>
                                        {isEdit ? ' — تغییرش آدرس همهٔ محتوای زیر این دسته را عوض می‌کند.' : ''}
                                    </p>
                                </div>
                            </div>

                            <div className={hrStyles.formRow}>
                                {config.hierarchical ? (
                                    <div className={parentStyles.field}>
                                        <label>دستهٔ والد</label>
                                        <select value={form.parentId || ''} onChange={(e) => set('parentId', e.target.value || null)}>
                                            <option value="">— دستهٔ اصلی (بدون والد) —</option>
                                            {tree.filter((node) => !blockedParents.has(node._id)).map((node) => (
                                                <option key={node._id} value={node._id}>{`${'— '.repeat(node.depth)}${node.name}`}</option>
                                            ))}
                                        </select>
                                        <p className={hrStyles.fieldHint}>محتوای زیردسته در صفحهٔ دستهٔ والد هم نمایش داده می‌شود.</p>
                                    </div>
                                ) : null}
                                <div className={parentStyles.field}>
                                    <label>ترتیب نمایش</label>
                                    <input
                                        type="number"
                                        value={form.sortOrder ?? 0}
                                        onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
                                    />
                                    <p className={hrStyles.fieldHint}>بین هم‌سطح‌ها، عدد کوچک‌تر اول می‌آید (منو و فهرست‌ها).</p>
                                </div>
                            </div>

                            <div className={parentStyles.field}>
                                <label>توضیح کوتاه</label>
                                <textarea
                                    className={hrStyles.textarea}
                                    rows={2}
                                    value={form.description || ''}
                                    onChange={(e) => set('description', e.target.value)}
                                />
                                <p className={hrStyles.fieldHint}>یکی دو جمله زیر عنوان صفحه؛ اگر توضیح متا خالی باشد همین استفاده می‌شود.</p>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>سئو</h3>
                            <div className={parentStyles.field}>
                                <label>عنوان متا (title)</label>
                                <input value={form.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} />
                                <p className={hrStyles.fieldHint}>
                                    {toFarsiNumber(String((form.metaTitle || '').length))} کاراکتر — پیشنهاد: کمتر از ۶۰. خالی = نام دسته.
                                </p>
                            </div>
                            <div className={parentStyles.field}>
                                <label>توضیح متا (description)</label>
                                <textarea
                                    className={hrStyles.textarea}
                                    rows={3}
                                    value={form.metaDescription || ''}
                                    onChange={(e) => set('metaDescription', e.target.value)}
                                />
                                <p className={hrStyles.fieldHint}>
                                    {toFarsiNumber(String((form.metaDescription || '').length))} کاراکتر — پیشنهاد: ۱۲۰ تا ۱۶۰، یکتا برای هر دسته.
                                </p>
                            </div>
                            <div className={styles.previewBox}>
                                <GoogleSearchPreviewSEO
                                    title={form.metaTitle || form.name || 'عنوان صفحه'}
                                    name={form.name}
                                    url={urlPath}
                                    description={form.metaDescription || form.description || ''}
                                />
                            </div>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>تصویر کاور (آدرس)</label>
                                    <input dir="ltr" value={form.image || ''} onChange={(e) => set('image', e.target.value.trim())} />
                                    <p className={hrStyles.fieldHint}>برای اشتراک‌گذاری (Open Graph)؛ آدرس کامل از بخش فایل‌ها.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label className={styles.checkLabel}>
                                        <input
                                            type="checkbox"
                                            checked={!!form.noindex}
                                            onChange={(e) => set('noindex', e.target.checked)}
                                        />
                                        noindex (ایندکس نشود)
                                    </label>
                                    <p className={hrStyles.fieldHint}>برای دستهٔ خالی یا موقت؛ از سایت‌مپ هم خودکار حذف می‌شود.</p>
                                </div>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>متن معرفی صفحه</h3>
                            <div className={parentStyles.field}>
                                <Field
                                    value={form.content || ''}
                                    type="editor"
                                    onChange={(value: string) => set('content', value)}
                                />
                                <p className={hrStyles.fieldHint}>
                                    ۱۰۰ تا ۳۰۰ کلمه دربارهٔ موضوع دسته و اینکه کاربر اینجا چه پیدا می‌کند. کپی متن مقاله‌ها نباشد.
                                </p>
                            </div>

                            <div className={hrStyles.formNoteBox}>
                                بعد از ذخیره، صفحهٔ دسته حداکثر یک دقیقه بعد روی سایت به‌روز می‌شود و در اجرای بعدی سایت‌مپ
                                {config.sitemapGroup ? <> (گروه <code dir="ltr">{config.sitemapGroup}</code>)</> : null} می‌آید.
                            </div>

                            <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                                <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={submit}>
                                    {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : `ساخت ${label}`}
                                </button>
                                <Link href={config.basePath} className={tabStyles.smallBtn}>انصراف</Link>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
