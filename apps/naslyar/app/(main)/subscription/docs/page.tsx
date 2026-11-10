'use client';

import { DocPage, DocTopicIndex } from '@/app/components/DocLayout/DocLayout';
import { SUB_DOC_TOPICS, SUB_DOCS_BASE } from './topics';

export default function SubscriptionDocsPage() {
    return (
        <DocPage
            title="مستندات اشتراک"
            lead="اشتراک برای همهٔ اپ‌های مونوریپو است: مفاهیم و نوع‌های سنجش، راهنمای ادمین و چک‌لیست لانچ، اتصال اپ و افزودن محدودیت در کد، مرجع API و یکپارچه‌سازی‌های فعلی."
            back={{ href: '/subscription', label: '← اشتراک' }}
        >
            <DocTopicIndex topics={SUB_DOC_TOPICS} basePath={SUB_DOCS_BASE} />
        </DocPage>
    );
}
