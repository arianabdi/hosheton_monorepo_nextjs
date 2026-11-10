'use client';

/**
 * انتخاب نمای چت (V2 گالری / V1 کلاسیک) — یک select فشرده هم‌شکل دکمه‌های نوار ابزار چت؛
 * انتخاب کاربر per-user ذخیره می‌شود.
 */

import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuLayoutGrid, LuMessagesSquare } from 'react-icons/lu';
import type { ChatView } from './lib/useChatViewPreference';
import styles from './ChatViewSwitcher.module.scss';

export default function ChatViewSwitcher({
    view,
    onChange,
}: {
    view: ChatView;
    onChange: (view: ChatView) => void;
}) {
    const { t } = useTranslation('projects');
    const Icon = view === 'v2' ? LuLayoutGrid : LuMessagesSquare;

    return (
        <label className={styles.switcher} title={t('chat_view_title', { defaultValue: 'نمای چت' })}>
            <Icon size={15} aria-hidden className={styles.icon} />
            <select
                className={styles.select}
                value={view}
                onChange={(event) => onChange(event.target.value as ChatView)}
                aria-label={t('chat_view_title', { defaultValue: 'نمای چت' })}
            >
                <option value="v2">V2 · {t('chat_view_v2', { defaultValue: 'نمای گالری' })}</option>
                <option value="v1">V1 · {t('chat_view_v1', { defaultValue: 'نمای کلاسیک' })}</option>
            </select>
            <span className={styles.value} aria-hidden>{view === 'v2' ? 'V2' : 'V1'}</span>
            <LuChevronDown size={14} aria-hidden className={styles.chevron} />
        </label>
    );
}
