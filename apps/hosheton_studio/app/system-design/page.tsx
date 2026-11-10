'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SystemDesign from './SystemDesign';

export default function SystemDesignPage() {
    const { t } = useTranslation('systemDesign');

    /* عنوان تب با زبان فعلی — همان الگوی صفحات legal */
    useEffect(() => {
        document.title = t('meta_title');
    }, [t]);

    return <SystemDesign />;
}
