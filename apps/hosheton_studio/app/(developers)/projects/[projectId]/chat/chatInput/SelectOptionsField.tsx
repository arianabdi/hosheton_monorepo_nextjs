'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuSearch } from 'react-icons/lu';
import type { NodeSettingField, NodeSettingFieldOption } from '@/app/(developers)/projects/types/node-catalog';
import {
    optionIconsEnabled,
    resolveOptionPreview,
    resolveOptionsDisplay,
    type ResolvedOptionPreview,
} from '@/app/(developers)/projects/lib/option-preview';
import type { OptionAudioPreview } from '../lib/useOptionAudioPreview';
import SettingHelp, { type SettingHelpInfo } from '../../../components/SettingHelpModal';
import styles from './SelectOptionsField.module.scss';

/** بیش از این تعداد گزینه: لیست داخل خودش اسکرول می‌خورد و منوی select جستجو دارد */
const LONG_LIST = 10;

interface OptionView {
    option: NodeSettingFieldOption;
    label: string;
    svg: string;
    preview: ResolvedOptionPreview | null;
}

function hasVisual(view: OptionView) {
    return Boolean(view.svg) || view.preview?.kind === 'image' || view.preview?.kind === 'video';
}

/** گزینه‌ی فعال را وسط لیستِ اسکرول‌دار می‌آورد (بدون جابه‌جا کردن پاپ‌اور) */
function centerActive(list: HTMLElement | null) {
    if (!list || list.scrollHeight <= list.clientHeight) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    list.scrollTop = Math.max(0, active.offsetTop - (list.clientHeight - active.offsetHeight) / 2);
}

function PlayGlyph({ playing }: { playing: boolean }) {
    return playing ? (
        <svg viewBox="0 0 12 12" aria-hidden>
            <rect x="2.5" y="2" width="2.4" height="8" rx="1" />
            <rect x="7.1" y="2" width="2.4" height="8" rx="1" />
        </svg>
    ) : (
        <svg viewBox="0 0 12 12" aria-hidden>
            <path d="M3.5 2.4v7.2a.9.9 0 0 0 1.37.77l5.6-3.6a.9.9 0 0 0 0-1.54l-5.6-3.6A.9.9 0 0 0 3.5 2.4Z" />
        </svg>
    );
}

/** حس پخش فقط با پر شدن پس‌زمینه‌ی عنوان + این دکمه‌ی کوچک؛ پلیر کامل نداریم */
function PlayButton({ playKey, url, audio }: { playKey: string; url: string; audio: OptionAudioPreview }) {
    const { t } = useTranslation('projects');
    const active = audio.activeKey === playKey;
    const playing = active && audio.status === 'playing';
    const loading = active && audio.status === 'loading';
    const label = playing ? t('pause') : t('play');
    return (
        <button
            type="button"
            className={`${styles.play} ${active ? styles.playActive : ''} ${loading ? styles.playLoading : ''}`}
            aria-label={label}
            title={label}
            onClick={(event) => {
                // پخش، گزینه را انتخاب نمی‌کند و منوی select را هم باز/بسته نمی‌کند
                event.stopPropagation();
                audio.toggle(playKey, url);
            }}
        >
            <PlayGlyph playing={playing || loading} />
        </button>
    );
}

/** آیکون / تصویر / ویدیوی نمونه؛ در لیست و کارت جای خالی با حرف اول عنوان پر می‌شود تا ردیف‌ها هم‌تراز بمانند */
function OptionVisual({ view, size }: { view: OptionView; size: 'chip' | 'thumb' | 'card' }) {
    const { preview, svg, label } = view;
    const mediaClass = size === 'card' ? styles.cardMedia : size === 'thumb' ? styles.thumb : styles.chipThumb;
    if (preview?.kind === 'image') {
        // eslint-disable-next-line @next/next/no-img-element
        return <img className={mediaClass} src={preview.url} alt="" loading="lazy" />;
    }
    if (preview?.kind === 'video') {
        return (
            <video
                className={mediaClass}
                src={preview.url}
                muted
                loop
                playsInline
                preload="metadata"
                onMouseEnter={(event) => { event.currentTarget.play().catch(() => undefined); }}
                onMouseLeave={(event) => {
                    event.currentTarget.pause();
                    event.currentTarget.currentTime = 0;
                }}
            />
        );
    }
    if (svg) {
        const iconClass = size === 'card' ? styles.cardIcon : size === 'thumb' ? `${styles.thumb} ${styles.thumbIcon}` : styles.chipIcon;
        return <span className={iconClass} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
    }
    if (size === 'chip') return null;
    const initial = Array.from(label.trim())[0]?.toUpperCase() || '•';
    return (
        <span className={size === 'card' ? styles.cardLetter : `${styles.thumb} ${styles.thumbLetter}`} aria-hidden>
            {initial}
        </span>
    );
}

