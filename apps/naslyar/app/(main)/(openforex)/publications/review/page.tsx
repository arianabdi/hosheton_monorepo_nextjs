'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LuRefreshCw} from 'react-icons/lu';
import {ErrorToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState} from '@my-workspace/components';
import {openforexAdminApi, PublicationItem} from '../../lib/openforex-admin-api';
import styles from '../../../(hosheton)/(studio)/projects/nodes/Providers.module.scss';


type StatusFilter = 'pending' | 'rejected' | 'approved' | 'all';

const STATUS_TABS: {id: StatusFilter; label: string}[] = [
    {id: 'pending', label: 'در انتظار'},
    {id: 'rejected', label: 'رد شده'},
    {id: 'approved', label: 'تایید شده'},
    {id: 'all', label: 'همه'},
];

export default function OpenforexPublicationReviewPage() {
    const router = useRouter();
    const [items, setItems] = useState<PublicationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await openforexAdminApi.listPublications();
            const filtered = statusFilter === 'all'
                ? data
                : data.filter((p) => p.status === statusFilter);
            setItems(filtered);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1>بررسی درخواست انتشار ربات</h1>
                <button className={styles.secondaryBtn} onClick={load}>
                    <LuRefreshCw size={16}/> بروزرسانی
                </button>
            </div>

            <div className={styles.tabs}>
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={statusFilter === tab.id ? styles.activeTab : styles.tab}
                        onClick={() => setStatusFilter(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <LoadingState/> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>نام ربات</th>
                            <th>وضعیت</th>
                            <th>تاریخ</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item._id}>
                                <td>{(item.extras as {name?: string})?.name || item.entityId}</td>
                                <td>{item.status}</td>
                                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : '—'}</td>
                                <td>
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => router.push(`/publications/review/${item._id}?botId=${item.entityId}`)}
                                    >
                                        بررسی
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {!loading && items.length === 0 && (
                <p className={styles.emptyText}>درخواستی یافت نشد ({toFarsiNumber(items.length)})</p>
            )}
        </div>
    );
}
