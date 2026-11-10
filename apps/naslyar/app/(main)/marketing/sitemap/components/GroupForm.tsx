'use client';

import Link from 'next/link';
import { useSitemap } from '../lib/SitemapProvider';
import { ToggleItem } from './fields';
import {
    CATEGORY_SECTION_PRESETS,
    CHANGEFREQ_OPTIONS,
    DEFAULT_CONDITIONS,
    LASTMOD_FIELD_LABELS,
    SITEMAP_PROTOCOL_MAX_URLS,
    SOURCE_HINTS,
    SOURCE_LABELS,
    URL_PATTERN_PRESETS,
    URL_PATTERN_TOKENS,
    previewUrlPattern,
} from '../lib/sitemap.types';
import type { SitemapGroupConditions, SitemapGroupForm, SitemapSource } from '../lib/sitemap.types';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Sitemap.module.scss';

const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS) as SitemapSource[];

const CONDITION_FIELDS: Array<{ key: keyof SitemapGroupConditions; title: string; hint: string }> = [
    { key: 'requirePublished', title: 'فقط منتشرشده‌ها', hint: 'پیش‌نویس و در انتظار تایید هرگز وارد سایت‌مپ نمی‌شود.' },
    { key: 'requirePublicVisibility', title: 'فقط دسترسی عمومی', hint: 'محتوای خصوصی یا مخصوص اعضا کنار گذاشته می‌شود.' },
    { key: 'requireAlive', title: 'حذف‌نشده‌ها', hint: 'رکوردهای حذف‌شده (soft delete) منتشر نمی‌شوند.' },
    { key: 'requireSlug', title: 'فقط رکوردهای دارای slug', hint: 'رکورد بدون آدرس تمیز قابل ایندکس نیست؛ خاموش‌کردن توصیه نمی‌شود.' },
];

