'use client';

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuFilm, LuPlay, LuVolume2, LuX } from 'react-icons/lu';
import { MdAdd } from 'react-icons/md';
import { formatFileSize, useMediaFileSize } from '@/app/(developers)/projects/lib/media-file-size';
import { MiniAudioPlayer } from '@/app/(developers)/projects/[projectId]/components/MiniAudioPlayer';
import type { GalleryMode } from '../lib/gallery-types';
import { GalleryEmptyHint } from './GalleryEmptyHint';
import { GalleryTypeFilter } from './GalleryTypeFilter';
import styles from './PhotoGallery.module.scss';
import {
    groupAndLayoutPhotos,
    type CalculatedPhoto,
    type GalleryMediaFilter,
    type Photo,
} from './galleryUtils';

export interface PhotoGalleryProps {
    photos: Photo[];
    targetRowHeight?: number;
    initialType?: GalleryMediaFilter;
    /** Lock/reset type filter when this changes (e.g. modal open / initialTab). */
    typeFilterKey?: string | number | boolean;
    mode?: GalleryMode;
    pickedKeys?: Set<string>;
    /** When set, used for select/multi-select instead of opening the lightbox. */
    onPhotoClick?: (photo: Photo) => void;
    /**
     * حالت مرور با انتخاب (mode=view): کلیک روی کاشی همچنان بزرگ می‌کند و دکمه گوشه
     * کاشی (و دکمه داخل نمای بزرگ) فایل را برای افزودن انتخاب/لغو می‌کند.
     */
    onToggleSelect?: (photo: Photo) => void;
    /** دکمه «+» گوشه کاشی — افزودن مستقیم همان فایل به chatinput (دسکتاپ با hover، موبایل همیشه) */
    onQuickAdd?: (photo: Photo) => void;
    /** کاشی‌هایی که همین الان اضافه شده‌اند (دکمه + به تیک تبدیل می‌شود) */
    quickAddedKeys?: Set<string>;
    className?: string;
    compact?: boolean;
    typeLocked?: boolean;
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const VIDEO_OVERLAY_STYLE: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 6,
    pointerEvents: 'none',
};

const VIDEO_VEIL_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    maxHeight: 80,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
};

const VIDEO_META_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    // گوشه‌ی مقابل دکمه‌ی انتخاب (selectToggle در inline-end است)
    insetInlineStart: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 24,
    padding: '0 8px 0 6px',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1,
};

/** بدون مدت: فقط آیکون پخش در مربع گوشه‌گرد (نه دایره) */
const VIDEO_PLAY_ONLY_STYLE: React.CSSProperties = {
    ...VIDEO_META_STYLE,
    width: 24,
    padding: 0,
    justifyContent: 'center',
    borderRadius: 7,
};

function getScrollParent(node: HTMLElement | null): Element | null {
    let el = node?.parentElement ?? null;
    while (el) {
        const { overflowY } = window.getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return el;
        el = el.parentElement;
    }
    return null;
}

function DateGroupHeader({ date }: { date: string }) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [stuck, setStuck] = useState(false);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const root = getScrollParent(sentinel);
        const observer = new IntersectionObserver(
            ([entry]) => setStuck(!entry.isIntersecting),
            { root, threshold: 0, rootMargin: '0px 0px 0px 0px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div ref={sentinelRef} className={styles.dateStickySentinel} aria-hidden />
            <div className={`${styles.dateHeader} ${stuck ? styles.dateHeaderStuck : ''}`}>
                {new Date(date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                })}
            </div>
        </>
    );
}

/** فاصله‌ی ردیف‌ها و کاشی‌ها — همان gap چیدمان justified */
const ROW_GAP = 4;
/** ردیف‌هایی که تا این فاصله بیرون از دید هستند هم رندر می‌شوند (اسکرول سریع بدون جای خالی) */
const OVERSCAN_PX = 900;

type GroupLayout = {
    date: string;
    rows: CalculatedPhoto[][];
    /** بالای هر ردیف نسبت به ظرف ردیف‌های همان روز */
    tops: number[];
    height: number;
};

function layoutGroupRows(date: string, rows: CalculatedPhoto[][]): GroupLayout {
    const tops: number[] = [];
    let y = 0;
    for (const row of rows) {
        tops.push(y);
        y += (row[0]?.computedHeight || 0) + ROW_GAP;
    }
    return { date, rows, tops, height: Math.max(0, y - ROW_GAP) };
}

