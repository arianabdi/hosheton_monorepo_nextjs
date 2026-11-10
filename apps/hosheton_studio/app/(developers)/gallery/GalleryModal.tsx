'use client';

import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { createPortal } from 'react-dom';
import { LuCheck, LuFilm, LuImages, LuLoader, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { ModalCloseButton } from '@my-workspace/components';
import { notifyError } from '@/app/lib/errors';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import PhotoGallery from './components/PhotoGallery';
import { galleryFilesToPhotos, galleryItemKey } from './components/galleryFileToPhoto';
import type { GalleryMediaFilter } from './components/galleryUtils';
import type { GalleryFileItem, GalleryMode, GalleryScope, GalleryTab } from './lib/gallery-types';
import { useGalleryFiles } from './hooks/useGalleryFiles';
import styles from './GalleryModal.module.scss';

async function resolveGalleryItemBytes(item: GalleryFileItem): Promise<number | null> {
    if (Number.isFinite(item.sizeBytes) && Number(item.sizeBytes) > 0) return Number(item.sizeBytes);
    if (!item.url) return null;
    try {
        const response = await fetch(item.url, { method: 'HEAD' });
        const length = Number(response.headers.get('content-length'));
        return Number.isFinite(length) && length > 0 ? length : null;
    } catch {
        return null;
    }
}

/** URL بدون query/hash — لینک‌های امضاشده‌ی یک فایل با پارامترهای متفاوت یکی حساب شوند */
function urlIdentity(value?: string): string {
    const src = String(value || '').trim();
    return src ? src.split(/[?#]/)[0] : '';
}

function uniquePickedCount(files: GalleryFileItem[], keys: Set<string>, identityKeys: (item: GalleryFileItem) => string[]) {
    const seen = new Set<string>();
    let count = 0;
    for (const item of files) {
        const key = galleryItemKey(item);
        if (seen.has(key) || !identityKeys(item).some((entry) => keys.has(entry))) continue;
        seen.add(key);
        count += 1;
    }
    return count;
}

export interface GalleryModalProps {
    open: boolean;
    onClose: () => void;
    /** `project` = this workflow. `all` = every project + personal chats. `personal` = personal chats only. */
    scope: GalleryScope;
    /** Required when `scope === 'project'`. */
    projectId?: string;
    /** Optional chat id (kept for API compatibility; personal scope loads all personal chats). */
    chatId?: string;
    /** Multi-select keeps the modal open until the user confirms. */
    mode?: GalleryMode;
    onSelect?: (item: GalleryFileItem) => void;
    onSelectMany?: (items: GalleryFileItem[]) => void;
    selectedIds?: string[];
    /** When opening, pre-select this media type filter. */
    initialTab?: GalleryTab;
    /** Max number of newly selectable items in multi-select. */
    maxCount?: number;
    /** Max bytes per file. */
    maxBytes?: number;
    /** Lock the gallery to one media kind. */
    allowedType?: 'image' | 'video' | 'audio';
    /**
     * فقط mode=view: مرور با امکان افزودن. کلیک کاشی همچنان بزرگ می‌کند؛ با دکمه گوشه
     * کاشی (یا داخل نمای بزرگ) یک یا چند فایل انتخاب و با دکمه پایین اضافه می‌شوند.
     */
    onAdd?: (items: GalleryFileItem[]) => void;
    /** متن دکمه افزودن، مثلاً «افزودن به ورک‌فلو» */
    addLabel?: string;
    /** فقط mode=view: دکمه «+» روی هر کاشی که همان فایل را مستقیم به chatinput اضافه می‌کند */
    onQuickAdd?: (item: GalleryFileItem) => void;
}

export function GalleryModal({
    open,
    onClose,
    scope,
    projectId,
    chatId,
    mode = 'view',
    onSelect,
    onSelectMany,
    selectedIds,
    initialTab,
    maxCount,
    maxBytes,
    allowedType,
    onAdd,
    addLabel,
    onQuickAdd,
}: GalleryModalProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const isMobile = useMobileViewport('(max-width: 768px)');
    const [pickedKeys, setPickedKeys] = useState<Set<string>>(new Set());
    const [typeSeed, setTypeSeed] = useState(0);
    const [initialType, setInitialType] = useState<GalleryMediaFilter>('all');
    // کاشی‌هایی که در همین باز شدن با «+» به چت اضافه شده‌اند
    const [quickAddedKeys, setQuickAddedKeys] = useState<Set<string>>(new Set());
    const overlayRef = useRef<HTMLDivElement>(null);

    const { files, loading, error } = useGalleryFiles({
        open,
        scope,
        projectId,
        chatId,
        personalFilter: 'all',
    });

    useEffect(() => {
        if (!open) return;
        const frame = window.requestAnimationFrame(() => {
            setInitialType(allowedType || initialTab || 'all');
            setTypeSeed((value) => value + 1);
            const initial = new Set<string>();
            for (const id of selectedIds || []) {
                if (!id) continue;
                initial.add(id);
                const bare = urlIdentity(id);
                if (bare) initial.add(bare);
            }
            setPickedKeys(initial);
            setQuickAddedKeys(new Set());
        });
        return () => window.cancelAnimationFrame(frame);
    }, [open, initialTab, selectedIds, allowedType]);

    // پنجره تمام‌صفحه (دسکتاپ و موبایل): قفل اسکرول صفحه، Esc، و جدا کردن چرخ/لمس از بوم
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // نمای بزرگ باز است: Escape مال خود آن است، نه بستن کل گالری
            if (document.querySelector('[data-gallery-lightbox]')) return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        const overlay = overlayRef.current;
        const stopCanvasZoom = (event: Event) => event.stopPropagation();
        overlay?.addEventListener('wheel', stopCanvasZoom, { capture: true, passive: true });
        overlay?.addEventListener('touchmove', stopCanvasZoom, { capture: true, passive: true });
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey, true);
            overlay?.removeEventListener('wheel', stopCanvasZoom, { capture: true });
            overlay?.removeEventListener('touchmove', stopCanvasZoom, { capture: true });
        };
    }, [open, onClose]);

    const isolateFromCanvas = (event: UIEvent) => {
        event.stopPropagation();
    };

    const visibleFiles = useMemo(
        () => (allowedType ? files.filter((item) => item.type === allowedType) : files),
        [files, allowedType],
    );
    const photos = useMemo(() => galleryFilesToPhotos(visibleFiles), [visibleFiles]);
    const filesByKey = useMemo(() => {
        const map = new Map<string, GalleryFileItem>();
        for (const item of visibleFiles) {
            map.set(galleryItemKey(item), item);
        }
        return map;
    }, [visibleFiles]);
    const photoByKey = useMemo(() => {
        const map = new Map<string, (typeof photos)[number]>();
        for (const photo of photos) {
            map.set(photo.id, photo);
        }
        return map;
    }, [photos]);

    const itemIdentityKeys = (item: GalleryFileItem) => (
        [galleryItemKey(item), item.id, item.fileId, item.fileKey, item.url, urlIdentity(item.url)]
            .filter(Boolean)
            .map(String)
    );

    const isItemPicked = (item: GalleryFileItem, keys: Set<string>) => (
        itemIdentityKeys(item).some((key) => keys.has(key))
    );

    const selectedItems = useMemo(() => {
        const items: GalleryFileItem[] = [];
        const seen = new Set<string>();
        for (const item of visibleFiles) {
            const key = galleryItemKey(item);
            if (!isItemPicked(item, pickedKeys) || seen.has(key)) continue;
            seen.add(key);
            items.push(item);
        }
        return items;
    }, [pickedKeys, visibleFiles]);
    // تیک کاشی‌ها با کلید photo (galleryItemKey) چک می‌شود؛ انتخاب‌ها ممکن است با شناسه
    // دیگری (fileId/fileKey/url) آمده باشند — پس از روی همان تطبیق هویتی ساخته می‌شود
    const pickedPhotoKeys = useMemo(
        () => new Set(selectedItems.map((item) => galleryItemKey(item))),
        [selectedItems],
    );

    const browseSelect = mode === 'view' && Boolean(onAdd);
    const showSelection = mode === 'multi-select' || browseSelect;

    // مرور با انتخاب: انتخاب/لغو بدون محدودیت‌های ورودی (تعداد/حجم/نوع)
    const togglePicked = (key: string) => {
        const item = filesByKey.get(key);
        if (!item) return;
        const related = itemIdentityKeys(item);
        setPickedKeys((current) => {
            const next = new Set(current);
            if (related.some((entry) => next.has(entry))) related.forEach((entry) => next.delete(entry));
            else next.add(key);
            return next;
        });
    };

    const title = scope === 'personal'
        ? t('gallery_personal')
        : scope === 'project'
            ? t('gallery_project')
            : t('gallery_all');

    const handlePick = (key: string) => {
        const item = filesByKey.get(key);
        if (!item) return;

        if (mode === 'multi-select') {
            const related = itemIdentityKeys(item);
            const already = related.some((entry) => pickedKeys.has(entry));
            if (already) {
                setPickedKeys((current) => {
                    const next = new Set(current);
                    related.forEach((entry) => next.delete(entry));
                    return next;
                });
                return;
            }
            if (allowedType && item.type !== allowedType) {
                notifyError({ message: 'این نوع فایل برای این ورودی مجاز نیست.' });
                return;
            }
            const limit = Number(maxCount);
            if (Number.isFinite(limit) && limit > 0
                && uniquePickedCount(visibleFiles, pickedKeys, itemIdentityKeys) >= limit) {
                notifyError({ message: `حداکثر ${limit} فایل می‌توانید انتخاب کنید.` });
                return;
            }
            void (async () => {
                const cap = Number(maxBytes);
                if (Number.isFinite(cap) && cap > 0) {
                    const bytes = await resolveGalleryItemBytes(item);
                    if (bytes != null && bytes > cap) {
                        notifyError({ message: `حجم فایل بیشتر از ${Math.round(cap / (1024 * 1024))}MB مجاز است.` });
                        return;
                    }
                }
                setPickedKeys((current) => {
                    const next = new Set(current);
                    next.add(key);
                    return next;
                });
            })();
            return;
        }
        if (mode === 'select' && onSelect) {
            if (allowedType && item.type !== allowedType) {
                notifyError({ message: 'این نوع فایل برای این ورودی مجاز نیست.' });
                return;
            }
            void (async () => {
                const cap = Number(maxBytes);
                if (Number.isFinite(cap) && cap > 0) {
                    const bytes = await resolveGalleryItemBytes(item);
                    if (bytes != null && bytes > cap) {
                        notifyError({ message: `حجم فایل بیشتر از ${Math.round(cap / (1024 * 1024))}MB مجاز است.` });
                        return;
                    }
                }
                onSelect(item);
                onClose();
            })();
        }
    };

    const selectedThumbSrc = (item: GalleryFileItem) => {
        const photo = photoByKey.get(galleryItemKey(item));
        if (photo?.src) return photo.src;
        return item.thumbnailUrlLarge || item.thumbnailUrl || item.url || '';
    };

    const galleryContent = (
        <>
            {showSelection && selectedItems.length > 0 && (
                <div className={styles.selectedStripWrap}>
                    <div className={styles.selectedStrip} aria-label={t('selected_files_count', { count: selectedItems.length })}>
                        {selectedItems.map((item) => {
                            const key = galleryItemKey(item);
                            const thumb = selectedThumbSrc(item);
                            return (
                                <div key={key} className={styles.selectedThumb}>
                                    {item.type === 'audio' ? (
                                        <div className={styles.selectedAudio} aria-hidden>♪</div>
                                    ) : thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={thumb} alt={item.nodeLabel || ''} />
                                    ) : (
                                        <div className={styles.selectedAudio} aria-hidden>●</div>
                                    )}
                                    {item.type === 'video' ? (
                                        <span className={styles.selectedVideoBadge} aria-hidden>
                                            <LuFilm size={11} />
                                        </span>
                                    ) : null}
                                    <button
                                        type="button"
                                        className={styles.selectedRemove}
                                        onClick={() => (browseSelect ? togglePicked(key) : handlePick(key))}
                                        aria-label={tc('close')}
                                    >
                                        <LuX size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div
                className={`${styles.modalBody} nowheel`}
                onWheel={isolateFromCanvas}
                onTouchMove={isolateFromCanvas}
            >
                <div className={styles.bodyInner}>
                {loading && (
                    <p className={styles.emptyState}><LuLoader className={styles.spinIcon} /> {tc('loading')}</p>
                )}
                {!loading && error && <p className={styles.emptyState}>{error}</p>}
                {!loading && !error && (
                    <PhotoGallery
                        photos={photos}
                        targetRowHeight={isMobile ? 140 : 180}
                        initialType={initialType}
                        typeFilterKey={typeSeed}
                        mode={mode}
                        pickedKeys={pickedPhotoKeys}
                        onPhotoClick={(photo) => handlePick(photo.id)}
                        onToggleSelect={browseSelect ? (photo) => togglePicked(photo.id) : undefined}
                        onQuickAdd={mode === 'view' && onQuickAdd ? (photo) => {
                            const item = filesByKey.get(photo.id);
                            if (!item) return;
                            onQuickAdd(item);
                            setQuickAddedKeys((current) => new Set(current).add(photo.id));
                        } : undefined}
                        quickAddedKeys={quickAddedKeys}
                        compact
                        typeLocked={Boolean(allowedType)}
                    />
                )}
                </div>
            </div>

            {browseSelect && selectedItems.length > 0 && (
                <div className={styles.selectionFooter}>
                    <span>{t('selected_files_count', { count: selectedItems.length })}</span>
                    <button
                        type="button"
                        onClick={() => {
                            onAdd?.(selectedItems);
                            onClose();
                        }}
                    >
                        <LuCheck /> {addLabel || tc('confirm')}
                    </button>
                </div>
            )}

            {mode === 'multi-select' && (
                <div className={styles.selectionFooter}>
                    <span>{t('selected_files_count', { count: selectedItems.length })}</span>
                    <button
                        type="button"
                        onClick={() => {
                            onSelectMany?.(selectedItems);
                            onClose();
                        }}
                        disabled={selectedItems.length === 0}
                    >
                        <LuCheck /> {tc('confirm')}
                    </button>
                </div>
            )}
        </>
    );

    if (!open || typeof document === 'undefined') return null;

    // پنجره تمام‌صفحه مثل جزئیات قالب در explore: از فریم اول اندازه‌ی نهایی را دارد،
    // پس با رسیدن عکس‌ها جابه‌جا/بزرگ نمی‌شود (دسکتاپ و موبایل یکسان)
    return createPortal(
        <div
            ref={overlayRef}
            className={`${styles.shell} nowheel nodrag nopan`}
            onWheel={isolateFromCanvas}
            onTouchMove={isolateFromCanvas}
            onPointerDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <header className={styles.shellHeader}>
                <div className={styles.shellTitle}>
                    <span className={styles.shellIcon} aria-hidden><LuImages size={18} /></span>
                    <h2>{title}</h2>
                    {!loading && !error ? (
                        <span className={styles.shellCount}>{t('gallery_items_count', { count: photos.length })}</span>
                    ) : null}
                </div>
                <div className={styles.shellTools}>
                    {isMobile ? null : <span className={styles.escHint}>esc</span>}
                    <ModalCloseButton placement="inline" onClick={onClose} aria-label={tc('close')} />
                </div>
            </header>
            {galleryContent}
        </div>,
        document.body,
    );
}
