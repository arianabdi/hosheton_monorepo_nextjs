'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { avatarReviewApi, type AvatarReviewDetail } from '../../../lib/avatar-review-api';
import styles from '../../../projects/nodes/Providers.module.scss';

function formatDate(value?: string) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('fa-IR');
    } catch {
        return value;
    }
}

export default function AvatarReviewDetailPage() {
    const params = useParams();
    const router = useRouter();
    const avatarId = String(params.id || '');

    const [avatar, setAvatar] = useState<AvatarReviewDetail | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiKeyId, setApiKeyId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await avatarReviewApi.getById(avatarId);
            setAvatar(data);
            // Prefill Access Key ID from DB; keep secret blank if already saved
            setApiKeyId(data.savedAccessKeyId || '');
            setApiKey('');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [avatarId]);

    useEffect(() => {
        if (avatarId) load();
    }, [avatarId, load]);

    const hasSavedCreds = !!(avatar?.hasSavedSecret && (avatar?.hasSavedAccessKey || apiKeyId.trim()));

    const handleRetry = async () => {
        if (!apiKeyId.trim() && !hasSavedCreds) {
            ErrorToaster({ message: 'Access Key ID (AK) لازم است.' });
            return;
        }
        if (!apiKey.trim() && !avatar?.hasSavedSecret) {
            ErrorToaster({ message: 'Secret Access Key (SK) لازم است (یا از قبل ذخیره شده باشد).' });
            return;
        }

        try {
            setSubmitting(true);
            const data = await avatarReviewApi.retryByteplus(avatarId, {
                accessKeyId: apiKeyId.trim() || undefined,
                secretAccessKey: apiKey.trim() || undefined,
                apiKeyId: apiKeyId.trim() || undefined,
                apiKey: apiKey.trim() || undefined,
            });
            setAvatar(data);
            setApiKey('');
            SuccessToaster({ message: 'BytePlus پاسخ داد — لینک H5 برای کاربر آماده شد و اعلان ارسال شد.' });
        } catch (error) {
            ErrorToaster(error);
            await load();
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async (status: 'approved' | 'rejected') => {
        if (status === 'approved') {
            if (!apiKeyId.trim() && !hasSavedCreds) {
                ErrorToaster({ message: 'Access Key ID (AK) لازم است.' });
                return;
            }
            if (!apiKey.trim() && !avatar?.hasSavedSecret) {
                ErrorToaster({ message: 'Secret Access Key لازم است یا باید قبلاً ذخیره شده باشد.' });
                return;
            }
        }

        try {
            setSubmitting(true);
            await avatarReviewApi.review(avatarId, {
                status,
                reviewNote: reviewNote.trim() || undefined,
                accessKeyId: apiKeyId.trim() || undefined,
                secretAccessKey: apiKey.trim() || undefined,
                apiKeyId: apiKeyId.trim() || undefined,
                apiKey: apiKey.trim() || undefined,
            });
            SuccessToaster({
                message:
                    status === 'approved'
                        ? 'کلید ذخیره شد و احراز هویت فعال شد'
                        : 'درخواست رد شد و به کاربر اطلاع داده شد',
            });
            router.push('/avatars/review');
        } catch (error) {
            ErrorToaster(error);
            await load();
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!avatar) return <div className={styles.card}>آواتار یافت نشد.</div>;

    const isPending = avatar.adminReviewStatus === 'pending';

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>بررسی آواتار: {avatar.name}</h1>
                    <p className={styles.subtitle}>
                        {isPending
                            ? 'API Key BytePlus را در بخش حساب‌ها بررسی کنید، سپس تایید یا رد کنید.'
                            : 'جزئیات درخواست بررسی‌شده'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link href="/accounts" className={styles.secondaryBtn} target="_blank">
                        مدیریت حساب‌های Provider
                    </Link>
                    <Link href="/avatars/review" className={styles.secondaryBtn}>
                        بازگشت به لیست
                    </Link>
                </div>
            </header>

            <div className={styles.card}>
                <p>
                    <strong>کاربر:</strong>{' '}
                    {avatar.owner?.fullName || avatar.owner?.email || avatar.owner?.username || avatar.userId}
                </p>
                <p>
                    <strong>ایمیل:</strong> {avatar.owner?.email || '—'}
                </p>
                <p>
                    <strong>وضعیت:</strong> {avatar.status}
                </p>
                <p>
                    <strong>وضعیت بررسی ادمین:</strong> {avatar.adminReviewStatus}
                </p>
                <p>
                    <strong>ارسال به ادمین:</strong> {formatDate(avatar.submittedForAdminAt)}
                </p>
                {avatar.reviewedAt && (
                    <p>
                        <strong>بررسی:</strong> {formatDate(avatar.reviewedAt)}
                    </p>
                )}
                {avatar.reviewNote && (
                    <p>
                        <strong>یادداشت بررسی:</strong> {avatar.reviewNote}
                    </p>
                )}
                {avatar.lastByteplusError && (
                    <div style={{ marginTop: '1rem', padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)' }}>
                        <strong>آخرین خطای BytePlus:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{avatar.lastByteplusError}</pre>
                    </div>
                )}

                {(avatar.sourceImageUrls || []).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>عکس‌های character sheet:</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 8 }}>
                            {avatar.sourceImageUrls!.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt=""
                                    style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {avatar.byteplusApiKeyPreview && (
                    <p style={{ marginTop: '1rem' }}>
                        <strong>SK ذخیره‌شده:</strong> {avatar.byteplusApiKeyPreview}
                        {avatar.byteplusApiKeyIdPreview ? ` — AK: ${avatar.byteplusApiKeyIdPreview}` : ''}
                    </p>
                )}

                {avatar.providerAccount && (
                    <p style={{ marginTop: '1rem' }}>
                        <strong>حساب fallback:</strong> {avatar.providerAccount.name} ({avatar.providerAccount._id})
                    </p>
                )}

                {avatar.verificationUrl && (
                    <p style={{ marginTop: '1rem' }}>
                        <strong>لینک H5:</strong>{' '}
                        <a href={avatar.verificationUrl} target="_blank" rel="noopener noreferrer">
                            باز کردن
                        </a>
                    </p>
                )}

                {isPending && (
                    <>
                        <div
                            style={{
                                marginTop: '1.5rem',
                                padding: 12,
                                borderRadius: 8,
                                background: 'rgba(251, 191, 36, 0.1)',
                            }}
                        >
                            <strong>مهم:</strong> Portrait از HMAC با Access Key استفاده می‌کند — نه ModelArk API Key
                            مربوط به Seedance. از کنسول BytePlus → IAM / Access Key جفت AK/SK را بگیرید.
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                                Access Key ID (AK)
                            </label>
                            <input
                                value={apiKeyId}
                                onChange={(e) => setApiKeyId(e.target.value)}
                                placeholder="AKLT... از کنسول BytePlus"
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                                Secret Access Key (SK)
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={
                                    avatar.hasSavedSecret
                                        ? 'قبلاً در دیتابیس ذخیره شده — فقط برای تغییر، مقدار جدید وارد کنید'
                                        : 'Secret مربوط به همان Access Key'
                                }
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                            {avatar.hasSavedSecret && (
                                <p className={styles.subtitle} style={{ marginTop: 8 }}>
                                    SK ذخیره شده است ({avatar.byteplusApiKeyPreview || '••••'}). خالی بگذارید تا همان استفاده شود.
                                </p>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                                یادداشت بررسی (اختیاری)
                            </label>
                            <textarea
                                rows={4}
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="در صورت رد، دلیل را بنویسید"
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={submitting}
                                onClick={() => void handleRetry()}
                            >
                                تست مجدد BytePlus (بدون تایید نهایی)
                            </button>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={submitting}
                                onClick={() => void handleReview('approved')}
                            >
                                تایید API Key و فعال‌سازی احراز هویت
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={submitting}
                                onClick={() => void handleReview('rejected')}
                            >
                                رد درخواست
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
