'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LuChevronDown, LuCircleAlert } from 'react-icons/lu';

import styles from './SettingFieldEditor.module.scss';
import ToggleSwitch from './ToggleSwitch';
import { sanitizeSvg } from '../../ai-modes/modeIcons';
import {
    OPTIONS_DISPLAY_CHOICES,
    OPTIONS_PREVIEW_KINDS,
    optionPreviewKind,
    type NodeSettingFieldForm,
    type NodeSettingOptionsDisplay,
    type OptionPreviewKind,
} from './settingFieldForm';

type ResolvedDisplay = Exclude<NodeSettingOptionsDisplay, 'auto'>;

interface OptionView {
    value: string;
    label: string;
    svg: string;
    preview: { url: string; kind: OptionPreviewKind } | null;
}

const DISPLAY_LABEL: Record<ResolvedDisplay, string> = {
    chips: 'Badge',
    grid: 'کارت',
    list: 'لیست',
    dropdown: 'Select',
};

function hasVisual(view: OptionView) {
    return Boolean(view.svg) || view.preview?.kind === 'image' || view.preview?.kind === 'video';
}

/** همان قاعده‌ی resolveOptionsDisplay استودیو (lib/option-preview.ts) */
function resolveDisplay(display: NodeSettingOptionsDisplay, views: OptionView[]): ResolvedDisplay {
    if (display !== 'auto') return display;
    if (views.length > 0 && views.length <= 24 && views.every(hasVisual)) return 'grid';
    if (views.some((view) => view.preview?.kind === 'audio')) return 'list';
    if (views.length > 12) return 'dropdown';
    return 'chips';
}

