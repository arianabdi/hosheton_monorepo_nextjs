'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SvgMarkup, sanitizeSvg } from './modeIcons';
import styles from './ai-modes.module.scss';

type ProviderModelOption = {
    _id: string;
    name?: string;
    displayName?: string;
    iconSvg?: string;
    class?: string;
};

export default function AllowedModelsPicker({
    value,
    onChange,
    token,
    baseUrl,
    mediaClass,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    token?: string;
    baseUrl: string;
    mediaClass?: string;
}) {
    const [models, setModels] = useState<ProviderModelOption[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const selected = useMemo(() => new Set(value.map(String)), [value]);
    const classFilter = mediaClass && mediaClass !== 'any' ? mediaClass : '';

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        const classQuery = classFilter ? `&class=${encodeURIComponent(classFilter)}` : '';
        axios.get(`${baseUrl}/api/provider-models?limit=500&includeInactive=false${classQuery}`, {
            headers: { authorization: `Bearer ${token}` },
        }).then((res) => {
            if (cancelled) return;
            const list = (res.data?.data?.models || []) as ProviderModelOption[];
            const next = list.map((model) => ({
                ...model,
                _id: String(model._id),
            }));
            setModels(next);
            if (classFilter && value.length) {
                const allowed = new Set(next.map((model) => model._id));
                const pruned = value.filter((id) => allowed.has(id));
                if (pruned.length !== value.length) onChange(pruned);
            }
        }).catch(() => {
            if (!cancelled) setModels([]);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [token, baseUrl, classFilter]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return models;
        return models.filter((model) => (
            `${model.displayName || ''} ${model.name || ''} ${model.class || ''}`.toLowerCase().includes(needle)
        ));
    }, [models, query]);

    const toggle = (id: string) => {
        if (selected.has(id)) onChange(value.filter((item) => item !== id));
        else onChange([...value, id]);
    };

    return (
        <div className={styles.modelPicker}>
            <input
                className={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی مدل…"
            />
            <p className={styles.modelPickerHint}>
                {classFilter
                    ? `فقط مدل‌های کلاس «${classFilter === 'video' ? 'ویدیو' : classFilter === 'image' ? 'تصویر' : classFilter === 'audio' ? 'صوت' : classFilter === 'text' ? 'متن' : classFilter === '3d' ? 'سه‌بعدی' : classFilter}»`
                    : 'همه کلاس‌ها — کلاس رسانه مود را انتخاب کنید تا فهرست محدود شود.'}
                {' '}
                {value.length
                    ? `${value.length} مدل انتخاب شده.`
                    : 'اگر خالی بماند، همان فیلتر کلاس رسانه و mode اجرایی اعمال می‌شود.'}
            </p>
            {loading ? <span>در حال بارگذاری مدل‌ها…</span> : null}
            <div className={styles.modelPickerGrid}>
                {filtered.map((model) => {
                    const active = selected.has(model._id);
                    return (
                        <button
                            type="button"
                            key={model._id}
                            className={`${styles.modelPick} ${active ? styles.modelPickActive : ''}`}
                            onClick={() => toggle(model._id)}
                        >
                            <span className={styles.modelPickIcon}>
                                {sanitizeSvg(model.iconSvg)
                                    ? <SvgMarkup svg={model.iconSvg} />
                                    : (model.displayName || model.name || '?').slice(0, 1)}
                            </span>
                            <span className={styles.modelPickText}>
                                <strong>{model.displayName || model.name}</strong>
                                <small>{model.name}{model.class ? ` · ${model.class}` : ''}</small>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
