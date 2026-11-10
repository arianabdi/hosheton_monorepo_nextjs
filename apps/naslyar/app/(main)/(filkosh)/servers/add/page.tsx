'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster} from '@my-workspace/utils';
import {filkoshApi} from '../../lib/filkosh-api';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';

export default function FilkoshAddServerPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        host: '',
        sshPort: 22,
        sshUsername: 'root',
        sshPassword: '',
        country: '',
        countryCode: '',
        city: '',
        flag: '',
        description: '',
        capacity: 100,
        tier: 'free',
    });
    const [scopeVpn, setScopeVpn] = useState(true);
    const [scopeDns, setScopeDns] = useState(false);

    const appScope = scopeVpn && scopeDns ? 'both' : scopeVpn ? 'vpn' : scopeDns ? 'dns' : 'none';

    const set = (key: string, value: unknown) => setForm((f) => ({...f, [key]: value}));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const server = await filkoshApi.createServer({...form, appScope});
            SuccessToaster({message: 'سرور ثبت شد'});
            router.push(`/servers/${server._id}`);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>افزودن سرور</h1>
                            <p className={styles.subtitle}>
                                فقط اطلاعات اتصال SSH و موقعیت را وارد کنید؛ نصب پروتکل‌ها بعداً از صفحه مدیریت سرور
                                انجام می‌شود.
                            </p>
                        </div>
                        <Link href="/servers" className={styles.backLink}>
                            بازگشت به لیست
                        </Link>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.serverAdd} defaultExpanded={false} />

                    <form onSubmit={submit} className={styles.formPanel}>
                        <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
                            <label className={styles.field}>
                                <span>نام سرور *</span>
                                <input
                                    required
                                    minLength={2}
                                    placeholder="مثلاً node-1-germany"
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>Host / IP *</span>
                                <input
                                    required
                                    dir="ltr"
                                    placeholder="45.xxx.xxx.xxx"
                                    value={form.host}
                                    onChange={(e) => set('host', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>پورت SSH</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={form.sshPort}
                                    onChange={(e) => set('sshPort', Number(e.target.value))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>کاربر SSH</span>
                                <input dir="ltr" value={form.sshUsername} onChange={(e) => set('sshUsername', e.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>رمز عبور SSH *</span>
                                <input
                                    required
                                    type="password"
                                    dir="ltr"
                                    value={form.sshPassword}
                                    onChange={(e) => set('sshPassword', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>کشور</span>
                                <input placeholder="Germany" value={form.country} onChange={(e) => set('country', e.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>کد کشور (۲ حرف)</span>
                                <input
                                    dir="ltr"
                                    maxLength={2}
                                    placeholder="DE"
                                    value={form.countryCode}
                                    onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>شهر</span>
                                <input placeholder="Frankfurt" value={form.city} onChange={(e) => set('city', e.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>فلگ (ایموجی)</span>
                                <input placeholder="🇩🇪" value={form.flag} onChange={(e) => set('flag', e.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>ظرفیت کاربر</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={form.capacity}
                                    onChange={(e) => set('capacity', Number(e.target.value))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>سطح دسترسی</span>
                                <select value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                                    <option value="free">رایگان</option>
                                    <option value="premium">پرمیوم (نیازمند اشتراک)</option>
                                </select>
                            </label>
                            <div className={styles.checkRow}>
                                <span style={{fontSize: '0.85rem', fontWeight: 700, alignSelf: 'center'}}>
                                    مجوز استفاده در بخش:
                                </span>
                                <label className={styles.checkField}>
                                    <input
                                        type="checkbox"
                                        checked={scopeVpn}
                                        onChange={(e) => setScopeVpn(e.target.checked)}
                                    />
                                    <span>VPN (شامل پراکسی تلگرام)</span>
                                </label>
                                <label className={styles.checkField}>
                                    <input
                                        type="checkbox"
                                        checked={scopeDns}
                                        onChange={(e) => setScopeDns(e.target.checked)}
                                    />
                                    <span>DNS</span>
                                </label>
                            </div>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>توضیحات</span>
                                <textarea
                                    rows={2}
                                    placeholder="مثلاً: برای کدام سرویس/مشتری خریداری شده، تاریخ خرید، مدت قرارداد…"
                                    value={form.description}
                                    onChange={(e) => set('description', e.target.value)}
                                />
                                <span className={styles.fieldHint}>اختیاری — این سرور برای چه کاری یا برای چه کسی خریداری شده؟</span>
                            </label>
                        </div>
                        {!scopeVpn && !scopeDns ? (
                            <p className={styles.fieldHint} style={{color: '#b91c1c'}}>
                                با عدم انتخاب هر دو بخش، سرور فقط برای مدیریت/SSH باقی می‌ماند و در هیچ بخشی (اپ، پراکسی
                                تلگرام و…) لود نمی‌شود.
                            </p>
                        ) : (
                            <p className={styles.fieldHint}>
                                سرورهای بدون مجوز یک بخش، در لیست انتخاب آن بخش (مثلاً ایجاد نود پراکسی تلگرام) نمایش داده
                                نمی‌شوند.
                            </p>
                        )}
                        <p className={styles.fieldHint}>رمز عبور فقط روی سرور naslyar ذخیره می‌شود و برای SSH از پنل استفاده می‌گردد.</p>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                {saving ? 'در حال ثبت…' : 'ثبت سرور'}
                            </button>
                            <Link href="/servers" className={styles.secondaryBtn}>
                                انصراف
                            </Link>
                        </div>
                    </form>
                </div>
            </Wrapper>
        </Container>
    );
}
