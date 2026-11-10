'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import ToggleField from '@/app/components/ToggleField/ToggleField';
import mk from '../../marketing/Marketing.module.scss';
import hr from '../../management/hr/Hr.module.scss';
import { subscriptionApi } from '../lib/subscription-api';
import { useSubscriptionModule } from '../lib/SubscriptionProvider';

/** افزودن / ویرایش پلن — سقف‌ها در «مقادیر پلن‌ها»، قیمت در «قیمت‌ها» */
export default function PlanForm({ planId }: { planId?: string }) {
    const router = useRouter();
    const { plans, reload } = useSubscriptionModule();
    const [loading, setLoading] = useState(!!planId);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [order, setOrder] = useState(String((plans.length || 0) + 1));
    const [active, setActive] = useState(true);
    const [isMostPopular, setIsMostPopular] = useState(false);
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (!planId) return;
        subscriptionApi.plan(planId)
            .then((plan) => {
                setName(plan.name || '');
                setSlug(plan.slug || '');
                setDescription(plan.description || '');
                setOrder(String(plan.order ?? 0));
                setActive(plan.status === 'active');
                setIsMostPopular(!!plan.isMostPopular);
                setIsDefault(!!plan.isDefault);
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [planId]);

    const currentDefault = plans.find((p) => p.isDefault && p._id !== planId);

    const save = async () => {
        if (!name.trim()) return ErrorToaster({ message: 'نام پلن الزامی است' });
        const body = {
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description.trim(),
            order: Number(order) || 0,
            status: (active ? 'active' : 'inactive') as 'active' | 'inactive',
            isMostPopular,
            isDefault,
        };
        try {
            setSaving(true);
            if (planId) await subscriptionApi.updatePlan(planId, body);
            else await subscriptionApi.createPlan(body);
            SuccessToaster({ message: planId ? 'پلن ذخیره شد' : 'پلن ساخته شد' });
            reload();
            router.push(planId ? '/subscription/plans' : '/subscription/matrix');
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
                            <h1 className={mk.mainTitle}>{planId ? 'ویرایش پلن' : 'افزودن پلن'}</h1>
                            <p className={mk.subtitle}>نام، شناسه و جایگاه پلن در صفحه قیمت‌ها</p>
                        </div>
                        <Link href="/subscription/plans" className={mk.secondaryBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hr.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            این فرم فقط مشخصات پلن را می‌گیرد. بعد از ذخیره، سقف‌ها را در <Link href="/subscription/matrix">مقادیر پلن‌ها</Link> و
                            مبلغ را در <Link href="/subscription/prices">قیمت‌ها</Link> تعیین کنید؛ پلن بدون قیمت در صفحه قیمت‌ها قابل خرید نیست.
                        </p>
                    </section>

                    <div className={mk.formCard}>
                        <h3 className={mk.formSectionTitle}>هویت پلن</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>نام پلن *</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً حرفه‌ای" />
                                <p className={hr.fieldHint}>همان نامی که مشتری روی کارت قیمت و در «اشتراک من» می‌بیند.</p>
                            </div>
                            <div className={mk.field}>
                                <label>شناسه انگلیسی (slug)</label>
                                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pro" dir="ltr" />
                                <p className={hr.fieldHint}>
                                    حروف کوچک انگلیسی، عدد و «-». صفحه قیمت‌های اپ ظاهر هر پلن را با همین شناسه تنظیم می‌کند؛ بعد از لانچ عوضش نکنید.
                                </p>
                            </div>
                        </div>
                        <div className={mk.field}>
                            <label>توضیح کوتاه</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="برای فریلنسرها و تیم‌های کوچک — اسکرام کامل و گزارش‌ساز پیشرفته" />
                            <p className={hr.fieldHint}>یک جمله زیر نام پلن در کارت قیمت: این پلن برای چه کسی است.</p>
                        </div>

                        <h3 className={mk.formSectionTitle}>نمایش و فروش</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>ترتیب نمایش</label>
                                <input type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
                                <p className={hr.fieldHint}>عدد کوچک‌تر اول (راست) نمایش داده می‌شود؛ معمولاً رایگان ۱، حرفه‌ای ۲، سازمانی ۳.</p>
                            </div>
                        </div>
                        <ToggleField
                            title="در فروش (فعال)"
                            hint="خاموش = از صفحه قیمت‌ها پنهان می‌شود؛ خریداران فعلی تا پایان دوره سقف‌هایشان را دارند."
                            checked={active}
                            onChange={setActive}
                        />
                        <ToggleField
                            title="محبوب‌ترین"
                            hint="کارت این پلن برجسته و با برچسب «پیشنهاد ما» نمایش داده می‌شود. فقط یک پلن را این‌طور علامت بزنید."
                            checked={isMostPopular}
                            onChange={setIsMostPopular}
                        />
                        <ToggleField
                            title="پلن پیش‌فرض (کاربران بدون اشتراک)"
                            hint={currentDefault
                                ? `الان «${currentDefault.name}» پیش‌فرض است؛ روشن کردن این گزینه آن را برمی‌دارد.`
                                : 'کاربر تازه یا کسی که اشتراکش تمام شده خودکار روی این پلن می‌رود. معمولاً پلن رایگان.'}
                            checked={isDefault}
                            onChange={setIsDefault}
                        />

                        <div className={hr.formNoteBox}>
                            <strong>بعد از ذخیره:</strong> {planId
                                ? 'تغییرات حداکثر تا ۳۰ ثانیه روی صفحه قیمت‌ها و همهٔ سرورها اعمال می‌شود.'
                                : 'به «مقادیر پلن‌ها» می‌روید تا سقف‌های این پلن را تعیین کنید.'}
                        </div>

                        <div className={mk.formActions}>
                            <button type="button" className={mk.primaryBtn} disabled={saving || !name.trim()} onClick={() => void save()}>
                                {saving ? 'در حال ذخیره…' : planId ? 'ذخیره پلن' : 'ساخت پلن'}
                            </button>
                            <Link href="/subscription/plans" className={mk.secondaryBtn}>انصراف</Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