/** اولین ردیفی که پایینش بعد از y است */
function firstRowEndingAfter(layout: GroupLayout, y: number) {
    let lo = 0;
    let hi = layout.rows.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const bottom = layout.tops[mid] + (layout.rows[mid][0]?.computedHeight || 0);
        if (bottom < y) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/** اولین ردیفی که بالایش بعد از y است */
function firstRowStartingAfter(layout: GroupLayout, y: number) {
    let lo = 0;
    let hi = layout.rows.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (layout.tops[mid] <= y) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/**
 * ردیف‌های یک روز به‌صورت مجازی (مثل RecyclerView اندروید): ظرف ارتفاع واقعی همه‌ی ردیف‌ها را دارد
 * ولی فقط ردیف‌های نزدیک دید در DOM هستند؛ با اسکرول جابه‌جا می‌شوند.
 */
function VirtualRows({
    layout,
    scrollRoot,
    renderRow,
}: {
    layout: GroupLayout;
    scrollRoot: Element | null;
    renderRow: (row: CalculatedPhoto[]) => React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<[number, number]>(() => [0, Math.min(layout.rows.length, 6)]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            const rect = el.getBoundingClientRect();
            const view = scrollRoot ? scrollRoot.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
            const start = firstRowEndingAfter(layout, view.top - rect.top - OVERSCAN_PX);
            const end = firstRowStartingAfter(layout, view.bottom - rect.top + OVERSCAN_PX);
            setRange((prev) => (prev[0] === start && prev[1] === end ? prev : [start, end]));
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(measure);
        };
        measure();
        const target: Element | Window = scrollRoot ?? window;
        target.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        const observer = scrollRoot ? new ResizeObserver(schedule) : null;
        if (scrollRoot && observer) observer.observe(scrollRoot);
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            target.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            observer?.disconnect();
        };
    }, [layout, scrollRoot]);

    const [start, end] = range;
    return (
        <div ref={ref} className={styles.rowsContainer} style={{ height: layout.height }}>
            {layout.rows.slice(start, end).map((row, offset) => {
                const index = start + offset;
                return (
                    <div
                        key={index}
                        className={styles.row}
                        style={{ top: layout.tops[index], height: row[0]?.computedHeight || 0 }}
                    >
                        {renderRow(row)}
                    </div>
                );
            })}
        </div>
    );
}

const GalleryPhotoThumb = memo(function GalleryPhotoThumb({
    photo,
    selected,
    onOpen,
    onToggleSelect,
    onQuickAdd,
    quickAdded = false,
}: {
    photo: CalculatedPhoto;
    selected: boolean;
    onOpen: (photo: CalculatedPhoto) => void;
    onToggleSelect?: (photo: CalculatedPhoto) => void;
    onQuickAdd?: (photo: CalculatedPhoto) => void;
    quickAdded?: boolean;
}) {
    const { t } = useTranslation('projects');
    const isVideo = photo.type === 'video';
    // ویدیو در گرید فقط thumbnail دارد؛ بدون thumbnail = کاشی ساده که از اول آماده است
    const plainTile = photo.type === 'audio' || (isVideo && !photo.src);
    const [loaded, setLoaded] = useState(plainTile);
    // فایل در دسترس نیست (۴۰۳/۴۰۴): کاشی ساده بماند — نه آیکون عکس شکسته، نه اسپینر بی‌پایان
    const [failed, setFailed] = useState(false);
    const [duration, setDuration] = useState(photo.durationSeconds || 0);
    const imgRef = useRef<HTMLImageElement>(null);
    // حجم فایل اصلی (نه thumbnail) — فقط برای کاشی‌های mount‌شده درخواست می‌شود
    const sizeLabel = formatFileSize(useMediaFileSize(photo.originalSrc, photo.sizeBytes));

    useLayoutEffect(() => {
        if (plainTile) {
            setLoaded(true);
            return;
        }
        setLoaded(false);
        setFailed(false);
        const img = imgRef.current;
        if (!img?.complete) return;
        if (img.naturalWidth > 0) setLoaded(true);
    }, [photo.src, photo.type, plainTile]);

    // مدت فقط از API — برای گرفتنش هیچ ویدیویی در گرید بار نمی‌شود
    useEffect(() => {
        setDuration(photo.durationSeconds || 0);
    }, [photo.durationSeconds]);

    return (
        <div
            role="button"
            tabIndex={0}
            className={`${styles.photoWrapper} ${selected ? styles.photoSelected : ''}`}
            style={{
                width: `${photo.computedWidth}px`,
                height: `${photo.computedHeight}px`,
            }}
            onClick={() => onOpen(photo)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(photo);
                }
            }}
            aria-label={photo.alt}
            aria-pressed={selected || undefined}
        >
            {!loaded && !failed && <span className={styles.ghost} aria-hidden="true" />}

            {photo.type === 'audio' ? (
                <span className={styles.audioTile}>
                    <LuVolume2 size={28} />
                    <span className={styles.audioName}>{photo.alt}</span>
                </span>
            ) : failed ? null : photo.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={imgRef}
                    src={photo.src}
                    alt={photo.alt}
                    className={`${styles.image} ${loaded ? styles.imageReady : ''}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            ) : isVideo ? (
                // ویدیوی بدون thumbnail: کاشی ساده — خود ویدیو فقط با کلیک (نمای بزرگ) بار می‌شود
                <span className={styles.videoTile} aria-hidden="true">
                    <LuFilm size={26} />
                </span>
            ) : null}

            {isVideo ? (
                <div style={VIDEO_OVERLAY_STYLE} aria-hidden="true">
                    <div style={VIDEO_VEIL_STYLE} />
                    <div style={duration > 0 ? VIDEO_META_STYLE : VIDEO_PLAY_ONLY_STYLE}>
                        <LuPlay size={12} fill="currentColor" color="#fff" />
                        {duration > 0 ? <span>{formatDuration(duration)}</span> : null}
                    </div>
                </div>
            ) : null}

            {onToggleSelect ? (
                // انتخاب برای افزودن، جدا از کلیک کاشی که بزرگ می‌کند
                <button
                    type="button"
                    className={`${styles.selectToggle} ${selected ? styles.selectToggleOn : ''}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleSelect(photo);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    aria-pressed={selected}
                    aria-label={selected ? t('gallery_picked') : t('gallery_pick')}
                    title={selected ? t('gallery_picked') : t('gallery_pick')}
                >
                    <LuCheck size={13} />
                </button>
            ) : selected ? (
                <span className={styles.selectBadge} aria-hidden="true">
                    <LuCheck size={14} />
                </span>
            ) : null}

            {onQuickAdd ? (
                <button
                    type="button"
                    className={`${styles.quickAdd} ${quickAdded ? styles.quickAddDone : ''}`}
                    disabled={quickAdded}
                    onClick={(event) => {
                        event.stopPropagation();
                        onQuickAdd(photo);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    aria-label={t('gallery_add_to_chat')}
                    title={t('gallery_add_to_chat')}
                >
                    {quickAdded ? <LuCheck size={14} /> : <MdAdd size={16} />}
                </button>
            ) : null}

            {sizeLabel ? (
                <span className={styles.sizeBadge} dir="ltr">{sizeLabel}</span>
            ) : null}
        </div>
    );
});

