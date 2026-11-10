// app/error.js - Error boundary
'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { etr } from '@my-workspace/utils';
import { HoshetonError } from '@/app/lib/errors';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    const { t } = useTranslation('common');

    // خطاهای رندر React به پایش خطا گزارش شوند (boundary ها از هندلر سراسری عبور نمی‌کنند)
    useEffect(() => {
        console.error('[ErrorBoundary]', error);
        etr.capture(error, 'fatal');
    }, [error]);

    return (
        <HoshetonError error={error}>
            {(e) => (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h2>{e.title}</h2>
                    <p>{e.message}</p>
                    <button onClick={reset}>{t('retry')}</button>
                </div>
            )}
        </HoshetonError>
    );
}
