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
import { subscriptionApi, UNLIMITED, type FeatureType, type FeatureUsageMode, type SubscriptionFeature } from '../lib/subscription-api';
import { useSubscriptionModule } from '../lib/SubscriptionProvider';
import { MODE_LABELS } from '../lib/format';
import styles from '../Subscription.module.scss';

/**
 * افزودن / ویرایش ویژگی. ویژگی «در کد» (source=code) را اپ می‌سازد: کد، نوع و نحوه سنجش قفل‌اند و
 * فقط متن‌ها و نمایش قابل ویرایش است. ویژگی دستی فقط نمایشی است (کدی آن را اعمال نمی‌کند).
 */
export default function FeatureForm({ featureId }: { featureId?: string }) {
    const router = useRouter();
    const { features, reload } = useSubscriptionModule();
    const [loading, setLoading] = useState(!!featureId);
    const [saving, setSaving] = useState(false);
    const [inCode, setInCode] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState<FeatureType>('boolean');
    const [mode, setMode] = useState<FeatureUsageMode>('switch');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');
    const [publicDescription, setPublicDescription] = useState('');
    const [groupTitle, setGroupTitle] = useState('');
    const [order, setOrder] = useState('100');
    const [showInCard, setShowInCard] = useState(false);
    const [defaultMode, setDefaultMode] = useState<'none' | 'value' | 'unlimited'>('none');
    const [defaultValue, setDefaultValue] = useState('');

    useEffect(() => {
        if (!featureId) return;
        subscriptionApi.feature(featureId)
            .then((f: SubscriptionFeature) => {
                setInCode(f.source === 'code');
                setName(f.name);
                setCode(f.code);
                setType(f.type);
                setMode(f.usageMode || (f.type === 'boolean' ? 'switch' : 'consumable'));
                setUnit(f.unit || '');
                setDescription(f.description || '');
                setPublicDescription(f.publicDescription || '');
                setGroupTitle(f.group?.title || '');
                setOrder(String(f.order ?? 100));
                setShowInCard(!!f.showInCard);
                if (f.defaultValue === null || f.defaultValue === undefined) setDefaultMode('none');
                else if (f.type === 'quantity' && Number(f.defaultValue) === UNLIMITED) setDefaultMode('unlimited');
                else {
                    setDefaultMode('value');
                    setDefaultValue(String(f.defaultValue));
                }
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [featureId]);

    const groups = [...new Map(features.filter((f) => f.group?.title).map((f) => [f.group!.title, f.group!])).values()];

    const save = async () => {
        if (!name.trim() || !code.trim()) return ErrorToaster({ message: 'نام و کد الزامی است' });
        const group = groups.find((g) => g.title === groupTitle.trim())
            || (groupTitle.trim() ? { title: groupTitle.trim(), slug: `9-${groupTitle.trim()}` } : null);
        const body: Partial<SubscriptionFeature> = {
            name: name.trim(),
            description: description.trim(),
            publicDescription: publicDescription.trim(),
            unit: unit.trim(),
            order: Number(order) || 0,
            showInCard,
            group,
            defaultValue: defaultMode === 'none' ? null
                : defaultMode === 'unlimited' ? UNLIMITED
                    : type === 'boolean' ? defaultValue === 'true' : Number(defaultValue) || 0,
        };
        if (!inCode) Object.assign(body, { code: code.trim().toLowerCase(), type, usageMode: type === 'boolean' ? 'switch' : mode });
        try {
            setSaving(true);
            if (featureId) await subscriptionApi.updateFeature(featureId, body);
            else await subscriptionApi.createFeature(body);
            SuccessToaster({ message: 'ویژگی ذخیره شد' });
            reload();
            router.push('/subscription/features');
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
                            <h1 className={mk.mainTitle}>{featureId ? 'ویرایش ویژگی' : 'افزودن ویژگی نمایشی'}</h1>
                            <p className={mk.subtitle}>{inCode ? 'ویژگی تعریف‌شده در کد اپ — فقط متن‌ها و نمایش قابل تغییر است' : 'ردیفی که فقط در صفحه قیمت‌ها نمایش داده می‌شود'}</p>
                        </div>
                        <Link href="/subscription/features" className={mk.secondaryBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hr.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            {inCode
                                ? 'کد، نوع و نحوه سنجش این ویژگی را کد اپ تعیین می‌کند و از پنل تغییر نمی‌کند. نام و متن‌ها را برای مشتری خوانا کنید.'
                                : <>ویژگی‌ای که اینجا می‌سازید <strong>هیچ چیزی را در اپ محدود نمی‌کند</strong> — فقط ردیف جدول مقایسه است (مثل «پشتیبانی تلفنی»). برای محدودیت واقعی از برنامه‌نویس بخواهید طبق <Link href="/subscription/docs/add-feature">مستندات</Link> آن را به کاتالوگ اپ اضافه کند.</>}
                        </p>
                    </section>

                    <div className={mk.formCard}>
                        <h3 className={mk.formSectionTitle}>هویت</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>نام *</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً پشتیبانی تلفنی" />
                                <p className={hr.fieldHint}>نامی که در کارت و جدول مقایسه صفحه قیمت‌ها دیده می‌شود.</p>
                            </div>
                            <div className={mk.field}>
                                <label>کد *</label>
                                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="phone_support" dir="ltr" disabled={inCode} />
                                <p className={hr.fieldHint}>{inCode ? 'کد در سورس اپ استفاده می‌شود و قفل است.' : 'یکتا، حروف کوچک انگلیسی و _ (مثل phone_support).'}</p>
                            </div>
                        </div>

                        <h3 className={mk.formSectionTitle}>نحوه سنجش</h3>
                        {inCode ? (
                            <p className={hr.fieldHintBlock}>
                                {MODE_LABELS[mode].label} — {MODE_LABELS[mode].hint}
                            </p>
                        ) : (
                            <div className={styles.radioCards}>
                                {(['switch', 'counter', 'cap'] as FeatureUsageMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`${styles.radioCard} ${mode === m ? styles.radioCardActive : ''}`}
                                        onClick={() => {
                                            setMode(m);
                                            setType(m === 'switch' ? 'boolean' : 'quantity');
                                        }}
                                    >
                                        <strong>{MODE_LABELS[m].label}</strong>
                                        <small>{MODE_LABELS[m].hint}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                        {type === 'quantity' ? (
                            <div className={mk.field} style={{ marginTop: '1rem' }}>
                                <label>واحد</label>
                                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="مثلاً پروژه، مگابایت، پیام در ماه" />
                                <p className={hr.fieldHint}>بعد از عدد نمایش داده می‌شود: «۲۰ پروژه».</p>
                            </div>
                        ) : null}

                        <h3 className={mk.formSectionTitle}>مقدار پیش‌فرض</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>وقتی پلن مقداری ندارد</label>
                                <select value={defaultMode} onChange={(e) => setDefaultMode(e.target.value as typeof defaultMode)}>
                                    <option value="none">بسته (هیچ)</option>
                                    <option value="value">مقدار مشخص</option>
                                    {type === 'quantity' ? <option value="unlimited">نامحدود</option> : null}
                                </select>
                                <p className={hr.fieldHint}>برای پلن تازه‌ای که هنوز در ماتریس برای این ویژگی مقدار نگرفته.</p>
                            </div>
                            {defaultMode === 'value' ? (
                                <div className={mk.field}>
                                    <label>مقدار</label>
                                    {type === 'boolean' ? (
                                        <select value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)}>
                                            <option value="true">باز</option>
                                            <option value="false">قفل</option>
                                        </select>
                                    ) : (
                                        <input type="number" min={0} value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
                                    )}
                                    <p className={hr.fieldHint}>معمولاً همان مقدار پلن رایگان.</p>
                                </div>
                            ) : null}
                        </div>

                        <h3 className={mk.formSectionTitle}>نمایش در صفحه قیمت‌ها</h3>
                        <div className={hr.formRow}>
                            <div className={mk.field}>
                                <label>گروه</label>
                                <input list="feature-groups" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="مثلاً پشتیبانی" />
                                <datalist id="feature-groups">
                                    {groups.map((g) => <option key={g.slug} value={g.title} />)}
                                </datalist>
                                <p className={hr.fieldHint}>ردیف‌های جدول مقایسه زیر همین عنوان دسته‌بندی می‌شوند.</p>
                            </div>
                            <div className={mk.field}>
                                <label>ترتیب داخل گروه</label>
                                <input type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
                                <p className={hr.fieldHint}>عدد کوچک‌تر بالاتر.</p>
                            </div>
                        </div>
                        <div className={mk.field}>
                            <label>توضیح برای مشتری</label>
                            <input value={publicDescription} onChange={(e) => setPublicDescription(e.target.value)} placeholder="پاسخ تلفنی در ساعات اداری" />
                            <p className={hr.fieldHint}>یک خط ساده (tooltip جدول مقایسه)؛ اصطلاح فنی ننویسید.</p>
                        </div>
                        <ToggleField
                            title="نمایش در کارت قیمت"
                            hint="علاوه بر جدول مقایسه، زیر قیمت هر پلن هم دیده شود. فقط مهم‌ترین ۴–۶ ویژگی را روشن کنید."
                            checked={showInCard}
                            onChange={setShowInCard}
                        />
                        <div className={mk.field} style={{ marginTop: '1rem' }}>
                            <label>توضیح برای ادمین</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                            <p className={hr.fieldHint}>این ویژگی چه چیزی را کنترل می‌کند و مقدار مناسبش چیست.</p>
                        </div>

                        <div className={mk.formActions}>
                            <button type="button" className={mk.primaryBtn} disabled={saving || !name.trim() || !code.trim()} onClick={() => void save()}>
                                {saving ? 'در حال ذخیره…' : 'ذخیره ویژگی'}
                            </button>
                            <Link href="/subscription/features" className={mk.secondaryBtn}>انصراف</Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
