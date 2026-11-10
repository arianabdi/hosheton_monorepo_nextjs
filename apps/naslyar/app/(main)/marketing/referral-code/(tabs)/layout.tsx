'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import SimpleLineNav from '@/app/components/SimpleLineNav/SimpleLineNav';
import { REFERRAL_TABS, referralHref } from '../lib/sections';
import parentStyles from '../../Marketing.module.scss';

/**
 * شل تب‌های کد معرف: هدر و ناوبری ثابت می‌مانند و فقط محتوای تب عوض می‌شود؛
 * آدرس‌بار با هر تب تغییر می‌کند (config/page-shells کل زیرشاخه را یک کلید انیمیشن می‌داند).
 */
export default function ReferralTabsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کد معرف (دعوت دوستان)</h1>
                            <p className={parentStyles.subtitle}>
                                کاربران با لینک دعوت اختصاصی دوستانشان را به استودیو می‌آورند و طبق قوانین کمپین فعال پاداش
                                می‌گیرند؛ پاداش بعد از تأیید به کیف پول فروش (تومانی) دعوت‌کننده واریز می‌شود.
                            </p>
                        </div>
                        <Link href={referralHref.newCampaign} className={parentStyles.primaryBtn}>
                            <LuPlus /> کمپین جدید
                        </Link>
                    </header>
                    <SimpleLineNav items={REFERRAL_TABS} activeHref={pathname} />
                    {children}
                </div>
            </Wrapper>
        </Container>
    );
}
