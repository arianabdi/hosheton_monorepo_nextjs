'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../users/users.module.scss';
import vStyles from '../verification.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import {
    fetchVerificationById,
    revokeUserVerification,
} from '../verification-api';

interface DetailShape {
    verification: Record<string, unknown> | null;
    user: Record<string, unknown> | null;
}

function pick(obj: Record<string, unknown> | null | undefined, key: string): string {
    if (!obj) return '—';
    const value = obj[key];
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
}

function formatDate(value: unknown): string {
    if (!value) return '—';
    try {
        return toFarsiNumber(ConvertDateToCalendarString(String(value)));
    } catch {
        return String(value);
    }
}

function maskCode(code: string): string {
    if (code.length < 7) return code;
    return `${code.slice(0, 4)}${'•'.repeat(Math.max(code.length - 7, 3))}${code.slice(-3)}`;
}

const VerificationDetailPage: React.FC = () => {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DetailShape | null>(null);

    const load = useCallback(async () => {
        if (!token || !params.id) return;
        try {
            setLoading(true);
            const result = await fetchVerificationById(params.id);
            if (!result?.verification) {
                ErrorToaster({ message: 'رکورد یافت نشد' });
                router.push('/verification');
                return;
            }
            setData(result);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [token, params.id, router]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleRevoke = async () => {
        const userId = String(data?.user?._id || data?.verification?.userId || '');
        if (!userId) return;
        if (!confirm('احراز هویت این کاربر لغو شود؟ کاربر باید مجدداً احراز هویت کند.')) return;
        try {
            await revokeUserVerification(userId);
            SuccessToaster({ message: 'احراز هویت کاربر لغو شد' });
            await load();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const verification = (data?.verification || {}) as Record<string, unknown>;
    const user = (data?.user || null) as Record<string, unknown> | null;
    const requestPayload = (verification.requestPayload || null) as Record<string, unknown> | null;
    const responsePayload = (verification.responsePayload || null) as Record<string, unknown> | null;
    const isVerified = verification.status === 'verified';

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>جزئیات احراز هویت</h1>
                        <p className={styles.subtitle}>نتیجه استعلام پلتفرم و اطلاعات حساب کاربر.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button type="button" className={styles.primaryBtn} style={{ background: 'transparent', color: 'var(--brand-color)', border: '1px solid var(--brand-color)' }} onClick={() => router.push('/verification')}>
                            بازگشت به لیست
                        </button>
                    </div>
                </div>

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className={vStyles.rtlBlock}>
                        <div className={vStyles.detailCard}>
                            <h2>نتیجه استعلام</h2>
                            <div className={vStyles.detailGrid}>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>وضعیت</span>
                                    <span className={`${styles.statusBadge} ${isVerified ? styles.approved : styles.pending}`}>
                                        {isVerified ? 'احراز شده' : 'ناموفق'}
                                    </span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>پلتفرم</span>
                                    <span className={vStyles.detailValue}>{pick(verification, 'providerKey')}</span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>موبایل استعلام‌شده</span>
                                    <span className={vStyles.detailValue} style={{ direction: 'ltr' }}>
                                        {toFarsiNumber(pick(verification, 'mobile'))}
                                    </span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>کد ملی استعلام‌شده</span>
                                    <span className={vStyles.detailValue} style={{ direction: 'ltr' }}>
                                        {toFarsiNumber(pick(verification, 'nationalCode'))}
                                    </span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>نام ثبت‌شده</span>
                                    <span className={vStyles.detailValue}>{pick(verification, 'fullName')}</span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>نوع استعلام</span>
                                    <span className={vStyles.detailValue}>
                                        {verification.simulated === true ? 'آزمایشی (سندباکس)' : 'واقعی'}
                                    </span>
                                </div>
                                <div className={vStyles.detailItem}>
                                    <span className={vStyles.detailLabel}>تاریخ</span>
                                    <span className={vStyles.detailValue}>{formatDate(verification.createdAt)}</span>
                                </div>
                                {verification.errorMessage ? (
                                    <div className={vStyles.detailItem}>
                                        <span className={vStyles.detailLabel}>خطا</span>
                                        <span className={vStyles.detailValue}>{pick(verification, 'errorMessage')}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className={vStyles.detailCard}>
                            <h2>حساب کاربر</h2>
                            {user ? (
                                <>
                                    <div className={vStyles.detailGrid}>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>نام</span>
                                            <span className={vStyles.detailValue}>{pick(user, 'fullName')}</span>
                                        </div>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>نام کاربری</span>
                                            <span className={vStyles.detailValue}>{pick(user, 'username')}</span>
                                        </div>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>ایمیل</span>
                                            <span className={vStyles.detailValue} style={{ direction: 'ltr' }}>
                                                {pick(user, 'email')}
                                            </span>
                                        </div>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>موبایل پروفایل</span>
                                            <span className={vStyles.detailValue} style={{ direction: 'ltr' }}>
                                                {pick(user, 'mobile') ? toFarsiNumber(pick(user, 'mobile')) : '—'}
                                            </span>
                                        </div>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>وضعیت احراز فعلی</span>
                                            <span className={`${styles.statusBadge} ${user.identity_verified === true ? styles.approved : styles.pending}`}>
                                                {user.identity_verified === true ? 'احراز شده' : 'احراز نشده'}
                                            </span>
                                        </div>
                                        <div className={vStyles.detailItem}>
                                            <span className={vStyles.detailLabel}>تاریخ تایید</span>
                                            <span className={vStyles.detailValue}>{formatDate(user.identity_verified_at)}</span>
                                        </div>
                                    </div>
                                    {user.identity_verified === true && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <button
                                                type="button"
                                                className={styles.btnDelete}
                                                style={{ padding: '8px 18px', borderRadius: 6, fontSize: '0.8rem' }}
                                                onClick={handleRevoke}
                                            >
                                                لغو احراز هویت کاربر
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p>کاربر یافت نشد.</p>
                            )}
                        </div>

                        <div className={vStyles.detailCard}>
                            <h2>مخیات فنی (ممیزی)</h2>
                            <p className={vStyles.hint}>
                                شماره موبایل درخواستی ماسک شده است؛ پاسخ خام پلتفرم برای بررسی خطاها نگهداری می‌شود.
                            </p>
                            <pre className={vStyles.jsonBox}>
{JSON.stringify({ request: requestPayload ? { ...requestPayload, mobile: maskCode(String(requestPayload.mobile || '')) } : null, response: responsePayload }, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </Wrapper>
        </Container>
    );
};

export default VerificationDetailPage;
