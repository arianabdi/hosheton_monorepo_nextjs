'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonaOptions } from '../lib/personas';

/**
 * انتخاب «منتشرکننده» قالب — فقط ادمین (فراخوان باید خودش با `useIsStaff` شرط بگذارد).
 * مقدار خالی = خودِ سازنده؛ وگرنه شناسهٔ کاربر نمایشی که قالب به نامش منتشر می‌شود.
 * با `tagKeys` (تگ‌های قالب) فقط هم‌حوزه‌ها می‌آیند و زیرش نوشته می‌شود این‌ها در کدام حوزه‌اند؛
 * بدون تگ همه.
 */
export function PublisherSelect({
    value,
    onChange,
    tagKeys = [],
    className,
    hintClassName,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    tagKeys?: string[];
    className?: string;
    hintClassName?: string;
    disabled?: boolean;
}) {
    const { t } = useTranslation('templates');
    const { t: tTag } = useTranslation('templateTags');
    // منتشرکنندهٔ اولیه (ویرایش قالب) حتی خارج از حوزه در فهرست بماند
    const initialRef = useRef(value);
    const { personas, mode, tags, matchedCount, loading } = usePersonaOptions(true, tagKeys, initialRef.current);
    const unknownSelected = value && !personas.some((item) => item._id === value);
    const inDomain = matchedCount ?? personas.length;
    const names = tags.map((key) => `«${tTag(key, { defaultValue: key })}»`).join('، ');

    const hint = mode === 'filtered'
        ? t('publisher_domain_filtered', { count: inDomain, tags: names, defaultValue: 'این {{count}} کاربر در حوزهٔ {{tags}} (یا زیرشاخه‌هایش) کار می‌کنند.' })
        : mode === 'no_match'
            ? t('publisher_domain_none', { tags: names, defaultValue: 'هیچ کاربری حوزهٔ {{tags}} را ندارد؛ همهٔ کاربران نمایش داده شده‌اند.' })
            : t('publisher_domain_all', { defaultValue: 'تگی انتخاب نشده؛ همهٔ کاربران نمایش داده شده‌اند.' });

    return (
        <>
            <select
                className={className}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">{t('publisher_self', { defaultValue: 'خودم (حساب واقعی)' })}</option>
                {unknownSelected ? (
                    <option value={value}>{loading ? '…' : t('publisher_inactive', { defaultValue: 'کاربر نمایشی (غیرفعال)' })}</option>
                ) : null}
                {personas.map((persona, index) => (
                    <option key={persona._id} value={persona._id}>
                        {persona.fullName}{persona.username ? ` — @${persona.username}` : ''}
                        {mode === 'filtered' && index >= inDomain
                            ? ` (${t('publisher_out_of_domain', { defaultValue: 'خارج از این حوزه' })})`
                            : ''}
                    </option>
                ))}
            </select>
            <small className={hintClassName}>{hint}</small>
        </>
    );
}

export default PublisherSelect;
