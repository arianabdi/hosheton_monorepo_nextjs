'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    const { t } = useTranslation('usage');

    useEffect(() => {
        router.replace('/usage?tab=stats');
    }, [router]);

    return (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
            {t('redirecting_stats')}
        </div>
    );
}
