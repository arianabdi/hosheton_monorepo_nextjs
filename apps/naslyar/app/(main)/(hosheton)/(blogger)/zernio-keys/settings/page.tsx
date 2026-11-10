'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import etrStyles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';
import { zernioAdminApi, type ZernioPoolSettings } from '../../lib/zernio-admin-api';
import styles from '../../Infra.module.scss';

const EMPTY: ZernioPoolSettings = {
    frontendBaseUrl: '',
    frontendCallbackPath: '/settings/accounts/connect',
    frontendCallbackUrl: '',
    publicApiBaseUrl: '',
    webhookPath: '/zernio/webhook',
    webhookExampleUrl: '',
    backendFallbackCallbackUrl: '',
    zernioApiBaseUrl: 'https://zernio.com/api/v1',
};

const join = (base: string, path: string) => `${base.trim().replace(/\/+$/, '')}/${path.trim().replace(/^\/+/, '')}`;
/** Same rule as the API: webhook routes live outside /api */
const stripApi = (url: string) => url.trim().replace(/\/+$/, '').replace(/\/api$/i, '');

export default function ZernioSettingsPage() {
    const router = useRouter();
    const [form, setForm] = useState<ZernioPoolSettings>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        zernioAdminApi
            .getSettings()
            .then((data) => setForm({ ...EMPTY, ...data }))
            .catch((e) => ErrorToaster(e))
            .finally(() => setLoading(false));
    }, []);

    const set = (name: keyof ZernioPoolSettings, value: string) => setForm((f) => ({ ...f, [name]: value }));

    const preview = useMemo(() => {
        const api = stripApi(form.publicApiBaseUrl);
        return {
            oauth: form.frontendBaseUrl ? join(form.frontendBaseUrl, form.frontendCallbackPath || '/') : '—',
            webhook: api ? join(api, `${form.webhookPath || '/zernio/webhook'}/{keyId}`) : '—',
            isLocal: /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(api),
        };
    }, [form]);

    const save = async () => {
        try {
            setSaving(true);
            await zernioAdminApi.updateSettings({
                frontendBaseUrl: form.frontendBaseUrl.trim(),
                frontendCallbackPath: form.frontendCallbackPath.trim(),
                publicApiBaseUrl: form.publicApiBaseUrl.trim(),
                webhookPath: form.webhookPath.trim(),
                zernioApiBaseUrl: form.zernioApiBaseUrl.trim(),
            });
            SuccessToaster({ message: 'تنظیمات اتصال ذخیره شد' });
            router.push('/zernio-keys');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>تنظیمات اتصال</h1>
                            <p className={parentStyles.subtitle}>آدرس‌هایی که بین همهٔ کلیدهای استخر مشترک است.</p>
                        </div>
                        <Link href="/zernio-keys" className={etrStyles.smallBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از ذخیره</h2>
                        <p>
                            Zernio دو جا به ما برمی‌گردد: مرورگر مشتری بعد از ورود به شبکه (آدرس فرانت) و رویدادهای کامنت/پیام
                            (آدرس عمومی API). هر دو باید از اینترنت باز شوند. بعد از تغییر آدرس عمومی، webhook هر کلید با اولین
                            اتصال اکانت یا با «ثبت webhook» در <Link href="/zernio-keys">فهرست کلیدها</Link> به آدرس تازه منتقل می‌شود.
                        </p>
                    </section>

                    <div className={parentStyles.formCard}>
                        <h3 className={parentStyles.formSectionTitle}>بازگشت مشتری بعد از اتصال (OAuth)</h3>
                        <div className={hrStyles.formRow}>
                            <div className={parentStyles.field}>
                                <label htmlFor="zs-front">آدرس فرانت بلاگر</label>
                                <input id="zs-front" dir="ltr" value={form.frontendBaseUrl} onChange={(e) => set('frontendBaseUrl', e.target.value)} placeholder="https://blogger.hosheton.com" />
                                <p className={hrStyles.fieldHint}>دامنه‌ای که مشتری بلاگر را با آن باز می‌کند؛ در توسعه http://localhost:3000.</p>
                            </div>
                            <div className={parentStyles.field}>
                                <label htmlFor="zs-cb">مسیر صفحهٔ بازگشت</label>
                                <input id="zs-cb" dir="ltr" value={form.frontendCallbackPath} onChange={(e) => set('frontendCallbackPath', e.target.value)} placeholder="/settings/accounts/connect" />
                                <p className={hrStyles.fieldHint}>صفحه‌ای از بلاگر که اتصال را تمام می‌کند؛ جز در تغییر کد فرانت دست نزنید.</p>
                            </div>
                        </div>

                        <h3 className={parentStyles.formSectionTitle}>رویدادها (webhook)</h3>
                        <div className={hrStyles.formRow}>
                            <div className={parentStyles.field}>
                                <label htmlFor="zs-api">آدرس عمومی API بلاگر</label>
                                <input id="zs-api" dir="ltr" value={form.publicApiBaseUrl} onChange={(e) => set('publicApiBaseUrl', e.target.value)} placeholder="https://api.hosheton.com/blogger" />
                                <p className={hrStyles.fieldHint}>
                                    ریشهٔ سرور بلاگر از دید اینترنت، بدون «/api» آخر (اگر بنویسید خودکار حذف می‌شود). در توسعه آدرس
                                    ngrok روی پورت ۳۰۲۷.
                                </p>
                            </div>
                            <div className={parentStyles.field}>
                                <label htmlFor="zs-path">مسیر webhook</label>
                                <input id="zs-path" dir="ltr" value={form.webhookPath} onChange={(e) => set('webhookPath', e.target.value)} placeholder="/zernio/webhook" />
                                <p className={hrStyles.fieldHint}>شناسهٔ هر کلید به آخر آن اضافه می‌شود؛ پیش‌فرض را نگه دارید.</p>
                            </div>
                        </div>

                        <h3 className={parentStyles.formSectionTitle}>پیشرفته</h3>
                        <div className={parentStyles.field}>
                            <label htmlFor="zs-zernio">آدرس API Zernio</label>
                            <input id="zs-zernio" dir="ltr" value={form.zernioApiBaseUrl} onChange={(e) => set('zernioApiBaseUrl', e.target.value)} placeholder="https://zernio.com/api/v1" />
                            <p className={hrStyles.fieldHint}>فقط اگر Zernio نسخه یا دامنهٔ API را عوض کرد تغییر دهید.</p>
                        </div>

                        <div className={styles.urlPreview}>
                            <div><span>بازگشت OAuth: </span><bdi className={styles.ltr}>{preview.oauth}</bdi></div>
                            <div><span>آدرس webhook هر کلید: </span><bdi className={styles.ltr}>{preview.webhook}</bdi></div>
                        </div>

                        {preview.isLocal ? (
                            <div className={`${styles.alert} ${styles.alertDanger}`}>
                                آدرس عمومی API محلی است؛ Zernio به localhost دسترسی ندارد و webhook ساخته نمی‌شود. ngrok را روشن کنید
                                و آدرس آن را اینجا بگذارید.
                            </div>
                        ) : null}

                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => void save()}>
                                {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
                            </button>
                            <Link href="/zernio-keys" className={parentStyles.secondaryBtn}>
                                انصراف
                            </Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
