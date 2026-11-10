'use client';

import { DocPage, DocTopicIndex } from '@/app/components/DocLayout/DocLayout';
import { ETR_DOC_TOPICS, ETR_DOCS_BASE } from './topics';

export default function ErrorTrackingDocsPage() {
    return (
        <DocPage
            title="مستندات پایش خطا"
            lead="پایش خطا برای همهٔ اپ‌های مونوریپو است: اتصال یک API یا وب‌اپ، Scope و Breadcrumb، ثبت درخواست‌های ناموفق به سرویس‌های بیرونی، کار با پنل و مرجع API. هر موضوع را باز کنید."
            back={{ href: '/error-tracking', label: '← پایش خطا' }}
        >
            <DocTopicIndex topics={ETR_DOC_TOPICS} basePath={ETR_DOCS_BASE} />
        </DocPage>
    );
}
