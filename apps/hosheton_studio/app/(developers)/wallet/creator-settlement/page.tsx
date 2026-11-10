'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuChevronRight } from 'react-icons/lu';
import SalesWalletPanel from '../../templates/analytics/SalesWalletPanel';
import styles from './CreatorSettlementPage.module.scss';

function CreatorSettlementContent() {
    const { t } = useTranslation('marketplace');
    const searchParams = useSearchParams();
    // ?request=1 → the request form opens automatically (deep-link target of the settlement buttons)
    const autoOpenRequest = searchParams.get('request') === '1';

    return (
        <div className={styles.wrap}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('creator_settlement_page_title')}</h1>
                    <p className={styles.subtitle}>{t('creator_settlement_page_subtitle')}</p>
                </div>
                <Link href="/wallet" className={styles.backLink}>
                    <LuChevronRight size={14} />
                    {t('back_to_wallet')}
                </Link>
            </header>

            <SalesWalletPanel autoOpenRequest={autoOpenRequest} />
        </div>
    );
}

export default function CreatorSettlementPage() {
    return (
        <Suspense fallback={null}>
            <CreatorSettlementContent />
        </Suspense>
    );
}
