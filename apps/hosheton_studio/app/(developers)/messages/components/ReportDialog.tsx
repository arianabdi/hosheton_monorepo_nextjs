'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MessageReportReason } from '@/app/(marketplace)/lib/types';
import styles from '../Messages.module.scss';

const REASONS: MessageReportReason[] = ['spam', 'harassment', 'scam', 'inappropriate', 'other'];
const DETAILS_MAX = 1000;

type Props = {
    name: string;
    /** متن پیامی که گزارش می‌شود (گزارش از منوی ⋯ پیام) */
    messagePreview?: string;
    alreadyBlocked: boolean;
    onCancel: () => void;
    onSubmit: (payload: { reason: MessageReportReason; details: string; block: boolean }) => Promise<void>;
};

/** محتوای ModalHelper گزارش تخلف — دلیل، توضیح (برای «سایر» الزامی) و مسدودسازی هم‌زمان */
export function ReportDialog({ name, messagePreview, alreadyBlocked, onCancel, onSubmit }: Props) {
    const { t } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const [reason, setReason] = useState<MessageReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [block, setBlock] = useState(!alreadyBlocked);
    const [busy, setBusy] = useState(false);
    const [touched, setTouched] = useState(false);

    const detailsMissing = reason === 'other' && !details.trim();
    const valid = Boolean(reason) && !detailsMissing;

    return (
        <form
            className={styles.dialog}
            onSubmit={async (e) => {
                e.preventDefault();
                setTouched(true);
                if (!valid || !reason) return;
                setBusy(true);
                try {
                    await onSubmit({ reason, details: details.trim(), block: !alreadyBlocked && block });
                } finally {
                    setBusy(false);
                }
            }}
        >
            <h2 className={styles.dialogTitle}>{t('report_title', { name })}</h2>
            <p className={styles.dialogText}>{t('report_hint')}</p>
            {messagePreview && <blockquote className={styles.dialogQuote} dir="auto">{messagePreview}</blockquote>}

            <fieldset className={styles.reasonList}>
                <legend className={styles.srOnly}>{t('report_reason')}</legend>
                {REASONS.map((key) => (
                    <label key={key} className={`${styles.reasonOption} ${reason === key ? styles.reasonOptionActive : ''}`}>
                        <input type="radio" name="report-reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
                        <span>{t(`reason_${key}`)}</span>
                    </label>
                ))}
            </fieldset>
            {touched && !reason && <p className={styles.fieldError}>{t('report_reason_required')}</p>}

            <label className={styles.dialogField}>
                <span>{t('report_details')}</span>
                <textarea
                    value={details}
                    maxLength={DETAILS_MAX}
                    rows={3}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={t('report_details_placeholder')}
                />
            </label>
            {touched && detailsMissing && <p className={styles.fieldError}>{t('report_details_required')}</p>}

            {!alreadyBlocked && (
                <label className={styles.checkRow}>
                    <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
                    <span>{t('report_also_block')}</span>
                </label>
            )}

            <div className={styles.dialogActions}>
                <button type="button" className={styles.ghostBtn} onClick={onCancel} disabled={busy}>{tc('cancel')}</button>
                <button type="submit" className={styles.dangerBtn} disabled={busy}>
                    {busy ? t('report_sending') : t('report_submit')}
                </button>
            </div>
        </form>
    );
}
