'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMinimize2 } from 'react-icons/lu';
import {
    getChatImageOptimizePreference,
    setChatImageOptimizePreference,
    type ChatImageOptimizePreference,
} from '@/app/(developers)/projects/lib/chat-image-optimize';
import styles from './ChatInput.module.scss';

/**
 * ترجیح «بهینه‌سازی عکس» کاربر — یک بار از سرور خوانده می‌شود و بین منوهای افزودن
 * (کادر اصلی و اسلات‌های مود) مشترک است.
 */
let preference: ChatImageOptimizePreference | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function ensureLoaded() {
    if (preference || loading) return;
    loading = getChatImageOptimizePreference()
        .then((value) => {
            preference = value;
            emit();
        })
        .catch(() => undefined)
        .finally(() => {
            loading = null;
        });
}

async function toggle() {
    if (!preference?.available) return;
    const previous = preference;
    preference = { ...previous, enabled: !previous.enabled };
    emit();
    try {
        preference = await setChatImageOptimizePreference(preference.enabled);
    } catch {
        preference = previous;
    }
    emit();
}

/** ردیف کلید داخل منوی «+» — فقط وقتی ادمین بهینه‌سازی را فعال کرده نمایش داده می‌شود. */
export default function ImageOptimizeToggle() {
    const { t } = useTranslation('projects');
    const value = useSyncExternalStore(subscribe, () => preference, () => null);

    useEffect(() => {
        ensureLoaded();
    }, []);

    if (!value?.available) return null;

    return (
        <>
            <span className={styles.addMenuDivider} aria-hidden />
            <button
                type="button"
                role="switch"
                aria-checked={value.enabled}
                className={`${styles.addMenuItem} ${styles.addMenuToggle}`}
                onClick={() => void toggle()}
            >
                <LuMinimize2 />
                <span className={styles.addMenuToggleText}>
                    <span>{t('chat_image_optimize')}</span>
                    <small>{t('chat_image_optimize_hint', { px: value.maxEdgePx })}</small>
                </span>
                <span className={`${styles.switch} ${value.enabled ? styles.switchOn : ''}`} aria-hidden />
            </button>
        </>
    );
}
