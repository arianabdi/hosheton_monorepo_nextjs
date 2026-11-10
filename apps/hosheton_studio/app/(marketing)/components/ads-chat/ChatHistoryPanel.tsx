'use client';

import { useTranslation } from 'react-i18next';
import { LuArrowRight, LuMessageSquareText, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { ChatSession } from './ads-chat-history';
import styles from './ads-chat.module.scss';

// ────────────────────────────── Types ──────────────────────────────

interface ChatHistoryPanelProps {
    sessions: ChatSession[];
    /** گفتگویی که الان در چت باز است — با نشان «فعلی» متمایز می‌شود */
    currentSessionId: string | null;
    onOpen(sessionId: string): void;
    onDelete(sessionId: string): void;
    onNew(): void;
    onBack(): void;
}

// ────────────────────────────── Component ──────────────────────────────

/**
 * تاریخچه‌ی چت پروژه‌ی فعال — با دکمه‌ی هدر سایدبار باز می‌شود و به‌جای نمای
 * چت در همان سایدبار رندر می‌شود. انتخاب هر آیتم همان گفتگو را در چت برمی‌گرداند.
 */
export default function ChatHistoryPanel({
    sessions,
    currentSessionId,
    onOpen,
    onDelete,
    onNew,
    onBack,
}: ChatHistoryPanelProps) {
    const { t } = useTranslation('adsVideo');

    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.historyPanel}>
            <div className={styles.historyHead}>
                <h3>{t('chat_history_title', { defaultValue: 'تاریخچه‌ی چت پروژه' })}</h3>
                <div className={styles.historyHeadActions}>
                    <button type="button" className={styles.historyNewBtn} onClick={onNew}>
                        <LuPlus size={13} />
                        <span>{t('chat_history_new', { defaultValue: 'چت جدید' })}</span>
                    </button>
                    <button
                        type="button"
                        className={styles.historyBackBtn}
                        onClick={onBack}
                        aria-label={t('chat_history_back', { defaultValue: 'بازگشت به چت' })}
                        title={t('chat_history_back', { defaultValue: 'بازگشت به چت' })}
                    >
                        <LuArrowRight size={14} />
                    </button>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div className={styles.historyEmpty}>
                    {t('chat_history_empty', { defaultValue: 'هنوز گفتگویی برای این پروژه ثبت نشده است.' })}
                </div>
            ) : (
                <div className={styles.historyList}>
                    {sessions.map((session) => {
                        const messages = session.entries.filter((entry) => entry.role !== 'system').length;
                        return (
                            <div
                                key={session.id}
                                role="button"
                                tabIndex={0}
                                className={`${styles.historyItem} ${session.id === currentSessionId ? styles.historyItemCurrent : ''}`}
                                onClick={() => onOpen(session.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onOpen(session.id);
                                    }
                                }}
                            >
                                <LuMessageSquareText size={15} />
                                <span className={styles.historyItemBody}>
                                    <span className={styles.historyItemTitle} title={session.title}>
                                        {session.title || t('chat_history_untitled', { defaultValue: 'گفتگوی بدون عنوان' })}
                                    </span>
                                    <span className={styles.historyItemMeta}>
                                        {t('chat_history_msgs', { n: messages, defaultValue: '{{n}} پیام' })}
                                        {' · '}
                                        {formatDate(session.updatedAt)}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    className={styles.historyItemDelete}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete(session.id);
                                    }}
                                    aria-label={t('chat_history_delete', { defaultValue: 'حذف گفتگو' })}
                                    title={t('chat_history_delete', { defaultValue: 'حذف گفتگو' })}
                                >
                                    <LuTrash2 size={13} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
