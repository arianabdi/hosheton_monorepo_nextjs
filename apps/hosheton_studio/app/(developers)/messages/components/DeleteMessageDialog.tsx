'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from '../Messages.module.scss';

type Props = {
    preview: string;
    /** حذف چندتایی از نوار انتخاب */
    count?: number;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
};

/** محتوای ModalHelper تأیید حذف پیام (برگشت‌ناپذیر) */
export function DeleteMessageDialog({ preview, count = 1, onCancel, onConfirm }: Props) {
    const { t, i18n } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const [busy, setBusy] = useState(false);

    return (
        <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>
                {count > 1
                    ? t('delete_selected_title', { count: formatAppNumber(count, i18n.language) as unknown as number })
                    : t('delete_confirm_title')}
            </h2>
            <p className={styles.dialogText}>{t('delete_confirm_body')}</p>
            <blockquote className={styles.dialogQuote} dir="auto">{preview}</blockquote>
            <div className={styles.dialogActions}>
                <button type="button" className={styles.ghostBtn} onClick={onCancel} disabled={busy}>
                    {tc('cancel')}
                </button>
                <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onConfirm();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {busy ? t('deleting') : t('delete_message')}
                </button>
            </div>
        </div>
    );
}
