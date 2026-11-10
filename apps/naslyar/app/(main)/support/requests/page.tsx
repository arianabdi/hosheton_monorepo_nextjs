'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import AvatarReviewListPage from '@/app/(main)/(hosheton)/(studio)/avatars/review/page';
import TemplateReviewListPage from '@/app/(main)/(hosheton)/(studio)/projects/templates/review/page';
import CreatorSettlementsList from '@/app/(main)/billing/creator-settlements/CreatorSettlementsList';
import styles from '../Support.module.scss';

const REQUEST_TABS = [
    { id: 'avatar', label: 'تایید آواتار' },
    { id: 'template', label: 'تایید قالب' },
    { id: 'settlements', label: 'تسویه creators' },
] as const;

type RequestTabId = (typeof REQUEST_TABS)[number]['id'];

const TAB_COPY: Record<RequestTabId, { title: string; subtitle: string }> = {
    avatar: {
        title: 'درخواست‌ها',
        subtitle: 'صف تایید آواتار استودیو — درخواست‌های در انتظار را بررسی و تایید یا رد کنید.',
    },
    template: {
        title: 'درخواست‌ها',
        subtitle: 'صف تایید قالب استودیو — قالب‌های ارسال‌شده را بررسی، ویرایش یا منتشر کنید.',
    },
    settlements: {
        title: 'درخواست‌ها',
        subtitle: 'درخواست‌های تسویه creatorها از کیف پول فروش. مبلغ از زمان ثبت تا تسویه رزرو می‌شود.',
    },
};

function parseTab(value: string | null): RequestTabId {
    if (value === 'template' || value === 'settlements' || value === 'avatar') return value;
    return 'avatar';
}

function SupportRequestsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = parseTab(searchParams.get('tab'));
    const copy = TAB_COPY[activeTab];

    const setActiveTab = (id: string) => {
        router.replace(`/support/requests?tab=${id}`, { scroll: false });
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>{copy.title}</h1>
                    <p className={styles.subtitle}>{copy.subtitle}</p>
                </div>
            </header>

            <SimpleLineTabs tabs={[...REQUEST_TABS]} activeTab={activeTab} onChange={setActiveTab} />

            <div role="tabpanel">
                {activeTab === 'avatar' && <AvatarReviewListPage embedded />}
                {activeTab === 'template' && <TemplateReviewListPage embedded />}
                {activeTab === 'settlements' && <CreatorSettlementsList embedded />}
            </div>
        </div>
    );
}

export default function SupportRequestsPage() {
    return (
        <Container>
            <Wrapper>
                <Suspense fallback={<LoadingState />}>
                    <SupportRequestsContent />
                </Suspense>
            </Wrapper>
        </Container>
    );
}
