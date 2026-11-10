'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import etrStyles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';
import { formatCount, fullDate, relativeTime } from '@/app/(main)/error-tracking/lib/format';
import { platformLabel, webhookOutcome, zernioAdminApi, type ZernioPoolKey } from '../../lib/zernio-admin-api';
import styles from '../../Infra.module.scss';

const KEY_PATTERN = /^sk_[0-9a-f]{64}$/i;

export default function EditZernioKeyPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [key, setKey] = useState<ZernioPoolKey | null>(null);
    const [loading, setLoading] = useState(true);
    const [label, setLabel] = useState('');
    const [maxAccounts, setMaxAccounts] = useState(2);
    const [newApiKey, setNewApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [webhookBusy, setWebhookBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const apply = (next: ZernioPoolKey) => {
        setKey(next);
        setLabel(next.label);
        setMaxAccounts(next.maxAccounts);
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            apply(await zernioAdminApi.getKey(id));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = async () => {
        if (!key) return;
        if (!label.trim()) {
            toast.error('برچسب کلید نمی‌تواند خالی باشد');
            return;
        }
        if (maxAccounts < key.allocationCount) {
            toast.error(`این کلید ${formatCount(key.allocationCount)} اکانت متصل دارد؛ سقف کمتر از آن نمی‌شود`);
            return;
        }
        if (newApiKey.trim() && !KEY_PATTERN.test(newApiKey.trim())) {
            toast.error('کلید جدید باید با sk_ شروع شود و ۶۴ کاراکتر بعد از آن داشته باشد');
            return;
        }
        try {
            setSaving(true);
            const updated = await zernioAdminApi.updateKey(key._id, {
                label: label.trim(),
                maxAccounts: Math.floor(maxAccounts),
                ...(newApiKey.trim() ? { apiKey: newApiKey.trim() } : {}),
            });
            SuccessToaster({ message: 'کلید ذخیره شد' });
            const outcome = webhookOutcome(updated);
            if (outcome) (outcome.ok ? toast.success : toast.error)(outcome.text, { duration: 7000 });
            router.push('/zernio-keys');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const registerWebhook = async () => {
        if (!key) return;
        try {
            setWebhookBusy(true);
            const result = await zernioAdminApi.reregisterWebhook(key._id);
            SuccessToaster({ message: result.message });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setWebhookBusy(false);
        }
    };

    const remove = async () => {
        if (!key) return;
        try {
            setDeleting(true);
            await zernioAdminApi.deleteKey(key._id);
            SuccessToaster({ message: 'کلید از استخر حذف شد' });
            router.push('/zernio-keys');
        } catch (e) {
            ErrorToaster(e);
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (loading && !key) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>ویرایش کلید</h1>
                            <p className={parentStyles.subtitle}>
                                {key ? (
                                    <>
                                        {key.label || 'بدون برچسب'} · <bdi dir="ltr">sk_••••{key.last4}</bdi>
                                    </>
                                ) : (
                                    'کلید پیدا نشد'
                                )}
                            </p>
                        </div>
                        <Link href="/zernio-keys" className={etrStyles.smallBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    {!key ? (
                        <div className={etrStyles.tableEmpty}>
                            این کلید وجود ندارد یا حذف شده — <Link href="/zernio-keys">بازگشت به فهرست کلیدها</Link>
                        </div>
                    ) : (
                        <>
                            <section className={hrStyles.formGuideCard}>
                                <h2>قبل از ذخیره</h2>
                                <p>
                                    برچسب و سقف را آزادانه تغییر دهید. «کلید جدید» فقط برای وقتی است که کلید را در Zernio
                                    عوض کرده‌اید (rotate)؛ اگر این کلید اکانت متصل دارد، کلید جدید باید از <strong>همان حساب Zernio</strong>
                                    باشد تا اکانت‌ها قطع نشوند — این قبل از ذخیره چک می‌شود.
                                </p>
                            </section>

                            <div className={parentStyles.formCard}>
                                <h3 className={parentStyles.formSectionTitle}>وضعیت فعلی</h3>
                                <dl className={styles.infoList}>
                                    <dt>مصرف</dt>
                                    <dd>
                                        {formatCount(key.allocationCount)} از {formatCount(key.maxAccounts)} اکانت
                                        {key.allocationCount >= key.maxAccounts ? <span className={styles.bad}> — پر</span> : null}
                                    </dd>
                                    <dt>webhook</dt>
                                    <dd>
                                        {key.hasWebhook ? (
                                            <span className={`${styles.statusDot} ${styles.ok}`}>ثبت‌شده در Zernio</span>
                                        ) : (
                                            <span className={`${styles.statusDot} ${styles.bad}`}>ثبت نشده — کامنت و پیام این اکانت‌ها نمی‌رسد</span>
                                        )}
                                        {' '}
                                        <button type="button" className={etrStyles.smallBtn} disabled={webhookBusy} onClick={() => void registerWebhook()}>
                                            {webhookBusy ? 'در حال ثبت…' : key.hasWebhook ? 'بررسی و اصلاح webhook' : 'ثبت webhook'}
                                        </button>
                                    </dd>
                                    <dt>آدرس دریافت</dt>
                                    <dd className={styles.ltr}>{key.receiveUrl || '—'}</dd>
                                    <dt>پروفایل Zernio</dt>
                                    <dd className={styles.ltr}>{key.profileId || '—'}</dd>
                                    <dt>افزوده‌شده</dt>
                                    <dd title={fullDate(key.createdAt)}>{relativeTime(key.createdAt)}</dd>
                                    <dt>اکانت‌های متصل</dt>
                                    <dd>
                                        {key.allocatedAccounts.length ? (
                                            <ul className={styles.accountList}>
                                                {key.allocatedAccounts.map((acc) => (
                                                    <li key={acc._id} className={styles.accountLine}>
                                                        <span dir="ltr">@{acc.username || acc.displayName || '—'}</span>
                                                        <span className={styles.muted}>{platformLabel(acc.platform)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            'هنوز اکانتی روی این کلید نیست'
                                        )}
                                        {key.allocatedAccounts.length ? (
                                            <p className={hrStyles.fieldHint}>
                                                صاحب هر اکانت را در <Link href={`/capacity?view=accounts&a_keyId=${key._id}`}>اکانت‌ها</Link> ببینید.
                                            </p>
                                        ) : null}
                                    </dd>
                                </dl>

                                <h3 className={parentStyles.formSectionTitle}>شناسه</h3>
                                <div className={parentStyles.field}>
                                    <label htmlFor="zk-label">برچسب *</label>
                                    <input id="zk-label" value={label} onChange={(e) => setLabel(e.target.value)} />
                                    <p className={hrStyles.fieldHint}>فقط برای شناسایی در پنل است و به مشتری نشان داده نمی‌شود.</p>
                                </div>

                                <h3 className={parentStyles.formSectionTitle}>ظرفیت</h3>
                                <div className={parentStyles.field}>
                                    <label htmlFor="zk-max">سقف اکانت *</label>
                                    <input
                                        id="zk-max"
                                        type="number"
                                        min={Math.max(1, key.allocationCount)}
                                        value={maxAccounts}
                                        onChange={(e) => setMaxAccounts(Number(e.target.value))}
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        حداقل {formatCount(Math.max(1, key.allocationCount))} (اکانت‌های فعلی). اگر پلن Zernio این حساب را
                                        ارتقا داده‌اید، سقف را به اندازهٔ پلن بالا ببرید.
                                    </p>
                                </div>

                                <h3 className={parentStyles.formSectionTitle}>جایگزینی کلید (اختیاری)</h3>
                                <div className={parentStyles.field}>
                                    <label htmlFor="zk-key">کلید API جدید</label>
                                    <input
                                        id="zk-key"
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        placeholder="خالی بماند = همان کلید فعلی"
                                        dir="ltr"
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        کلید با Zernio تست می‌شود و webhook با کلید جدید دوباره بررسی می‌شود. کلید یک حساب دیگرِ
                                        Zernio فقط روی کلیدی پذیرفته می‌شود که هنوز اکانتی ندارد.
                                    </p>
                                </div>

                                <div className={parentStyles.formActions}>
                                    <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => void save()}>
                                        {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
                                    </button>
                                    <Link href="/zernio-keys" className={parentStyles.secondaryBtn}>
                                        انصراف
                                    </Link>
                                </div>

                                <div className={styles.dangerZone}>
                                    <h3 className={parentStyles.formSectionTitle}>حذف کلید</h3>
                                    <p>
                                        کلید از استخر خارج و webhook آن در Zernio پاک می‌شود. کلیدی که اکانت متصل دارد حذف نمی‌شود؛
                                        اول باید مشتری‌ها آن اکانت‌ها را حذف کنند.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.dangerBtn}
                                        disabled={key.allocationCount > 0}
                                        title={key.allocationCount > 0 ? 'این کلید اکانت متصل دارد' : undefined}
                                        onClick={() => setConfirmDelete(true)}
                                    >
                                        حذف کلید
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <ConfirmDialog
                    open={confirmDelete}
                    title="حذف کلید"
                    confirmLabel="حذف"
                    tone="danger"
                    busy={deleting}
                    onConfirm={() => void remove()}
                    onClose={() => setConfirmDelete(false)}
                >
                    کلید «{key?.label}» از استخر حذف شود؟ ظرفیت کل {formatCount(key?.maxAccounts || 0)} جا کم می‌شود.
                </ConfirmDialog>
            </Wrapper>
        </Container>
    );
}
