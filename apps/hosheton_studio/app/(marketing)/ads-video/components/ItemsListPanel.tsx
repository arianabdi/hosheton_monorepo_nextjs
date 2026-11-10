'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuImage, LuList, LuMousePointerClick, LuPalette, LuSearch, LuType, LuRefreshCw, LuHash } from 'react-icons/lu';
import { highlightElement, type AdsElementHandle } from '../lib/cut-runtime';
import type { AdsCutFull } from '../lib/ads-video-api';
import styles from '../AdsVideo.module.scss';

export interface ItemsListPanelProps {
    cut: AdsCutFull | null;
    /** getter خواندن المان‌ها از iframe فعال پخش‌کننده */
    getElements(): AdsElementHandle[];
    /** نسخه/سند کات عوض شد → لیست دوباره خوانده شود */
    readKey: string;
    /** overrideها از جای دیگر (مثلاً جابه‌جایی با drag) عوض شد → لیست دوباره خوانده شود */
    overridesVersion?: number;
    /** کات در صحنه به‌صورت تک‌نمایش باز است (وگرنه iframeِ کات در دسترس نیست) */
    singleMode?: boolean;
    focusElementId?: string | null;
    /** کلیک روی آیتم — المان در پیش‌نمایش هایلایت و ویرایشگرش در تب المان‌ها باز می‌شود */
    onEditElement(elementId: string): void;
}

function TypeIcon({ type }: { type: AdsElementHandle['type'] }) {
    if (type === 'color') return <LuPalette size={12} />;
    if (type === 'image') return <LuImage size={12} />;
    if (type === 'number') return <LuHash size={12} />;
    return <LuType size={12} />;
}

/**
 * تب «آیتم‌ها» — فهرست کامل المان‌های قابل‌ویرایشِ کاتِ انتخابی با اسمشان
 * (همان‌هایی که موشن‌گرافیک از طریق window.__adsElements معرفی می‌کند).
 * هر ردیف: نام، نوع، مقدار فعلی و نشان سفارشی‌شدن؛ کلیک = هایلایت در
 * پیش‌نمایش + پرش به ویرایشگر همان المان در تب «المان‌ها».
 */
