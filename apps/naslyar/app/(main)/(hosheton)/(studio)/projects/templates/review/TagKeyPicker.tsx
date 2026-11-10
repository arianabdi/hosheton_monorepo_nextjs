'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { templateTagCategoryApi, type TemplateTagPublicItem } from '../../../lib/template-tag-category-api';
import { templateTagLabelFa } from '../../../lib/template-tag-labels-fa';
import styles from './TemplateForm.module.scss';

export default function TagKeyPicker({
    value,
    onChange,
}: {
    value: string[];
    onChange: (keys: string[]) => void;
}) {
    const fieldRef = useRef<HTMLDivElement>(null);
    const [catalog, setCatalog] = useState<TemplateTagPublicItem[]>([]);
    const [query, setQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        templateTagCategoryApi.listPublic()
            .then((res) => setCatalog(res.tags || []))
            .catch(() => setCatalog([]));
    }, []);

    useEffect(() => {
        if (!catalog.length || !value.length) return;
        const allowed = new Set(catalog.map((item) => item.key));
        const next = value.filter((key) => allowed.has(key));
        if (next.length !== value.length) onChange(next);
    }, [catalog, value, onChange]);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!fieldRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [menuOpen]);

    const available = useMemo(() => {
        const selected = new Set(value);
        const q = query.trim().toLowerCase();
        return catalog.filter((item) => {
            if (selected.has(item.key)) return false;
            if (!q) return true;
            return item.key.includes(q) || templateTagLabelFa(item.key).toLowerCase().includes(q);
        });
    }, [catalog, value, query]);

    const addTag = (key?: string) => {
        const match = key || available[0]?.key;
        if (!match || value.includes(match)) return;
        onChange([...value, match]);
        setQuery('');
        setMenuOpen(true);
    };

    return (
        <>
            <div className={styles.tagField} ref={fieldRef}>
                <input
                    className={styles.tagInput}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setMenuOpen(true);
                    }}
                    onFocus={() => setMenuOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                    placeholder="جستجوی موضوع…"
                />
                <button
                    type="button"
                    className={styles.tagAddBtn}
                    aria-label="افزودن تگ"
                    onClick={() => addTag()}
                >
                    +
                </button>
                {menuOpen ? (
                    <div className={styles.tagMenu} role="listbox">
                        {available.length === 0 ? (
                            <div className={styles.tagMenuEmpty}>موضوعی پیدا نشد</div>
                        ) : (
                            available.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="option"
                                    className={styles.tagOption}
                                    onClick={() => addTag(item.key)}
                                >
                                    {templateTagLabelFa(item.key)}
                                </button>
                            ))
                        )}
                    </div>
                ) : null}
            </div>
            {value.length > 0 ? (
                <div className={styles.tagChipRow}>
                    {value.map((key) => (
                        <span key={key} className={styles.chip}>
                            {templateTagLabelFa(key)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((item) => item !== key))}
                                aria-label="حذف"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}
        </>
    );
}
