'use client';

import {useCallback, useEffect, useState} from 'react';
import {ErrorToaster, toFarsiNumber, MoneySeparator, ConvertGregorianToJalali} from '@my-workspace/utils';
import {LoadingState} from '@my-workspace/components';
import {openforexAdminApi} from '../../lib/openforex-admin-api';
import styles from '../../../(hosheton)/(studio)/projects/nodes/Providers.module.scss';

export default function OpenforexPurchasesLogPage() {
    const [purchases, setPurchases] = useState<Array<Record<string, unknown>>>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await openforexAdminApi.listPurchases({
                status: statusFilter === 'all' ? undefined : statusFilter,
            });
            setPurchases(data.purchases || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <LoadingState/>;

    return (
        <div className={styles.pageContainer}>
            <h1>لاگ خریدهای marketplace</h1>
            <div className={styles.tabs}>
                {['all', 'success', 'failed', 'pending'].map((s) => (
                    <button
                        key={s}
                        className={statusFilter === s ? styles.activeTab : styles.tab}
                        onClick={() => setStatusFilter(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>مبلغ</th>
                        <th>وضعیت</th>
                        <th>درگاه</th>
                        <th>پلن</th>
                        <th>تاریخ</th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((p) => (
                        <tr key={p._id as string}>
                            <td>{toFarsiNumber(MoneySeparator(p.amount as number))}</td>
                            <td>{p.status as string}</td>
                            <td>{(p.gatewayName as string) || '—'}</td>
                            <td>{(p.pricingPlan as string) || '—'}</td>
                            <td>{p.createdAt ? ConvertGregorianToJalali(p.createdAt as string) : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {purchases.length === 0 && <p>خریدی یافت نشد</p>}
        </div>
    );
}
