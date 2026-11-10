'use client';

import { Trans, useTranslation } from 'react-i18next';
import styles from '../avatars.module.scss';

function qrImageUrl(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;
}

export function VerificationQrPanel({ verificationUrl }: { verificationUrl: string }) {
    const { t } = useTranslation('avatars');

    return (
        <div className={styles.qrPanel}>
            <img
                src={qrImageUrl(verificationUrl)}
                alt={t('qr_title')}
                className={styles.qrImage}
                width={220}
                height={220}
            />
            <p className={styles.qrHint}>
                <Trans
                    i18nKey="qr_hint"
                    ns="avatars"
                    components={{
                        link: (
                            <a href={verificationUrl} target="_blank" rel="noopener noreferrer" />
                        ),
                    }}
                />
            </p>
        </div>
    );
}
