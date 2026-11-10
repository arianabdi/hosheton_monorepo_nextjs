'use client';

import type { Entitlement } from '../lib/subscription-api';
import { formatAmount, fa } from '../lib/format';
import styles from '../Subscription.module.scss';

/** مصرف یک ویژگی: «۳ از ۵ پروژه» + نوار؛ نامحدود / باز / قفل / سقف هر مورد */
export default function UsageMeter({ entitlement }: { entitlement: Entitlement }) {
    const { mode, unit } = entitlement;

    if (mode === 'switch') {
        return <span className={entitlement.allowed ? styles.ok : styles.bad}>{entitlement.allowed ? 'باز' : 'قفل'}</span>;
    }
    if (entitlement.unlimited) {
        return (
            <span>
                نامحدود
                {mode !== 'cap' ? <span className={styles.muted}> · مصرف {formatAmount(entitlement.used, unit)}</span> : null}
            </span>
        );
    }
    const limit = Number(entitlement.limit) || 0;
    if (mode === 'cap') return <span>حداکثر {formatAmount(limit, unit)}</span>;

    const percent = limit > 0 ? Math.min(100, Math.round((entitlement.used / limit) * 100)) : 100;
    const level = percent >= 100 ? styles.usageFull : percent >= 80 ? styles.usageHigh : '';
    return (
        <div className={styles.usage}>
            <span>
                {formatAmount(entitlement.used, '')} از {formatAmount(limit, unit)}
                {entitlement.resetsAt ? (
                    <span className={styles.muted}> · پر می‌شود {new Date(entitlement.resetsAt).toLocaleDateString('fa-IR')}</span>
                ) : null}
            </span>
            <div className={`${styles.usageBar} ${level}`} title={`${fa(percent)}٪`}>
                <span style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