function buildViews(field: NodeSettingFieldForm): OptionView[] {
    return (field.optionsRows || [])
        .filter((row) => row.value.trim())
        .map((row) => {
            const url = (row.preview || '').trim();
            const kind = url ? optionPreviewKind(url) : null;
            return {
                value: row.value.trim(),
                label: (row.label || row.value).trim(),
                svg: field.optionsPreview.icon ? sanitizeSvg(row.iconSvg) : '',
                preview: kind && field.optionsPreview[kind] !== false ? { url, kind } : null,
            };
        });
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

function Visual({ view, size }: { view: OptionView; size: 'chip' | 'thumb' | 'card' }) {
    const { preview, svg, label } = view;
    if (preview?.kind === 'image') {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={preview.url} alt="" loading="lazy" />;
    }
    if (preview?.kind === 'video') {
        return <video src={preview.url} muted loop playsInline preload="metadata" />;
    }
    if (svg) {
        return <span className={size === 'chip' ? styles.pvChipIcon : undefined} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
    }
    if (size === 'chip') return null;
    return <span className={styles.pvLetter} aria-hidden>{Array.from(label)[0]?.toUpperCase() || '•'}</span>;
}

/**
 * پیش‌نمایش آزمایشی همان چیزی که کاربر در پاپ‌اور تنظیمات چت/ورک‌فلو می‌بیند —
 * با گزینه‌های واقعی همین فیلد؛ انتخاب و پخش صدا فقط محلی است و چیزی ذخیره نمی‌شود.
 */
function StudioStage({
    field,
    views,
    display,
    onOpenHelp,
}: {
    field: NodeSettingFieldForm;
    views: OptionView[];
    display: ResolvedDisplay;
    onOpenHelp: () => void;
}) {
    const [selected, setSelected] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [playing, setPlaying] = useState('');
    // فقط یک نمونه در حال پخش؛ با عوض شدن پلیر (یا بسته شدن پیش‌نمایش) قبلی قطع می‌شود
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const value = views.some((view) => view.value === selected)
        ? selected
        : views.find((view) => view.value === field.defaultText.trim())?.value || views[0]?.value || '';

    useEffect(() => () => { audio?.pause(); }, [audio]);

    const togglePlay = (view: OptionView) => {
        if (view.preview?.kind !== 'audio') return;
        if (playing === view.value) {
            setAudio(null);
            setPlaying('');
            return;
        }
        const next = new Audio(view.preview.url);
        next.onended = () => setPlaying('');
        next.onerror = () => setPlaying('');
        setAudio(next);
        setPlaying(view.value);
        next.play().catch(() => setPlaying(''));
    };

    const play = (view: OptionView) => (view.preview?.kind === 'audio' ? (
        <button
            type="button"
            className={`${styles.pvPlay} ${playing === view.value ? styles.pvPlayOn : ''}`}
            aria-label={playing === view.value ? 'توقف' : 'پخش نمونه'}
            onClick={(event) => {
                event.stopPropagation();
                togglePlay(view);
            }}
        >
            <PlayGlyph playing={playing === view.value} />
        </button>
    ) : null);

    const anyVisual = views.some(hasVisual);
    const pick = (next: string) => setSelected(next);
    const row = (view: OptionView, onPick: () => void) => (
        <div
            key={view.value}
            className={`${styles.pvRow} ${view.value === value ? styles.pvActive : ''}`}
            onClick={onPick}
        >
            {anyVisual ? <span className={styles.pvThumb}><Visual view={view} size="thumb" /></span> : null}
            <span className={styles.pvLabel} dir="auto">{view.label}</span>
            {play(view)}
        </div>
    );

    let body: ReactNode;
    if (!views.length) {
        body = <p className={styles.stageEmpty}>هنوز گزینه‌ای اضافه نشده است.</p>;
    } else if (display === 'chips') {
        body = (
            <div className={styles.pvChips}>
                {views.map((view) => (
                    <div
                        key={view.value}
                        className={`${styles.pvChip} ${view.value === value ? styles.pvActive : ''}`}
                        onClick={() => pick(view.value)}
                    >
                        <Visual view={view} size="chip" />
                        <span className={styles.pvLabel} dir="auto">{view.label}</span>
                        {play(view)}
                    </div>
                ))}
            </div>
        );
    } else if (display === 'grid') {
        body = (
            <div className={styles.pvGrid}>
                {views.map((view) => (
                    <div
                        key={view.value}
                        className={`${styles.pvCard} ${view.value === value ? styles.pvActive : ''}`}
                        onClick={() => pick(view.value)}
                    >
                        {anyVisual ? <div className={styles.pvCardVisual}><Visual view={view} size="card" /></div> : null}
                        <div className={styles.pvCardTitle}>
                            <span className={styles.pvLabel} dir="auto">{view.label}</span>
                            {play(view)}
                        </div>
                    </div>
                ))}
            </div>
        );
    } else if (display === 'list') {
        body = <div className={styles.pvList}>{views.map((view) => row(view, () => pick(view.value)))}</div>;
    } else {
        const current = views.find((view) => view.value === value);
        body = (
            <div>
                <div
                    className={`${styles.pvSelect} ${expanded ? styles.pvSelectOpen : ''}`}
                    onClick={() => setExpanded((open) => !open)}
                >
                    {current && anyVisual ? <span className={styles.pvThumb}><Visual view={current} size="thumb" /></span> : null}
                    <span className={styles.pvLabel} dir="auto">{current?.label || 'انتخاب کنید'}</span>
                    {current ? play(current) : null}
                    <LuChevronDown size={14} aria-hidden />
                </div>
                {expanded ? (
                    <div className={`${styles.pvSelectPanel} ${styles.pvList}`}>
                        {views.map((view) => row(view, () => {
                            pick(view.value);
                            setExpanded(false);
                        }))}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className={styles.stagePanel}>
            <div className={styles.stageTitleRow}>
                <p className={styles.stageTitle}>{field.labelFa || field.label || field.key || 'عنوان تنظیم'}</p>
                {field.helpFa.trim() ? (
                    <button type="button" className={styles.stageHelp} onClick={onOpenHelp} title="پیش‌نمایش پنجره‌ی راهنما">
                        <LuCircleAlert size={13} aria-hidden />
                    </button>
                ) : null}
            </div>
            {body}
        </div>
    );
}

/**
 * باکس «نمایش در استودیو»: سبک‌ها زیر هم، هرکدام با پیش‌نمایش آزمایشی خودش
 * (با گزینه‌های واقعی همین فیلد)؛ کلیک روی هر ردیف همان سبک را انتخاب می‌کند.
 */
export default function SettingStudioDisplay({
    field,
    onPatch,
    onOpenHelp,
}: {
    field: NodeSettingFieldForm;
    onPatch: (patch: Partial<NodeSettingFieldForm>) => void;
    onOpenHelp: () => void;
}) {
    const views = buildViews(field);
    const autoResolved = resolveDisplay('auto', views);

    const rows = (field.optionsRows || []).filter((row) => row.value.trim());
    const kindCount = (kind: (typeof OPTIONS_PREVIEW_KINDS)[number]['key']) => rows.filter((row) => (
        kind === 'icon' ? Boolean(sanitizeSvg(row.iconSvg)) : optionPreviewKind((row.preview || '').trim()) === kind
    )).length;

    return (
        <div className={styles.studioBox}>
            <div className={styles.styleList} role="radiogroup" aria-label="سبک نمایش گزینه‌ها">
                {OPTIONS_DISPLAY_CHOICES.map((choice) => {
                    const active = choice.value === field.optionsDisplay;
                    const display = choice.value === 'auto' ? autoResolved : choice.value;
                    return (
                        <div
                            key={choice.value}
                            role="radio"
                            aria-checked={active}
                            tabIndex={0}
                            className={`${styles.styleRow} ${active ? styles.styleRowActive : ''}`}
                            onClick={() => { if (!active) onPatch({ optionsDisplay: choice.value }); }}
                            onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onPatch({ optionsDisplay: choice.value });
                                }
                            }}
                        >
                            <div className={styles.styleHead}>
                                <span className={styles.styleRadio} aria-hidden />
                                <span className={styles.styleName}>
                                    {choice.label}
                                    {choice.value === 'auto' ? <span className={styles.styleResolved}> ← الان: {DISPLAY_LABEL[autoResolved]}</span> : null}
                                </span>
                                {active ? <span className={styles.styleTag}>انتخاب‌شده</span> : null}
                            </div>
                            <span className={styles.styleHint}>{choice.hint}</span>
                            <div className={styles.styleStage}>
                                <StudioStage field={field} views={views} display={display} onOpenHelp={onOpenHelp} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={styles.studioFooter}>
                <span className={styles.studioLabel}>پیش‌نمایش‌هایی که کنار گزینه دیده شوند</span>
                <div className={styles.previewKinds}>
                    {OPTIONS_PREVIEW_KINDS.map(({ key, label }) => {
                        const count = kindCount(key);
                        return (
                            <ToggleSwitch
                                key={key}
                                checked={field.optionsPreview[key]}
                                onChange={(checked) => onPatch({ optionsPreview: { ...field.optionsPreview, [key]: checked } })}
                                label={label}
                                description={count ? `${count} گزینه دارد` : 'هیچ گزینه‌ای ندارد'}
                            />
                        );
                    })}
                </div>
                <span className={styles.sectionHint}>
                    نوع هر نمونه از پسوند لینک تشخیص داده می‌شود (mp3 → صدا، jpg → تصویر، mp4 → ویدیو).
                    در پیش‌نمایش‌ها می‌شود گزینه انتخاب کرد یا صدا پخش کرد؛ چیزی ذخیره نمی‌شود.
                </span>
            </div>
        </div>
    );
}
