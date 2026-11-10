'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { GoogleSearchPreviewSEO } from '@/app/(main)/blog/components/GoogleSearchPreviewSEO/GoogleSearchPreviewSEO';
import { descendantIds } from '@/app/(main)/components/content-categories/content-categories';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '@/app/(main)/components/content-categories/ContentCategories.module.scss';
import {
    templateTagCategoryApi,
    templateTagSlug,
    type TemplateTagCategoryInput,
} from '../../../../lib/template-tag-category-api';
import { templateTagLabelFa } from '../../../../lib/template-tag-labels-fa';
import { buildTagTree, TAG_URL_PREFIX, type TagTreeNode } from './tag-tree';

const BASE = '/projects/marketplace/tag-categories';

const EMPTY: TemplateTagCategoryInput = {
    key: '',
    sortOrder: undefined,
    parentKey: null,
    label: '',
    description: '',
    metaTitle: '',
    metaDescription: '',
    content: '',
    image: '',
    noindex: false,
};

const API_ERRORS: Record<string, string> = {
    TEMPLATE_TAG_CATEGORY_DUPLICATE_KEY: 'این کلید قبلاً ثبت شده است.',
    TEMPLATE_TAG_CATEGORY_INVALID_KEY: 'کلید فقط حروف کوچک انگلیسی، عدد و _ و با حرف شروع شود.',
    TEMPLATE_TAG_CATEGORY_INVALID_PARENT: 'تگ والد معتبر نیست (نمی‌تواند خود تگ یا یکی از زیرتگ‌هایش باشد).',
};

function apiErrorMessage(error: unknown): string | null {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === 'string' ? API_ERRORS[message] || null : null;
}

