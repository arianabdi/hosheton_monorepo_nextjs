'use client';

import { useEffect, useState } from 'react';
import { LoadingState, ModalHelper } from '@my-workspace/components';
import { ErrorToaster } from '@my-workspace/utils';
import { subscriptionApi, type UserEntitlements } from '../lib/subscription-api';
import { fullDate } from '../../error-tracking/lib/format';
import { userLabel } from '../lib/format';
import UsageMeter from './UsageMeter';
import styles from '../Subscription.module.scss';

function Content({ userId }: { userId: string }) {
    const [data, setData] = useState<UserEntitlements | null>(null);

    useEffect(() => {
        subscriptionApi.userEntitlements(userId).then(setData).catch(ErrorToaster);
    }, [userId]);

    if (!data) return <LoadingState />;
    const plan = data.subscription?.planId;

    return (
        <div className={styles.dialog} dir="rtl">
            <div className={styles.dialogHeader}>
                <h3>{userLabel(data.user)}</h3>
                <p>
                    {data.subscription ? (
                        <>
                            پلن «{plan?.name || '—'}» تا {fullDate(data.subscription.endsAt)}
                            {data.subscription.isTest ? ' · خرید آزمایشی' : ''}
                        </>
                    ) : data.willGetDefaultPlan ? (
                        <>اشتراک فعال ندارد؛ با اولین استفاده روی پلن «{data.willGetDefaultPlan}» می‌رود.</>
                    ) : (
                        <>اشتراک فعال ندارد و پلن پیش‌فرضی هم تعریف نشده — به بخش‌های محدود دسترسی ندارد.</>
                    )}
                </p>
            </div>
            {data.entitlements.length ? (
                <ul className={styles.entList}>
                    {data.entitlements.map((e) => (
                        <li key={e.code} className={styles.entItem}>
                            <span>
                                {e.name}
                                {e.fromDefault ? <span className={styles.muted}> · مقدار پیش‌فرض</span> : null}
                            </span>
                            <UsageMeter entitlement={e} />
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

/** سهمیه و مصرف لحظه‌ای یک کاربر (پشتیبانی: «چرا نمی‌توانم …؟») — بدون تغییر چیزی */
export default function UserEntitlementsDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
    return (
        <ModalHelper
            open={!!userId}
            onClose={onClose}
            size="md"
            sheetTitle="سهمیه و مصرف کاربر"
            component={userId ? <Content userId={userId} /> : null}
        />
    );
}
