'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LuBookOpen, LuCheck, LuCopy, LuExternalLink } from 'react-icons/lu';
import { sitemapHref, type GuideTopicId } from '../lib/sections';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Sitemap.module.scss';

/** معرفی کوتاه بالای هر تب + لینک به همان موضوع در مستند آموزش (جزئیات فقط در تب آموزش) */
export function SectionIntro({ topic, children }: { topic: GuideTopicId; children: ReactNode }) {
    return (
        <div className={styles.sectionIntro}>
            <p>{children}</p>
            <Link href={sitemapHref.guide(topic)} className={styles.introLink}>
                <LuBookOpen /> آموزش این بخش
            </Link>
        </div>
    );
}

export function SectionLoading() {
    return (
        <div className={styles.sectionLoading} role="status" aria-label="در حال بارگذاری">
            <span className={styles.spinner} />
        </div>
    );
}

export function EmptyState({ children }: { children: ReactNode }) {
    return <div className={styles.emptyState}>{children}</div>;
}

/** ردیف toggle — کامپوننت مشترک پنل (با ماژول کد معرف یکی است) */
export { default as ToggleItem } from '@/app/components/ToggleField/ToggleField';

/** ویرایشگر لیست رشته‌ای (مسیرها، الگوهای regex و…) — ردیف نامعتبر با پیام زیرش مشخص می‌شود */
export function StringListEditor({
    items,
    onChange,
    placeholder,
    addLabel,
    emptyLabel,
    validate,
}: {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
    addLabel: string;
    emptyLabel?: string;
    /** پیام خطا برای مقدار نامعتبر یا null */
    validate?: (value: string) => string | null;
}) {
    const update = (index: number, value: string) => onChange(items.map((item, i) => (i === index ? value : item)));
    return (
        <div className={styles.listEditor}>
            {items.length === 0 && emptyLabel && <p className={parentStyles.fieldHint}>{emptyLabel}</p>}
            {items.map((item, index) => {
                const error = item.trim() && validate ? validate(item.trim()) : null;
                return (
                    <div key={index} className={styles.listEditorItem}>
                        <div className={styles.listEditorRow}>
                            <input
                                dir="ltr"
                                value={item}
                                placeholder={placeholder}
                                aria-invalid={!!error}
                                onChange={(e) => update(index, e.target.value)}
                            />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => onChange(items.filter((_, i) => i !== index))}
                                aria-label="حذف"
                            >
                                ×
                            </button>
                        </div>
                        {error && <span className={parentStyles.fieldError}>{error}</span>}
                    </div>
                );
            })}
            <button type="button" className={`${parentStyles.secondaryBtn} ${styles.addBtn}`} onClick={() => onChange([...items, ''])}>
                + {addLabel}
            </button>
        </div>
    );
}

/** نوار ذخیره پایین فرم تب‌ها — با تغییرات ذخیره‌نشده فعال می‌شود */
export function SaveBar({
    dirty,
    saving,
    onSave,
    onReset,
    label,
    disabled,
}: {
    dirty: boolean;
    saving: boolean;
    onSave: () => void;
    onReset: () => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <div className={styles.saveBar}>
            <span className={styles.saveState}>{dirty ? 'تغییرات ذخیره‌نشده دارید' : 'همه تغییرات ذخیره شده است'}</span>
            <div className={styles.toolbarActions}>
                {dirty && (
                    <button type="button" className={parentStyles.secondaryBtn} onClick={onReset} disabled={saving}>
                        بازگردانی
                    </button>
                )}
                <button type="button" className={parentStyles.primaryBtn} onClick={onSave} disabled={!dirty || saving || disabled}>
                    {saving ? 'در حال ذخیره…' : label}
                </button>
            </div>
        </div>
    );
}

/** آدرس عمومی با دکمه کپی و باز کردن */
export function UrlRow({ label, url, hint }: { label: string; url: string; hint?: ReactNode }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard در دسترس نیست (HTTP) — کاربر می‌تواند دستی انتخاب کند
        }
    };
    return (
        <div className={styles.urlRow}>
            <div className={styles.urlRowText}>
                <span className={styles.urlRowLabel}>{label}</span>
                <a href={url} target="_blank" rel="noreferrer" className={styles.urlValue} dir="ltr">
                    {url}
                </a>
                {hint && <span className={parentStyles.fieldHint}>{hint}</span>}
            </div>
            <div className={styles.urlRowActions}>
                <button type="button" className={styles.iconBtn} onClick={copy} aria-label="کپی آدرس" title="کپی آدرس">
                    {copied ? <LuCheck /> : <LuCopy />}
                </button>
                <a href={url} target="_blank" rel="noreferrer" className={styles.iconBtn} aria-label="باز کردن" title="باز کردن">
                    <LuExternalLink />
                </a>
            </div>
        </div>
    );
}

export function isValidRegex(value: string): string | null {
    try {
        new RegExp(value);
        return null;
    } catch {
        return 'الگوی regex نامعتبر است و ذخیره نمی‌شود.';
    }
}

export function isValidPath(value: string): string | null {
    return value.startsWith('/') ? null : 'مسیر باید با «/» شروع شود.';
}
