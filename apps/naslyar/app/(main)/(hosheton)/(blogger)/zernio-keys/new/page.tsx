'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import etrStyles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';
import { webhookOutcome, zernioAdminApi } from '../../lib/zernio-admin-api';

const KEY_PATTERN = /^sk_[0-9a-f]{64}$/i;

export default function NewZernioKeyPage() {
    const router = useRouter();
    const [label, setLabel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [maxAccounts, setMaxAccounts] = useState(2);
    const [saving, setSaving] = useState(false);

    const keyLooksValid = KEY_PATTERN.test(apiKey.trim());

    const save = async () => {
        if (!label.trim()) {
            toast.error('برچسب کلید را بنویسید');
            return;
        }
        if (!keyLooksValid) {
            toast.error('کلید باید با sk_ شروع شود و ۶۴ کاراکتر بعد از آن داشته باشد');
            return;
        }
        try {
            setSaving(true);
            const created = await zernioAdminApi.createKey({
                label: label.trim(),
                apiKey: apiKey.trim(),
                maxAccounts: Math.max(1, Number(maxAccounts) || 2),
            });
            const outcome = webhookOutcome(created);
            SuccessToaster({ message: 'کلید به استخر اضافه شد' });
            if (outcome) (outcome.ok ? toast.success : toast.error)(outcome.text, { duration: 7000 });
            router.push('/zernio-keys');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کلید جدید</h1>
                            <p className={parentStyles.subtitle}>یک کلید API تازه به استخر مشترک اتصال اکانت‌ها اضافه کنید.</p>
                        </div>
                        <Link href="/zernio-keys" className={etrStyles.smallBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            مطمئن شوید <Link href="/zernio-keys/settings">آدرس عمومی API</Link> روی دامنهٔ واقعی (یا ngrok در
                            توسعه) است، نه localhost؛ چون webhook همین الان با همان آدرس در Zernio ساخته می‌شود. کلید قبل از
                            ذخیره با Zernio تست می‌شود و یک پروفایل مخصوص بلاگر در همان حساب ساخته می‌شود.
                        </p>
                    </section>

                    <div className={parentStyles.formCard}>
                        <h3 className={parentStyles.formSectionTitle}>شناسه</h3>
                        <div className={parentStyles.field}>
                            <label htmlFor="zk-label">برچسب *</label>
                            <input
                                id="zk-label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="مثلاً hosheton_series_3"
                            />
                            <p className={hrStyles.fieldHint}>
                                اسمی که خودتان کلید را با آن می‌شناسید؛ بهتر است ایمیل یا شمارهٔ حساب Zernio را در آن بیاورید
                                تا بعداً بدانید این کلید مال کدام حساب است.
                            </p>
                        </div>

                        <h3 className={parentStyles.formSectionTitle}>اتصال</h3>
                        <div className={parentStyles.field}>
                            <label htmlFor="zk-key">کلید API *</label>
                            <input
                                id="zk-key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk_..."
                                dir="ltr"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <p className={hrStyles.fieldHint}>
                                در پنل Zernio از بخش API Keys بسازید و کامل کپی کنید. بعد از ذخیره فقط ۴ رقم آخرش نمایش داده
                                می‌شود.{apiKey && !keyLooksValid ? ' — فرمت هنوز درست نیست (sk_ + ۶۴ کاراکتر).' : ''}
                            </p>
                        </div>

                        <h3 className={parentStyles.formSectionTitle}>ظرفیت</h3>
                        <div className={parentStyles.field}>
                            <label htmlFor="zk-max">سقف اکانت *</label>
                            <input
                                id="zk-max"
                                type="number"
                                min={1}
                                value={maxAccounts}
                                onChange={(e) => setMaxAccounts(Number(e.target.value))}
                            />
                            <p className={hrStyles.fieldHint}>
                                چند اکانت می‌تواند روی این کلید وصل شود. پلن رایگان Zernio ۲ اکانت است؛ بیشتر از سقف پلن
                                ننویسید، وگرنه اتصال مشتری در Zernio رد می‌شود.
                            </p>
                        </div>

                        <div className={hrStyles.formNoteBox}>
                            بعد از ذخیره کلید بلافاصله در استخر فعال است و مشتری‌ها می‌توانند اکانت وصل کنند. نتیجهٔ ساخت
                            webhook در یک پیام نشان داده می‌شود.
                        </div>

                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => void save()}>
                                {saving ? 'در حال بررسی و ذخیره…' : 'ثبت کلید'}
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