function PhotoLightbox({
    photo,
    onClose,
    selected = false,
    onToggleSelect,
}: {
    photo: Photo;
    onClose: () => void;
    selected?: boolean;
    onToggleSelect?: () => void;
}) {
    const { t } = useTranslation('projects');
    const [loaded, setLoaded] = useState(photo.type === 'audio');

    useEffect(() => {
        setLoaded(photo.type === 'audio');
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                // فقط نمای بزرگ بسته شود — نه گالری یا شیت موبایل پشت آن
                event.stopImmediatePropagation();
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey, true);
        };
    }, [photo.originalSrc, photo.type, onClose]);

    if (typeof document === 'undefined') return null;

    // data-modal-popover: کلیک روی نمای بزرگ، شیت/مودال گالری زیرش را نبندد (ModalHelper)
    return createPortal(
        <div
            className={styles.lightbox}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            data-modal-popover
            data-gallery-lightbox
        >
            <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
                <LuX size={22} />
            </button>
            <div className={styles.lightboxStage} onClick={(e) => e.stopPropagation()}>
                {photo.type === 'audio' ? (
                    <div className={styles.lightboxAudio}>
                        <MiniAudioPlayer src={photo.originalSrc} title={photo.alt} />
                    </div>
                ) : photo.type === 'video' ? (
                    <video
                        key={photo.originalSrc}
                        src={photo.originalSrc}
                        className={`${styles.lightboxImage} ${styles.imageReady}`}
                        controls
                        playsInline
                        autoPlay
                    />
                ) : (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.src}
                            alt=""
                            className={styles.lightboxThumb}
                            aria-hidden="true"
                            draggable={false}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            key={photo.originalSrc}
                            src={photo.originalSrc}
                            alt={photo.alt}
                            className={`${styles.lightboxImage} ${loaded ? styles.imageReady : ''}`}
                            decoding="async"
                            onLoad={() => setLoaded(true)}
                        />
                    </>
                )}
            </div>
            {onToggleSelect ? (
                <button
                    type="button"
                    className={`${styles.lightboxPick} ${selected ? styles.lightboxPickOn : ''}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleSelect();
                    }}
                    aria-pressed={selected}
                >
                    <LuCheck size={15} />
                    {selected ? t('gallery_picked') : t('gallery_pick')}
                </button>
            ) : null}
        </div>,
        document.body,
    );
}

export default function PhotoGallery({
    photos,
    targetRowHeight = 220,
    initialType = 'all',
    typeFilterKey,
    mode = 'view',
    pickedKeys,
    onPhotoClick,
    onToggleSelect,
    onQuickAdd,
    quickAddedKeys,
    className,
    compact = false,
    typeLocked = false,
}: PhotoGalleryProps) {
    const { t } = useTranslation('projects');
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [mediaType, setMediaType] = useState<GalleryMediaFilter>(initialType);
    const [active, setActive] = useState<Photo | null>(null);
    const picking = mode === 'select' || mode === 'multi-select';

    useEffect(() => {
        setMediaType(initialType);
    }, [initialType, typeFilterKey]);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setContainerWidth(entries[0].contentRect.width);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // تعداد هر نوع روی دکمه‌های فیلتر
    const typeCounts = useMemo(() => {
        const out = { all: photos.length, image: 0, video: 0, audio: 0 };
        for (const photo of photos) out[photo.type] += 1;
        return out;
    }, [photos]);
    const filtered = useMemo(
        () => (mediaType === 'all' ? photos : photos.filter((photo) => photo.type === mediaType)),
        [photos, mediaType],
    );
    // چیدمان فقط با تغییر فایل‌ها/عرض دوباره حساب می‌شود (نه با هر انتخاب یا رندر)
    const groups = useMemo(
        () => groupAndLayoutPhotos(filtered, containerWidth, targetRowHeight, ROW_GAP)
            .map((group) => layoutGroupRows(group.date, group.rows)),
        [filtered, containerWidth, targetRowHeight],
    );

    // ظرف اسکرول (بدنه‌ی مودال گالری یا صفحه) — مبنای مجازی‌سازی ردیف‌ها
    const [scrollRoot, setScrollRoot] = useState<Element | null>(null);
    useLayoutEffect(() => {
        setScrollRoot(getScrollParent(containerRef.current));
    }, []);

    useEffect(() => {
        setActive(null);
    }, [mediaType]);

    // کال‌بک‌های پایدار: کاشی‌های memo با هر رندر والد دوباره رندر نشوند
    const callbacksRef = useRef({ picking, onPhotoClick, onToggleSelect, onQuickAdd });
    useLayoutEffect(() => {
        callbacksRef.current = { picking, onPhotoClick, onToggleSelect, onQuickAdd };
    });
    const handleOpen = useCallback((photo: CalculatedPhoto) => {
        const current = callbacksRef.current;
        if (current.picking && current.onPhotoClick) {
            current.onPhotoClick(photo);
            return;
        }
        setActive(photo);
    }, []);
    const handleToggleSelect = useCallback((photo: CalculatedPhoto) => {
        callbacksRef.current.onToggleSelect?.(photo);
    }, []);
    const handleQuickAdd = useCallback((photo: CalculatedPhoto) => {
        callbacksRef.current.onQuickAdd?.(photo);
    }, []);
    const toggleProp = !picking && onToggleSelect ? handleToggleSelect : undefined;
    const quickAddProp = !picking && onQuickAdd ? handleQuickAdd : undefined;

    const renderRow = useCallback((row: CalculatedPhoto[]) => row.map((photo) => (
        <GalleryPhotoThumb
            key={photo.id}
            photo={photo}
            selected={Boolean(pickedKeys?.has(photo.id))}
            onOpen={handleOpen}
            onToggleSelect={toggleProp}
            onQuickAdd={quickAddProp}
            quickAdded={Boolean(quickAddedKeys?.has(photo.id))}
        />
    )), [pickedKeys, quickAddedKeys, handleOpen, toggleProp, quickAddProp]);

    return (
        <>
            <div
                ref={containerRef}
                className={`${styles.galleryContainer} ${compact ? styles.galleryCompact : ''} ${className || ''}`.trim()}
            >
                {typeLocked ? null : (
                    <div className={styles.filterSlot}>
                        <GalleryTypeFilter value={mediaType} onChange={setMediaType} locked={typeLocked} counts={typeCounts} />
                    </div>
                )}

                {filtered.length === 0 ? (
                    <GalleryEmptyHint text={t('no_files_in_category')} />
                ) : (
                    groups.map((group) => (
                        <div key={group.date} className={styles.dateGroup}>
                            <DateGroupHeader date={group.date} />
                            <VirtualRows layout={group} scrollRoot={scrollRoot} renderRow={renderRow} />
                        </div>
                    ))
                )}
            </div>
            {!picking && active ? (
                <PhotoLightbox
                    photo={active}
                    onClose={() => setActive(null)}
                    selected={Boolean(pickedKeys?.has(active.id))}
                    onToggleSelect={onToggleSelect ? () => onToggleSelect(active) : undefined}
                />
            ) : null}
        </>
    );
}
