'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import { personaApi, type PersonaOptionsResult } from '../../../lib/persona-api';
import { templateTagLabelFa } from '../../../lib/template-tag-labels-fa';

function tagNames(keys: string[]) {
    return keys.map((key) => `«${templateTagLabelFa(key)}»`).join('، ');
}

/**
 * «منتشرکننده» قالب: خالی = سازندهٔ واقعی (ادمینی که ثبت می‌کند)، وگرنه کاربر نمایشی که قالب
 * در اکسپلور و پروفایل به نامش دیده می‌شود. با تگ‌های قالب فقط هم‌حوزه‌ها (همان تگ، والد یا
 * زیرشاخه‌اش) می‌آیند؛ بدون تگ همه.
 */
export default function PublisherPicker({
    value,
    onChange,
    tagKeys,
}: {
    value: string;
    onChange: (value: string) => void;
    tagKeys: string[];
}) {
    const [result, setResult] = useState<PersonaOptionsResult | null>(null);
    const tagSignature = [...tagKeys].sort().join(',');

    useEffect(() => {
        let active = true;
        personaApi.options({ tags: tagSignature ? tagSignature.split(',') : [], include: value || undefined })
            .then((res) => {
                if (active) setResult(res);
            })
            .catch(() => {
                if (active) setResult({ personas: [], mode: 'all', tags: [] });
            });
        return () => {
            active = false;
        };
        // value فقط برای «include» است؛ با هر انتخاب دوباره نخوانیم
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagSignature]);

    const options = result?.personas || [];
    const unknownSelected = Boolean(value) && result !== null && !options.some((item) => item._id === value);
    const matchedCount = result?.matchedCount ?? options.length;

    let domainHint: React.ReactNode = null;
    if (result?.mode === 'filtered') {
        domainHint = (
            <strong>
                این {matchedCount.toLocaleString('fa-IR')} کاربر در حوزهٔ {tagNames(result.tags)} (یا زیرشاخه‌هایش) کار می‌کنند.
            </strong>
        );
    } else if (result?.mode === 'no_match') {
        domainHint = <>هیچ کاربری حوزهٔ {tagNames(result.tags)} را ندارد؛ همهٔ کاربران نمایش داده شده‌اند.</>;
    } else if (result) {
        domainHint = <>تگی انتخاب نشده؛ همهٔ کاربران نمایش داده شده‌اند. با انتخاب تگ، فقط هم‌حوزه‌ها می‌آیند.</>;
    }

    return (
        <div className={parentStyles.field}>
            <label>منتشرکننده</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} disabled={result === null}>
                <option value="">{result === null ? 'در حال بارگذاری…' : '— خودم (حساب ادمین) —'}</option>
                {unknownSelected ? <option value={value}>کاربر نمایشی غیرفعال</option> : null}
                {options.map((item, index) => (
                    <option key={item._id} value={item._id}>
                        {item.fullName}{item.username ? ` — @${item.username}` : ''}
                        {result?.mode === 'filtered' && index >= matchedCount ? ' (خارج از این حوزه)' : ''}
                    </option>
                ))}
            </select>
            <p className={hrStyles.fieldHint}>
                {domainHint}{' '}
                قالب در اکسپلور و پروفایل به نام این شخص دیده می‌شود و پیام خریداران در صفحهٔ پیام‌های استودیو برای همهٔ
                ادمین‌ها می‌آید. حوزهٔ هر نفر را در <Link href="/projects/personas">کاربران نمایشی</Link> تعیین کنید.
            </p>
        </div>
    );
}