export default function SelectOptionsField({
    field,
    title,
    value,
    sanitizeSvg,
    audio,
    onChange,
}: {
    field: NodeSettingField;
    title: string;
    value: string;
    sanitizeSvg: (svg?: string) => string;
    audio: OptionAudioPreview;
    onChange: (value: string) => void;
}) {
    const { t: tc } = useTranslation('common');
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const iconsOn = optionIconsEnabled(field);
    const views: OptionView[] = (field.options || []).map((option) => ({
        option,
        label: String(option.label || option.value),
        svg: iconsOn ? sanitizeSvg(option.iconSvg) : '',
        preview: resolveOptionPreview(field, option.preview),
    }));
    const anyVisual = views.some(hasVisual);
    const display = resolveOptionsDisplay(field, {
        count: views.length,
        allVisual: views.length > 0 && views.every(hasVisual),
        audio: views.some((view) => view.preview?.kind === 'audio'),
    });
    const selected = views.find((view) => view.option.value === value);
    const keyOf = (view: OptionView) => `${field.key}:${view.option.value}`;
    const longList = views.length > LONG_LIST;
    const search = query.trim().toLowerCase();
    const filtered = search
        ? views.filter((view) => view.label.toLowerCase().includes(search) || view.option.value.toLowerCase().includes(search))
        : views;
    const activeAudioKey = audio.activeKey;
    const stopAudio = audio.stop;

    // پنجره‌ی راهنما (علامت تعجب کنار عنوان تنظیم) — تنها جای راهنمای تنظیم (helpFa، یا hintFa قدیمی)
    const helpInfo: SettingHelpInfo = { label: title, helpFa: field.helpFa, hintFa: field.hintFa };

    const closePanel = () => {
        setExpanded(false);
        setQuery('');
    };

    // لیست بلند: گزینه‌ی انتخاب‌شده از اول دیده شود
    useEffect(() => {
        if (display === 'list') centerActive(listRef.current);
    }, [display]);

    // منوی select: داخل دید پاپ‌اور بیاید، گزینه‌ی فعال وسطش باشد و جستجو فوکوس بگیرد
    useEffect(() => {
        if (!expanded) return;
        centerActive(listRef.current);
        panelRef.current?.scrollIntoView({ block: 'nearest' });
        if (searchRef.current && window.matchMedia?.('(pointer: fine)').matches) {
            searchRef.current.focus({ preventScroll: true });
        }
    }, [expanded]);

    // کلیک بیرون از select → بسته شود (بقیه‌ی پاپ‌اور باز می‌ماند)
    useEffect(() => {
        if (!expanded) return;
        const onDoc = (event: MouseEvent) => {
            if (rootRef.current?.contains(event.target as Node)) return;
            setExpanded(false);
            setQuery('');
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [expanded]);

    // منوی بسته فقط نمونه‌ی گزینه‌ی انتخاب‌شده را نشان می‌دهد؛ نمونه‌ی گزینه‌های دیگر را قطع کن
    useEffect(() => {
        if (display !== 'dropdown' || expanded || !activeAudioKey) return;
        const prefix = `${field.key}:`;
        if (activeAudioKey.startsWith(prefix) && activeAudioKey !== `${prefix}${value}`) stopAudio();
    }, [display, expanded, activeAudioKey, field.key, value, stopAudio]);

    const play = (view: OptionView) => (view.preview?.kind === 'audio' ? (
        <PlayButton playKey={keyOf(view)} url={view.preview.url} audio={audio} />
    ) : null);

    /** پس‌زمینه‌ی پیشرفت پخش، پشت عنوان گزینه */
    const fill = (view: OptionView) => (view.preview?.kind === 'audio' ? (
        <span className={styles.fill} ref={audio.bindFill(keyOf(view))} aria-hidden />
    ) : null);

    const labelText = (view: OptionView) => (
        <span className={styles.label} dir="auto">{view.label}</span>
    );

    /** ردیف لیست / منو — کل ردیف کلیک‌خور است، دکمه‌ی داخلی برای کیبورد */
    const row = (view: OptionView, onPick: () => void) => {
        const active = view.option.value === value;
        return (
            <div
                key={view.option.value}
                className={`${styles.row} ${active ? styles.active : ''}`}
                data-active={active ? 'true' : undefined}
                onClick={onPick}
            >
                {fill(view)}
                <button type="button" className={styles.rowMain} aria-pressed={active} title={view.label} data-option-button>
                    {anyVisual ? <OptionVisual view={view} size="thumb" /> : null}
                    {labelText(view)}
                </button>
                {play(view)}
            </div>
        );
    };

    const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closePanel();
            triggerRef.current?.focus();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-option-button]') || []);
        if (!buttons.length) return;
        event.preventDefault();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const down = event.key === 'ArrowDown';
        // از جستجو، مثل select معمولی از گزینه‌ی انتخاب‌شده شروع کن
        const selectedIndex = buttons.findIndex((button) => button.closest('[data-active="true"]'));
        const next = index === -1
            ? (selectedIndex >= 0 ? selectedIndex : down ? 0 : buttons.length - 1)
            : Math.min(buttons.length - 1, Math.max(0, index + (down ? 1 : -1)));
        buttons[next].focus();
        buttons[next].scrollIntoView({ block: 'nearest' });
    };

    let body: ReactNode;
    if (!views.length) {
        body = <p className={styles.empty}>—</p>;
    } else if (display === 'chips') {
        body = (
            <div className={styles.chips}>
                {views.map((view) => {
                    const active = view.option.value === value;
                    return (
                        <div
                            key={view.option.value}
                            className={`${styles.chip} ${active ? styles.active : ''}`}
                            onClick={() => onChange(view.option.value)}
                        >
                            {fill(view)}
                            <button type="button" className={styles.chipMain} aria-pressed={active} title={view.label}>
                                <OptionVisual view={view} size="chip" />
                                {labelText(view)}
                            </button>
                            {play(view)}
                        </div>
                    );
                })}
            </div>
        );
    } else if (display === 'grid') {
        body = (
            <div className={styles.grid}>
                {views.map((view) => {
                    const active = view.option.value === value;
                    return (
                        <div
                            key={view.option.value}
                            className={`${styles.card} ${active ? styles.active : ''}`}
                            onClick={() => onChange(view.option.value)}
                        >
                            {anyVisual ? (
                                <div className={styles.cardVisual}>
                                    <OptionVisual view={view} size="card" />
                                </div>
                            ) : null}
                            <div className={styles.cardTitle}>
                                {fill(view)}
                                <button type="button" className={styles.cardLabel} aria-pressed={active} title={view.label}>
                                    {labelText(view)}
                                </button>
                                {play(view)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    } else if (display === 'list') {
        body = (
            <div ref={listRef} className={`${styles.list} ${longList ? styles.listScroll : ''}`}>
                {views.map((view) => row(view, () => onChange(view.option.value)))}
            </div>
        );
    } else {
        body = (
            <div className={styles.dropdown} ref={rootRef}>
                <div
                    className={`${styles.selectBox} ${expanded ? styles.selectBoxOpen : ''}`}
                    onClick={() => (expanded ? closePanel() : setExpanded(true))}
                >
                    {selected ? fill(selected) : null}
                    <button
                        ref={triggerRef}
                        type="button"
                        className={styles.selectTrigger}
                        aria-haspopup="listbox"
                        aria-expanded={expanded}
                        title={selected?.label || title}
                    >
                        {selected && anyVisual ? <OptionVisual view={selected} size="thumb" /> : null}
                        {selected ? labelText(selected) : (
                            <span className={`${styles.label} ${styles.placeholder}`}>
                                {tc('select')}
                            </span>
                        )}
                    </button>
                    {selected ? play(selected) : null}
                    <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} aria-hidden>
                        <LuChevronDown size={15} />
                    </span>
                </div>
                {expanded ? (
                    <div ref={panelRef} className={styles.panel} onKeyDown={onPanelKeyDown}>
                        {longList ? (
                            <label className={styles.search}>
                                <LuSearch size={13} aria-hidden />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={query}
                                    placeholder={tc('search_placeholder')}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter' || !filtered.length) return;
                                        event.preventDefault();
                                        onChange(filtered[0].option.value);
                                        closePanel();
                                    }}
                                />
                            </label>
                        ) : null}
                        <div ref={listRef} className={`${styles.list} ${styles.panelList}`} role="listbox">
                            {filtered.map((view) => row(view, () => {
                                onChange(view.option.value);
                                closePanel();
                            }))}
                            {!filtered.length ? (
                                <p className={styles.empty}>{tc('no_results')}</p>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className={styles.field}>
            <div className={styles.titleRow}>
                <p className={styles.title}>{title}</p>
                <SettingHelp info={helpInfo} />
            </div>
            {body}
        </div>
    );
}
