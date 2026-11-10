'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TbBook2 } from 'react-icons/tb';
import SimpleLineNav from '@/app/components/SimpleLineNav/SimpleLineNav';
import etr from '../../error-tracking/ErrorTracking.module.scss';
import mk from '../../marketing/Marketing.module.scss';
import { SUBSCRIPTION_TABS } from '../components/tabs';
import styles from '../Subscription.module.scss';

/**
 * شل تب‌های اشتراک: هدر و ناوبری ثابت می‌مانند و فقط محتوای تب (outlet) عوض می‌شود
 * (PageTransition کل این زیرشاخه را یک کلید می‌داند — config/page-shells).
 */
export default function SubscriptionTabsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        <div className={`${etr.container} ${etr.rtl}`}>
            <header className={etr.header}>
                <div>
                    <h1 className={etr.mainTitle}>اشتراک</h1>
                    <p className={etr.subtitle}>
                        پلن‌ها، سقف‌ها و قیمت‌های اپ فعلی؛ اشتراک کاربران و مصرفشان. همهٔ اپ‌ها از همین ماژول استفاده می‌کنند و
                        هر اپ ویژگی‌های خودش را در کد تعریف می‌کند — شما فقط مقدار هر پلن را تعیین می‌کنید.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/subscription/docs" className={mk.secondaryBtn}>
                        <TbBook2 size={16} /> مستندات
                    </Link>
                </div>
            </header>

            <SimpleLineNav items={SUBSCRIPTION_TABS} activeHref={pathname} />
            <div className={etr.outlet}>{children}</div>
        </div>
    );
}