/** فرم ایجاد/ویرایش گروه سایت‌مپ — بخش‌بندی‌شده با راهنمای زیر هر فیلد */
export default function GroupForm({
    form,
    onChange,
    editMode,
}: {
    form: SitemapGroupForm;
    onChange: (form: SitemapGroupForm) => void;
    editMode: boolean;
}) {
    const { config } = useSitemap();
    const set = <K extends keyof SitemapGroupForm>(key: K, value: SitemapGroupForm[K]) => onChange({ ...form, [key]: value });
    const hint = SOURCE_HINTS[form.source];
    const conditions = form.conditions ?? DEFAULT_CONDITIONS;
    const isStatic = form.source === 'static';

    const changeSource = (source: SitemapSource) =>
        onChange({
            ...form,
            source,
            urlPattern: SOURCE_HINTS[source].suggestedPattern,
            lastmodField: SOURCE_HINTS[source].lastmodFields[0],
            conditions: source === 'static' ? null : conditions,
            sourceOptions: source === 'categories' ? { categorySection: CATEGORY_SECTION_PRESETS[0].section } : null,
        });

    const categorySection = form.sourceOptions?.categorySection || '';
    const presets = form.source === 'categories'
        ? CATEGORY_SECTION_PRESETS.filter((preset) => preset.section === categorySection)
            .map((preset) => ({ label: preset.label, pattern: preset.pattern }))
        : URL_PATTERN_PRESETS[form.source] || [];
    const tokens = URL_PATTERN_TOKENS.filter((token) => !token.sources || token.sources.includes(form.source));
    const changeSection = (section: string) => {
        const preset = CATEGORY_SECTION_PRESETS.find((item) => item.section === section);
        onChange({ ...form, sourceOptions: { categorySection: section }, ...(preset ? { urlPattern: preset.pattern } : {}) });
    };

    return (
        <>
            <h2 className={parentStyles.formSectionTitle}>۱. هویت گروه</h2>
            <div className={parentStyles.formSection}>
                <div className={parentStyles.field}>
                    <label htmlFor="group-title">عنوان گروه</label>
                    <input id="group-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثلاً: قالب‌های مارکت‌پلیس" />
                    <p className={parentStyles.fieldHint}>نام قابل نمایش در پنل و گزارش‌ها.</p>
                </div>

                <div className={parentStyles.field}>
                    <label htmlFor="group-name">شناسه گروه (نام فایل)</label>
                    <input
                        id="group-name"
                        dir="ltr"
                        value={form.name}
                        disabled={editMode}
                        onChange={(e) => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="templates"
                    />
                    <p className={parentStyles.fieldHint}>
                        حروف کوچک انگلیسی، عدد و خط تیره. نام فایل‌ها از آن ساخته می‌شود (مثل <span className={styles.keyBadge}>templates-1.xml</span>)
                        {editMode ? ' و بعد از ساخت قابل تغییر نیست.' : '.'}
                    </p>
                </div>

                <div className={parentStyles.field}>
                    <label htmlFor="group-sort">ترتیب در ایندکس</label>
                    <input id="group-sort" type="number" dir="ltr" value={form.sort} onChange={(e) => set('sort', Number(e.target.value) || 0)} />
                    <p className={parentStyles.fieldHint}>عدد کوچک‌تر = بالاتر در فایل ایندکس.</p>
                </div>

                <ToggleItem
                    title="گروه فعال باشد"
                    hint="گروه غیرفعال از ایندکس سایت‌مپ حذف می‌شود؛ خود محتوا دست‌نخورده می‌ماند."
                    checked={form.enabled}
                    onChange={(enabled) => set('enabled', enabled)}
                />
            </div>

            <h2 className={parentStyles.formSectionTitle}>۲. منبع و الگوی URL</h2>
            <div className={parentStyles.formSection}>
                <div className={parentStyles.field}>
                    <label htmlFor="group-source">منبع محتوا</label>
                    <select id="group-source" value={form.source} onChange={(e) => changeSource(e.target.value as SitemapSource)}>
                        {SOURCE_OPTIONS.map((source) => (
                            <option key={source} value={source}>
                                {SOURCE_LABELS[source]}
                            </option>
                        ))}
                    </select>
                    <p className={parentStyles.fieldHint}>{hint.hint}</p>
                </div>

                <div className={parentStyles.field}>
                    <label htmlFor="group-pattern">الگوی URL</label>
                    <input
                        id="group-pattern"
                        dir="ltr"
                        value={form.urlPattern}
                        onChange={(e) => set('urlPattern', e.target.value)}
                        placeholder={hint.suggestedPattern}
                    />
                    <p className={parentStyles.fieldHint}>
                        باید دقیقاً مسیر صفحه در سایت باشد. نمونهٔ آدرس نهایی:{' '}
                        <span className={styles.keyBadge}>{previewUrlPattern(form.urlPattern || hint.suggestedPattern, config?.siteUrl)}</span>
                    </p>
                    {presets.length ? (
                        <div className={styles.patternChips}>
                            <span>الگوهای آماده:</span>
                            {presets.map((preset) => (
                                <button
                                    key={preset.pattern}
                                    type="button"
                                    className={`${styles.keyBadge} ${form.urlPattern === preset.pattern ? styles.keyBadgeActive : ''}`}
                                    onClick={() => set('urlPattern', preset.pattern)}
                                    title={preset.pattern}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    <div className={styles.patternChips}>
                        <span>درج توکن:</span>
                        {tokens.map((token) => (
                            <button
                                key={token.token}
                                type="button"
                                className={styles.keyBadge}
                                title={token.hint}
                                onClick={() => set('urlPattern', `${form.urlPattern.replace(/\/+$/, '')}/${token.token}`)}
                            >
                                {token.token}
                            </button>
                        ))}
                    </div>
                    <p className={parentStyles.fieldHint}>
                        <span className={styles.keyBadge}>{'{categoryPath}'}</span> زنجیرهٔ کامل دسته و زیردسته‌ها را می‌گذارد (سند بی‌دسته منتشر نمی‌شود)؛
                        نسخهٔ <span className={styles.keyBadge}>{'{categoryPath?}'}</span> اختیاری است و سند بی‌دسته را بدون آن بخش منتشر می‌کند.
                    </p>
                </div>

                {form.source === 'categories' && (
                    <div className={parentStyles.field}>
                        <label htmlFor="group-section">بخش دسته‌بندی (section)</label>
                        <select id="group-section" value={categorySection} onChange={(e) => changeSection(e.target.value)}>
                            {CATEGORY_SECTION_PRESETS.map((preset) => (
                                <option key={preset.section} value={preset.section}>
                                    {preset.label} ({preset.section})
                                </option>
                            ))}
                            {categorySection && !CATEGORY_SECTION_PRESETS.some((preset) => preset.section === categorySection) ? (
                                <option value={categorySection}>{categorySection}</option>
                            ) : null}
                        </select>
                        <p className={parentStyles.fieldHint}>
                            فقط دسته‌های این بخش منتشر می‌شوند و با انتخاب، الگوی URL مطابق قرارداد فرانت پر می‌شود.
                            درخت دسته‌ها از <Link href="/blog/categories">محتوا › دسته‌بندی‌ها</Link> مدیریت می‌شود؛ صفحه‌های تگ
                            قالب‌ها منبع جدای «دسته‌های قالب (تگ‌ها)» دارند.
                        </p>
                    </div>
                )}
            </div>

            {!isStatic && (
                <>
                    <h2 className={parentStyles.formSectionTitle}>۳. شرایط انتشار</h2>
                    <div className={parentStyles.formSection}>
                        {CONDITION_FIELDS.map((field) => (
                            <ToggleItem
                                key={field.key}
                                title={field.title}
                                hint={field.hint}
                                checked={conditions[field.key]}
                                onChange={(value) => set('conditions', { ...conditions, [field.key]: value })}
                            />
                        ))}
                    </div>
                </>
            )}

            <h2 className={parentStyles.formSectionTitle}>{isStatic ? '۳' : '۴'}. lastmod و پیشرفته</h2>
            <div className={parentStyles.formSection}>
                {!isStatic && (
                    <div className={parentStyles.field}>
                        <label htmlFor="group-lastmod">منبع تاریخ lastmod</label>
                        <select
                            id="group-lastmod"
                            value={form.lastmodField}
                            onChange={(e) => set('lastmodField', e.target.value as SitemapGroupForm['lastmodField'])}
                        >
                            {hint.lastmodFields.map((field) => (
                                <option key={field} value={field}>
                                    {LASTMOD_FIELD_LABELS[field]}
                                </option>
                            ))}
                        </select>
                        <p className={parentStyles.fieldHint}>تاریخی که با تغییر واقعی محتوا عوض می‌شود؛ گوگل با آن زمان کرول دوباره را تعیین می‌کند.</p>
                    </div>
                )}

                <div className={styles.formGrid}>
                    <div className={parentStyles.field}>
                        <label htmlFor="group-shard">سقف URL در هر فایل (اختیاری)</label>
                        <input
                            id="group-shard"
                            type="number"
                            min={1}
                            max={SITEMAP_PROTOCOL_MAX_URLS}
                            dir="ltr"
                            value={form.shardSize ?? ''}
                            placeholder={config ? `سراسری: ${config.maxUrlsPerFile}` : 'سراسری'}
                            onChange={(e) => set('shardSize', e.target.value === '' ? null : Number(e.target.value))}
                        />
                        <p className={parentStyles.fieldHint}>خالی = مقدار تب تنظیمات.</p>
                    </div>
                    <div className={parentStyles.field}>
                        <label htmlFor="group-ttl">کش اختصاصی (ثانیه)</label>
                        <input
                            id="group-ttl"
                            type="number"
                            min={0}
                            dir="ltr"
                            value={form.cacheTtlSeconds}
                            onChange={(e) => set('cacheTtlSeconds', Math.max(0, Number(e.target.value) || 0))}
                        />
                        <p className={parentStyles.fieldHint}>۰ = مدت کش سراسری تب «تولید و فایل‌ها».</p>
                    </div>
                </div>

                {(config?.advanced.changefreq || config?.advanced.priority) && (
                    <div className={styles.formGrid}>
                        {config?.advanced.changefreq && (
                            <div className={parentStyles.field}>
                                <label htmlFor="group-changefreq">changefreq (قدیمی)</label>
                                <select
                                    id="group-changefreq"
                                    dir="ltr"
                                    value={form.changefreq ?? ''}
                                    onChange={(e) => set('changefreq', e.target.value || null)}
                                >
                                    <option value="">بدون مقدار</option>
                                    {CHANGEFREQ_OPTIONS.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                                <p className={parentStyles.fieldHint}>چون در تنظیمات روشن است نمایش داده می‌شود؛ گوگل نادیده‌اش می‌گیرد.</p>
                            </div>
                        )}
                        {config?.advanced.priority && (
                            <div className={parentStyles.field}>
                                <label htmlFor="group-priority">priority (قدیمی، ۰ تا ۱)</label>
                                <input
                                    id="group-priority"
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    dir="ltr"
                                    value={form.priority ?? ''}
                                    onChange={(e) => set('priority', e.target.value === '' ? null : Math.min(1, Math.max(0, Number(e.target.value))))}
                                />
                                <p className={parentStyles.fieldHint}>خالی = در XML نمی‌آید.</p>
                            </div>
                        )}
                    </div>
                )}

                <div className={parentStyles.field}>
                    <label htmlFor="group-note">یادداشت ادمین</label>
                    <textarea
                        id="group-note"
                        maxLength={300}
                        value={form.note}
                        onChange={(e) => set('note', e.target.value)}
                        placeholder="مثلاً: بعد از اصلاح الگو، گروه را دوباره تولید کنید."
                    />
                    <p className={parentStyles.fieldHint}>فقط در پنل دیده می‌شود.</p>
                </div>
            </div>
        </>
    );
}
