'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuSearch } from 'react-icons/lu';
import type { ConversationItem } from '@/app/(marketplace)/lib/types';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { DmAvatar } from './DmAvatar';
import styles from '../Messages.module.scss';

const TARGETS_MAX = 10;

type Props = {
    conversations: ConversationItem[];
    count: number;
    onCancel: () => void;
    onSubmit: (targetIds: string[]) => Promise<void>;
};

/** محتوای ModalHelper بازارسال: انتخاب یک یا چند گفتگوی مقصد */
export function ForwardDialog({ conversations, count, onCancel, onSubmit }: Props) {
    const { t, i18n } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return conversations.filter((c) => !q || (c.otherUser?.fullName || '').toLowerCase().includes(q));
    }, [conversations, query]);

    const toggle = (id: string) => {
        setPicked((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            return prev.length >= TARGETS_MAX ? prev : [...prev, id];
        });
    };

    return (
        <div className={`${styles.dialog} ${styles.forwardDialog}`}>
            <h2 className={styles.dialogTitle}>{t('forward_title')}</h2>
            {count > 1 && (
                <p className={styles.dialogText}>{t('selected_count', { count: formatAppNumber(count, lang) as unknown as number })}</p>
            )}
            <div className={`${styles.search} ${styles.forwardSearch}`} role="search">
                <LuSearch size={16} className={styles.searchIcon} aria-hidden />
                <input
                    type="search"
                    className={styles.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('forward_search')}
                    aria-label={t('forward_search')}
                    autoFocus
                />
            </div>
            <ul className={styles.forwardList} role="listbox" aria-multiselectable="true">
                {list.length === 0 && <li className={styles.forwardEmpty}>{t('forward_empty')}</li>}
                {list.map((c) => {
                    const blocked = Boolean(c.blockedByMe || c.blockedMe);
                    const on = picked.includes(c._id);
                    const name = c.otherUser?.fullName || t('user');
                    return (
                        <li key={c._id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={on}
                                className={`${styles.forwardRow} ${on ? styles.forwardRowOn : ''}`}
                                disabled={blocked || busy}
                                onClick={() => toggle(c._id)}
                            >
                                <DmAvatar name={name} src={c.otherUser?.avatar} size="sm" />
                                <span className={styles.forwardName} dir="auto">{name}</span>
                                <span className={`${styles.selectCheck} ${on ? styles.selectCheckOn : ''}`} aria-hidden>
                                    {on && <LuCheck size={13} />}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div className={styles.dialogActions}>
                <button type="button" className={styles.ghostBtn} onClick={onCancel} disabled={busy}>
                    {tc('cancel')}
                </button>
                <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={!picked.length || busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onSubmit(picked);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {picked.length > 1
                        ? t('forward_send_count', { count: formatAppNumber(picked.length, lang) as unknown as number })
                        : t('forward_send')}
                </button>
            </div>
        </div>
    );
}