export function ItemsListPanel({ cut, getElements, readKey, overridesVersion, singleMode, focusElementId, onEditElement }: ItemsListPanelProps) {
    const { t } = useTranslation('adsVideo');
    const [items, setItems] = useState<AdsElementHandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const handlesRef = useRef<AdsElementHandle[]>([]);
    const highlightedRef = useRef<string | null>(null);

    const readItems = useCallback(() => {
        const handles = getElements();
        if (!handles.length) return false;
        handlesRef.current = handles;
        setItems(handles);
        setLoading(false);
        return true;
    }, [getElements]);

    // با تعویض کات/نسخه چند بار تلاش کن — iframe ممکن است هنوز لود نشده باشد
    useEffect(() => {
        if (!cut) return;
        let cancelled = false;
        let tries = 0;
        // ریست فهرست قبلی به‌صورت غیرهمگن — تا کات جدید با فهرست کات قبلی میکس نشود
        const resetRaf = requestAnimationFrame(() => {
            if (cancelled) return;
            handlesRef.current = [];
            setItems([]);
            setLoading(true);
        });
        const timer = setInterval(() => {
            tries += 1;
            const handles = getElements();
            if (handles.length) {
                clearInterval(timer);
                if (cancelled) return;
                handlesRef.current = handles;
                setItems(handles);
                setLoading(false);
            } else if (tries >= 20) {
                clearInterval(timer);
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            cancelAnimationFrame(resetRaf);
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cut?._id, cut?.currentVersion, readKey]);

    // جابه‌جایی/متن با drag در preview عوض شده — مقدارها را تازه کن
    useEffect(() => {
        if (!overridesVersion) return;
        const raf = requestAnimationFrame(() => {
            const handles = getElements();
            if (handles.length) {
                handlesRef.current = handles;
                setItems(handles);
            }
        });
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overridesVersion]);

    // پیش‌نمایش عوض شد (کات جدید) — هایلایت قبلی دیگری معنا ندارد
    useEffect(() => () => {
        handlesRef.current.forEach((handle) => highlightElement(handle, false));
    }, [cut?._id]);

    const showHighlight = useCallback((id?: string | null) => {
        if (highlightedRef.current === id) return;
        handlesRef.current.forEach((handle) => {
            highlightElement(handle, handle.id === id);
        });
        highlightedRef.current = id ?? null;
    }, []);

    const overrides = (cut?.elementOverrides || {}) as Record<string, unknown>;
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q));
    }, [items, query]);

    const valuePreview = (item: AdsElementHandle): string => {
        const override = overrides[item.id];
        const raw = override !== undefined
            ? (override && typeof override === 'object' && 'value' in (override as Record<string, unknown>)
                ? (override as { value?: unknown }).value
                : override)
            : item.value;
        if (raw == null || raw === '') return '—';
        return String(raw);
    };

    if (!cut) {
        return <div className={styles.panelEmpty}>{t('items_select_first', { defaultValue: 'اول یک کات را باز کنید.' })}</div>;
    }

    return (
        <div className={styles.itemsPanel}>
            <div className={styles.itemsToolbar}>
                <span className={styles.itemsCount}>
                    <LuList size={12} />
                    {loading ? '…' : t('items_count', { n: items.length, defaultValue: '{{n}} آیتم' })}
                </span>
                <span className={styles.itemsSearch}>
                    <LuSearch size={11} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('items_search_placeholder', { defaultValue: 'جستجو…' })}
                        aria-label={t('items_search_placeholder', { defaultValue: 'جستجو…' })}
                    />
                </span>
                <button
                    type="button"
                    className={styles.iconBtn}
                    title={t('elements_retry')}
                    aria-label={t('elements_retry')}
                    onClick={() => readItems()}
                >
                    <LuRefreshCw size={12} />
                </button>
            </div>

            <p className={styles.itemsHint}>
                <LuMousePointerClick size={11} />
                {t('items_hint', { defaultValue: 'با کلیک روی هر آیتم، در پیش‌نمایش هایلایت و ویرایشگرش در تب «المان‌ها» باز می‌شود.' })}
            </p>

            {loading && items.length === 0 && (
                <div className={styles.panelEmpty}>{t('elements_loading')}</div>
            )}

            {!loading && items.length === 0 && (
                <div className={styles.panelEmpty}>
                    {singleMode === false
                        ? t('items_need_single', { defaultValue: 'برای دیدن آیتم‌ها، کات را در حالت «تک‌کات» باز کنید.' })
                        : t('elements_none')}
                </div>
            )}

            {filtered.map((item, index) => {
                const custom = Object.prototype.hasOwnProperty.call(overrides, item.id);
                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`${styles.itemRow} ${focusElementId === item.id ? styles.itemRowActive : ''}`}
                        onMouseEnter={() => showHighlight(item.id)}
                        onMouseLeave={() => showHighlight(null)}
                        onFocus={() => showHighlight(item.id)}
                        onBlur={() => showHighlight(null)}
                        onClick={() => onEditElement(item.id)}
                        title={t('items_open_in_elements', { defaultValue: 'ویرایش در تب المان‌ها' })}
                    >
                        <span className={styles.itemRowIndex}>{index + 1}</span>
                        <span className={styles.itemRowMain}>
                            <span className={styles.itemRowLabel}>
                                <TypeIcon type={item.type} />
                                {item.label}
                                {custom && <em className={styles.itemRowCustom}>{t('items_custom_badge', { defaultValue: 'سفارشی' })}</em>}
                            </span>
                            <span className={styles.itemRowValue}>
                                {item.type === 'color' && /^#[0-9a-fA-F]{3,8}$/.test(valuePreview(item)) && (
                                    <i style={{ background: valuePreview(item) }} />
                                )}
                                {valuePreview(item)}
                            </span>
                        </span>
                    </button>
                );
            })}

            {!loading && items.length > 0 && filtered.length === 0 && (
                <div className={styles.panelEmpty}>{t('items_no_match', { defaultValue: 'آیتمی با این نام پیدا نشد.' })}</div>
            )}
        </div>
    );
}

export default ItemsListPanel;
