'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../Messages.module.scss';

type Props = {
    name: string;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
};

/** محتوای ModalHelper تأیید مسدودسازی */
export function BlockDialog({ name, onCancel, onConfirm }: Props) {
    const { t } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const [busy, setBusy] = useState(false);

    return (
        <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>{t('block_confirm_title', { name })}</h2>
            <p className={styles.dialogText}>{t('block_confirm_body')}</p>
            <div className={styles.dialogActions}>
                <button type="button" className={styles.ghostBtn} onClick={onCancel} disabled={busy}>{tc('cancel')}</button>
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
                    {t('block_user')}
                </button>
            </div>
        </div>
    );
}
