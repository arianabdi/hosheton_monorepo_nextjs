'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight, LuDownload } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import type { DirectAttachment } from '@/app/(marketplace)/lib/types';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './MediaViewer.module.scss';

type Props = {
    items: DirectAttachment[];
    index: number;
    onClose: () => void;
};

/**
 * نمایشگر تمام‌صفحهٔ عکس/ویدیوهای گفتگو — طبق استثنای «پنجره‌های مرور رسانه» در AGENTS.md
 * (`position: fixed; inset: 0` با ModalCloseButton در هدر)، نه ModalHelper.
 * کلیدها: Escape بستن، ←/→ قبلی/بعدی (با جهت RTL).
 */
export function MediaViewer({ items, index, onClose }: Props) {
    const { t, i18n } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const [current, setCurrent] = useState(index);
    const rtl = i18n.dir(i18n.language) === 'rtl';
    const item = items[current];
    const total = items.length;

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
            const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
            if (event.key === forward) setCurrent((i) => Math.min(total - 1, i + 1));
            if (event.key === backward) setCurrent((i) => Math.max(0, i - 1));
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose, rtl, total]);

    if (!item || typeof document === 'undefined') return null;

    return createPortal(
        <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={item.name || t('attachment_image')}>
            <header className={styles.bar}>
                <span className={styles.title} dir="auto">{item.name}</span>
                {total > 1 && (
                    <span className={styles.counter}>
                        {formatAppNumber(current + 1, i18n.language)} / {formatAppNumber(total, i18n.language)}
                    </span>
                )}
                <a className={styles.iconBtn} href={item.url} download={item.name || undefined} target="_blank" rel="noopener noreferrer" aria-label={t('download')}>
                    <LuDownload size={18} />
                </a>
                <ModalCloseButton placement="inline" onClick={onClose} aria-label={tc('close')} />
            </header>

            <div className={styles.stage} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                {item.kind === 'video' ? (
                    <video key={item.url} src={item.url} controls autoPlay playsInline className={styles.media} />
                ) : (
                    <img key={item.url} src={item.url} alt="" className={styles.media} />
                )}

                {current > 0 && (
                    <button type="button" className={`${styles.nav} ${styles.navPrev}`} onClick={() => setCurrent((i) => i - 1)} aria-label={t('viewer_prev')}>
                        {rtl ? <LuChevronRight size={22} /> : <LuChevronLeft size={22} />}
                    </button>
                )}
                {current < total - 1 && (
                    <button type="button" className={`${styles.nav} ${styles.navNext}`} onClick={() => setCurrent((i) => i + 1)} aria-label={t('viewer_next')}>
                        {rtl ? <LuChevronLeft size={22} /> : <LuChevronRight size={22} />}
                    </button>
                )}
            </div>
        </div>,
        document.body,
    );
}
