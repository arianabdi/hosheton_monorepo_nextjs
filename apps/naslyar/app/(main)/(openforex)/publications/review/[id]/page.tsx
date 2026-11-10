'use client';

import {useState} from 'react';
import {useRouter, useSearchParams, useParams} from 'next/navigation';
import {ErrorToaster, SuccessToaster} from '@my-workspace/utils';
import {Field} from '@my-workspace/components';
import {openforexAdminApi} from '../../../lib/openforex-admin-api';
import styles from '../../../../(hosheton)/(studio)/projects/nodes/Providers.module.scss';

export default function OpenforexPublicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const publicationId = String(params.id || '');
    const botId = searchParams.get('botId') || '';
    const [loading, setLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const approve = async () => {
        try {
            setLoading(true);
            await openforexAdminApi.approvePublication(botId, publicationId);
            SuccessToaster('ربات تایید و منتشر شد');
            router.push('/publications/review');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    };

    const reject = async () => {
        if (!rejectReason.trim()) return;
        try {
            setLoading(true);
            await openforexAdminApi.rejectPublication(publicationId, rejectReason);
            SuccessToaster('درخواست رد شد');
            router.push('/publications/review');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <h1>بررسی درخواست انتشار</h1>
            <p>شناسه: {publicationId}</p>
            <p>ربات: {botId}</p>

            <div className={styles.formGroup} style={{marginTop: 24}}>
                <label>دلیل رد (در صورت نیاز)</label>
                <Field id="reason" name="reason" type="textarea" value={rejectReason}
                       onChange={(e) => setRejectReason(e.target.value)}/>
            </div>

            <div style={{display: 'flex', gap: 12, marginTop: 20}}>
                <button className={styles.primaryBtn} onClick={approve} disabled={loading}>
                    تایید و انتشار
                </button>
                <button className={styles.secondaryBtn} onClick={reject} disabled={loading}>
                    رد درخواست
                </button>
                <button className={styles.secondaryBtn} onClick={() => router.back()}>
                    بازگشت
                </button>
            </div>
        </div>
    );
}
