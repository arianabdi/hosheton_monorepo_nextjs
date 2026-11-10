'use client';

import {useCallback, useEffect, useState} from 'react';
import {ErrorToaster, SuccessToaster, toFarsiNumber, MoneySeparator} from '@my-workspace/utils';
import {LoadingState} from '@my-workspace/components';
import {openforexAdminApi} from '../../lib/openforex-admin-api';
import styles from '../../../(hosheton)/(studio)/projects/nodes/Providers.module.scss';

export default function OpenforexCommentsReviewPage() {
    const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await openforexAdminApi.listComments({status: 'pending'});
            setComments(data.comments || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function review(id: string, status: string) {
        try {
            await openforexAdminApi.reviewComment(id, status);
            SuccessToaster(status === 'approved' ? 'نظر تایید شد' : 'نظر رد شد');
            load();
        } catch (e) {
            ErrorToaster(e);
        }
    }

    if (loading) return <LoadingState/>;

    return (
        <div className={styles.pageContainer}>
            <h1>بررسی نظرات marketplace</h1>
            {comments.map((c) => (
                <div key={c._id as string} className={styles.card} style={{marginBottom: 16, padding: 16}}>
                    <p>{c.content as string}</p>
                    <small>امتیاز: {toFarsiNumber(c.rating as number || 0)}</small>
                    <div style={{marginTop: 12, display: 'flex', gap: 8}}>
                        <button className={styles.primaryBtn} onClick={() => review(c._id as string, 'approved')}>
                            تایید
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => review(c._id as string, 'rejected')}>
                            رد
                        </button>
                    </div>
                </div>
            ))}
            {comments.length === 0 && <p>نظر در انتظاری وجود ندارد</p>}
        </div>
    );
}