/** فرم افزودن/ویرایش تگ قالب — کلید، درخت و سئو صفحهٔ فرود /explore/<tag> */
export default function TagCategoryForm({ tagId }: { tagId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEdit = !!tagId;
    const [form, setForm] = useState<TemplateTagCategoryInput>(() => ({
        ...EMPTY,
        parentKey: searchParams.get('parent') || null,
    }));
    const [tree, setTree] = useState<TagTreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [list, current] = await Promise.all([
                    templateTagCategoryApi.list({ page: 1, limit: 500 }),
                    tagId ? templateTagCategoryApi.getById(tagId) : Promise.resolve(null),
                ]);
                if (!active) return;
                setTree(buildTagTree(list.items || []));
                if (current) {
                    setForm({
                        key: current.key || '',
                        sortOrder: current.sortOrder,
                        parentKey: current.parentKey || null,
                        label: current.label || '',
                        description: current.description || '',
                        metaTitle: current.metaTitle || '',
                        metaDescription: current.metaDescription || '',
                        content: current.content || '',
                        image: current.image || '',
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
    }, [tagId]);

    const originalKey = useMemo(() => tree.find((node) => node.tag._id === tagId)?._id, [tree, tagId]);
    const blockedParents = useMemo(
        () => (originalKey ? descendantIds(tree, originalKey) : new Set<string>()),
        [tree, originalKey],
    );
    const parent = tree.find((node) => node._id === form.parentKey) || null;
    const urlPath = `${TAG_URL_PREFIX}/${[...(parent ? parent.path : []), templateTagSlug(form.key) || 'tag-key'].join('/')}`;
    const translated = form.key ? templateTagLabelFa(form.key) : '';
    const displayName = form.label?.trim() || (translated !== form.key ? translated : '') || form.key;

    const set = <K extends keyof TemplateTagCategoryInput>(key: K, value: TemplateTagCategoryInput[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const submit = async () => {
        const key = form.key.trim().toLowerCase();
        if (!key) {
            ErrorToaster({ message: 'کلید تگ الزامی است' });
            return;
        }
        setSaving(true);
        try {
            const body = { ...form, key, parentKey: form.parentKey || null };
            if (body.sortOrder === undefined) delete body.sortOrder;
            if (isEdit && tagId) await templateTagCategoryApi.update(tagId, body);
            else await templateTagCategoryApi.create(body);
            SuccessToaster({ message: isEdit ? 'تگ ذخیره شد' : 'تگ ساخته شد' });
            router.push(BASE);
        } catch (e) {
            const message = apiErrorMessage(e);
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
                            <h1 className={parentStyles.mainTitle}>{isEdit ? 'ویرایش تگ' : 'افزودن تگ'}</h1>
                            <p className={parentStyles.subtitle}>برچسب قالب‌ها و صفحهٔ فرود سئو در اکسپلور استودیو.</p>
                        </div>
                        <Link href={BASE} className={tabStyles.smallBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <p>
                            کلید هم شناسهٔ تگ در قالب‌هاست و هم آدرس صفحه را می‌سازد؛ با انتخاب «تگ والد» این تگ زیر مسیر آن
                            قرار می‌گیرد. عنوان و توضیح متا همان چیزی است که در نتیجهٔ گوگل دیده می‌شود و متن معرفی بالای
                            صفحهٔ تگ می‌نشیند.
                        </p>
                    </section>

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <div className={parentStyles.formCard}>
                            <h3 className={parentStyles.formSectionTitle}>هویت و آدرس</h3>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>کلید (snake_case) *</label>
                                    <input
                                        dir="ltr"
                                        value={form.key}
                                        onChange={(e) => set('key', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        آدرس: <code dir="ltr">{urlPath}</code>
                                        {isEdit ? ' — تغییرش آدرس همهٔ قالب‌ها و زیرتگ‌های این تگ را عوض می‌کند.' : ''}
                                    </p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>نام فارسی</label>
                                    <input
                                        value={form.label || ''}
                                        placeholder={translated && translated !== form.key ? translated : ''}
                                        onChange={(e) => set('label', e.target.value)}
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        خالی = ترجمهٔ همین کلید در استودیو{translated && translated !== form.key ? ` («${translated}»)` : ' (این کلید هنوز ترجمه ندارد — پر کنید)'}.
                                    </p>
                                </div>
                            </div>

                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>تگ والد</label>
                                    <select value={form.parentKey || ''} onChange={(e) => set('parentKey', e.target.value || null)}>
                                        <option value="">— تگ اصلی (بدون والد) —</option>
                                        {tree.filter((node) => !blockedParents.has(node._id)).map((node) => (
                                            <option key={node._id} value={node._id}>{`${'— '.repeat(node.depth)}${node.name}`}</option>
                                        ))}
                                    </select>
                                    <p className={hrStyles.fieldHint}>قالب‌های زیرتگ در صفحهٔ تگ والد هم نمایش داده می‌شوند.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>ترتیب نمایش</label>
                                    <input
                                        type="number"
                                        value={form.sortOrder ?? ''}
                                        onChange={(e) => set('sortOrder', e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0))}
                                    />
                                    <p className={hrStyles.fieldHint}>عدد کوچک‌تر اول؛ خالی = آخر فهرست.</p>
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
                                <p className={hrStyles.fieldHint}>یکی دو جمله زیر عنوان صفحهٔ تگ.</p>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>سئو</h3>
                            <div className={parentStyles.field}>
                                <label>عنوان متا (title)</label>
                                <input value={form.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} />
                                <p className={hrStyles.fieldHint}>
                                    {toFarsiNumber(String((form.metaTitle || '').length))} کاراکتر — پیشنهاد: کمتر از ۶۰. خالی = «قالب‌های {displayName || 'نام تگ'}».
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
                                    {toFarsiNumber(String((form.metaDescription || '').length))} کاراکتر — پیشنهاد: ۱۲۰ تا ۱۶۰، یکتا برای هر تگ.
                                </p>
                            </div>
                            <div className={styles.previewBox}>
                                <GoogleSearchPreviewSEO
                                    title={form.metaTitle || `قالب‌های ${displayName || 'نام تگ'}`}
                                    name={displayName}
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
                                        <input type="checkbox" checked={!!form.noindex} onChange={(e) => set('noindex', e.target.checked)} />
                                        noindex (ایندکس نشود)
                                    </label>
                                    <p className={hrStyles.fieldHint}>برای تگ کم‌محتوا؛ از سایت‌مپ هم خودکار حذف می‌شود.</p>
                                </div>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>متن معرفی صفحه</h3>
                            <div className={parentStyles.field}>
                                <Field value={form.content || ''} type="editor" onChange={(value: string) => set('content', value)} />
                                <p className={hrStyles.fieldHint}>۱۰۰ تا ۳۰۰ کلمه دربارهٔ این نوع قالب‌ها و کاربردشان؛ بالای صفحهٔ تگ (بسته تا «بیشتر بخوانید»).</p>
                            </div>

                            <div className={hrStyles.formNoteBox}>
                                بعد از ذخیره، صفحهٔ تگ حداکثر یک دقیقه بعد در استودیو به‌روز می‌شود و در اجرای بعدی سایت‌مپ
                                (گروه <code dir="ltr">template-tags</code>) می‌آید.
                            </div>

                            <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                                <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={submit}>
                                    {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : 'ساخت تگ'}
                                </button>
                                <Link href={BASE} className={tabStyles.smallBtn}>انصراف</Link>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
