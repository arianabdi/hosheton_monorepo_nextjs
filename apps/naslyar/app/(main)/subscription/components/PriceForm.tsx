'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import mk from '../../marketing/Marketing.module.scss';
import hr from '../../management/hr/Hr.module.scss';
import { subscriptionApi } from '../lib/subscription-api';
import { useSubscriptionModule } from '../lib/SubscriptionProvider';
import { money, PERIOD_LABELS } from '../lib/format';

/** افزودن / ویرایش قیمت یک پلن */
export default function PriceForm({ priceId }: { priceId?: string }) {
    const router = useRouter();
    const params = useSearchParams();
    const { plans, reload } = useSubscriptionModule();
    const [loading, setLoading] = useState(!!priceId);
    const [saving, setSaving] = useState(false);
    const [planId, setPlanId] = useState(params.get('planId') || '');
    const [period, setPeriod] = useState('monthly');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('IRT');

    useEffect(() => {
        if (!priceId) return;
        subscriptionApi.price(priceId)
            .then((p) => {
                if (!p) return;
                setPlanId(typeof p.planId === 'string' ? p.planId : p.planId?._id);
                setPeriod(p.billingPeriod);
                setAmount(String(p.price));
                setCurrency(p.currency || 'IRT');
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [priceId]);

    const save = async () => {
        const price = Number(amount);
        if (!planId || !Number.isFinite(price) || price < 0) return ErrorToaster({ message: 'پلن و مبلغ معتبر الزامی است' });
        try {
            setSaving(true);
            if (priceId) await subscriptionApi.updatePrice(priceId, { price, currency, billingPeriod: period });
            else await subscriptionApi.createPrice({ planId, billingPeriod: period, price, currency });
            SuccessToaster({ message: 'قیمت ذخیره شد' });
            reload();
            router.push('/subscription/prices');
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
                <div className={`${mk.container} ${mk.rtl}`}>
                    <header className={mk.header}>
                        <div>
                            <h1 className={mk.mainTitle}>{priceId ? 'ویرایش قیمت' : 'افزودن قیمت'}</h1>
                            <p className={mk.subtitle}>مبلغ یک پلن برای یک دوره پرداخت</p>
                        </div>
                        <Link href="/subscription/prices" className={mk.secondaryBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hr.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            هر پلن برای هر دوره و ارز فقط یک قیمت دارد. پلن رایگان یک قیمت «ماهانه، ۰» لازم دارد. تغییر مبلغ روی خریدهای
                            قبلی اثری ندارد. اگر پلن را ندارید، اول <Link href="/subscription/plans/new">پلن بسازید</Link>.
                        </p>
                    </section>

                    <div className={mk.formCard}>
                        <h3 className={mk.formSectionTitle}>پلن و دوره</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>پلن *</label>
                                <select value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!!priceId}>
                                    <option value="">— انتخاب کنید —</option>
                                    {plans.map((p) => <option key={p._id} value={p._id}>{p.name}{p.status !== 'active' ? ' (غیرفعال)' : ''}</option>)}
                                </select>
                                <p className={hr.fieldHint}>{priceId ? 'پلن یک قیمت ثبت‌شده قابل تغییر نیست؛ برای پلن دیگر قیمت تازه بسازید.' : 'قیمت برای کدام بسته است.'}</p>
                            </div>
                            <div className={mk.field}>
                                <label>دوره پرداخت *</label>
                                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                                    {Object.entries(PERIOD_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                                </select>
                                <p className={hr.fieldHint}>اعتبار اشتراک بعد از خرید به همین اندازه است. صفحه قیمت‌ها ماهانه و سالانه را سوییچ می‌کند.</p>
                            </div>
                        </div>

                        <h3 className={mk.formSectionTitle}>مبلغ</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>مبلغ *</label>
                                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="290000" dir="ltr" />
                                <p className={hr.fieldHint}>{amount ? `نمایش: ${money(Number(amount), currency)}` : 'بدون جداکننده؛ ۰ یعنی رایگان.'}</p>
                            </div>
                            <div className={mk.field}>
                                <label>ارز</label>
                                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                    <option value="IRT">تومان (IRT)</option>
                                    <option value="USD">دلار (USD)</option>
                                </select>
                                <p className={hr.fieldHint}>درگاه‌های ایرانی با تومان کار می‌کنند.</p>
                            </div>
                        </div>

                        <div className={mk.formActions}>
                            <button type="button" className={mk.primaryBtn} disabled={saving || !planId || amount === ''} onClick={() => void save()}>
                                {saving ? 'در حال ذخیره…' : 'ذخیره قیمت'}
                            </button>
                            <Link href="/subscription/prices" className={mk.secondaryBtn}>انصراف</Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
