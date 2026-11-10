'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuArrowRight, LuPlus, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import ToggleField from '@/app/components/ToggleField/ToggleField';
import { useReferralAdmin } from '../lib/ReferralAdminProvider';
import { referralHref } from '../lib/sections';
import { isoToLocalInput, localInputToIso } from '../lib/format';
import {
    EMPTY_RULE_FORM,
    REWARD_TYPE_LABELS,
    TIER_METRIC_LABELS,
    TRIGGER_LABELS,
    type ReferralCampaignForm,
    type ReferralRewardType,
    type ReferralRuleForm,
    type ReferralTier,
    type ReferralTierMetric,
    type ReferralTriggerType,
} from '../lib/referral.types';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../ReferralCode.module.scss';

const TRIGGERS = Object.keys(TRIGGER_LABELS) as ReferralTriggerType[];
const REWARD_TYPES = Object.keys(REWARD_TYPE_LABELS) as ReferralRewardType[];
const TIER_METRICS = Object.keys(TIER_METRIC_LABELS) as ReferralTierMetric[];

const isPercent = (type: ReferralRewardType) => type !== 'FIXED_AMOUNT';

/** خطای اعتبارسنجی فرم یا null */
function validate(form: ReferralCampaignForm, rules: ReferralRuleForm[]): string | null {
    if (!form.name.trim()) return 'نام کمپین الزامی است.';
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) return 'تاریخ پایان باید بعد از تاریخ شروع باشد.';
    if (!rules.length) return 'حداقل یک قانون پاداش لازم است.';
    for (const [index, rule] of rules.entries()) {
        const label = rule.name.trim() || `شماره ${index + 1}`;
        if (!rule.name.trim()) return `نام قانون شماره ${index + 1} الزامی است.`;
        if (rule.rewardValue <= 0) return `مقدار پاداش قانون «${label}» باید بیشتر از صفر باشد.`;
        if (isPercent(rule.rewardType) && rule.rewardValue > 100) return `درصد پاداش قانون «${label}» نمی‌تواند بیش از ۱۰۰ باشد.`;
        if (rule.triggerType === 'SIGNUP' && isPercent(rule.rewardType)) {
            return `قانون «${label}»: ثبت‌نام مبلغی ندارد که درصدی از آن حساب شود؛ «مبلغ ثابت» را انتخاب کنید.`;
        }
        for (const tier of rule.tiered ? rule.tiers : []) {
            if (tier.maxCount !== null && tier.maxCount < tier.minCount) return `در قانون «${label}» «تا» هر پله باید از «از» بزرگ‌تر باشد.`;
        }
    }
    return null;
}

/**
 * فرم افزودن/ویرایش کمپین (قرارداد فرم‌های پنل: هدر + راهنمای قبل از ثبت + کارت فرم
 * بخش‌بندی‌شده با hint هر فیلد + اکشن‌ها). وضعیت کمپین در فهرست کمپین‌ها عوض می‌شود.
 */
export default function CampaignForm({
    campaignId,
    initialForm,
    initialRules,
}: {
    /** null = کمپین جدید */
    campaignId: string | null;
    initialForm: ReferralCampaignForm;
    initialRules: ReferralRuleForm[];
}) {
    const router = useRouter();
    const { api, invalidate } = useReferralAdmin();
    const [form, setForm] = useState(initialForm);
    const [rules, setRules] = useState<ReferralRuleForm[]>(initialRules.length ? initialRules : [{ ...EMPTY_RULE_FORM }]);
    const [activateAfterSave, setActivateAfterSave] = useState(false);
    const [saving, setSaving] = useState(false);
    const isNew = !campaignId;

    const patchForm = (patch: Partial<ReferralCampaignForm>) => setForm((prev) => ({ ...prev, ...patch }));
    const patchRule = (index: number, patch: Partial<ReferralRuleForm>) =>
        setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    const patchTier = (ruleIndex: number, tierIndex: number, patch: Partial<ReferralTier>) =>
        patchRule(ruleIndex, { tiers: rules[ruleIndex].tiers.map((tier, i) => (i === tierIndex ? { ...tier, ...patch } : tier)) });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!api) return;
        const error = validate(form, rules);
        if (error) {
            ErrorToaster({ message: error });
            return;
        }
        setSaving(true);
        try {
            // وضعیت فقط از فهرست کمپین‌ها عوض می‌شود — status در ویرایش ارسال نمی‌شود (undefined از JSON حذف می‌شود)
            const saved = isNew
                ? await api.createCampaign({ ...form, status: 'DRAFT' })
                : await api.updateCampaign(campaignId, { ...form, status: undefined });

            // همگام‌سازی قوانین با شناسه: موجودها به‌روزرسانی، جدیدها ساخته، حذف‌شده‌ها پاک می‌شوند
            const kept = new Set<string>();
            for (const rule of rules) {
                const payload = rule.tiered && !rule.tiers.length
                    ? { ...rule, tiers: [{ minCount: 0, maxCount: null, rewardType: rule.rewardType, rewardValue: rule.rewardValue }] }
                    : rule;
                if (rule._id) {
                    await api.updateRule(rule._id, payload);
                    kept.add(rule._id);
                } else {
                    await api.createRule(saved._id, payload);
                }
            }
            for (const original of initialRules) {
                if (original._id && !kept.has(original._id)) await api.deleteRule(original._id);
            }
            if (isNew && activateAfterSave) await api.setCampaignStatus(saved._id, 'ACTIVE');

            SuccessToaster({ message: isNew ? `کمپین «${form.name}» ساخته شد.` : `کمپین «${form.name}» ذخیره شد.` });
            invalidate();
            router.push(referralHref.campaigns);
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
                            <Link href={referralHref.campaigns} className={parentStyles.backLink}>
                                <LuArrowRight /> بازگشت به کمپین‌ها
                            </Link>
                            <h1 className={parentStyles.mainTitle}>{isNew ? 'افزودن کمپین دعوت' : `ویرایش کمپین «${initialForm.name}»`}</h1>
                            <p className={parentStyles.subtitle}>شرایط کمپین و قوانینی که تعیین می‌کنند دعوت‌کننده بابت چه رویدادی چه پاداشی بگیرد.</p>
                        </div>
                    </header>

                    <div className={hrStyles.formGuideCard}>
                        <h3>قبل از ثبت</h3>
                        <p>
                            هر قانون یعنی «وقتی دعوت‌شده این کار را کرد، این مقدار به دعوت‌کننده بده». بدون فعال‌کردن «ترکیب قوانین»، در هر
                            رویداد فقط قانون با اولویت بالاتر (عدد کوچک‌تر) اجرا می‌شود. پاداش‌های صادرشده با ویرایش کمپین تغییر نمی‌کنند.
                        </p>
                    </div>

                    <form className={parentStyles.formCard} onSubmit={submit}>
                        <h2 className={parentStyles.formSectionTitle}>۱. مشخصات کمپین</h2>
                        <div className={parentStyles.formSection}>
                            <div className={parentStyles.field}>
                                <label htmlFor="campaign-name">نام کمپین</label>
                                <input
                                    id="campaign-name"
                                    value={form.name}
                                    maxLength={120}
                                    onChange={(e) => patchForm({ name: e.target.value })}
                                    placeholder="مثلاً: دعوت دوستان — پاییز ۱۴۰۵"
                                />
                                <p className={parentStyles.fieldHint}>فقط در پنل دیده می‌شود؛ کاربر نام کمپین را نمی‌بیند.</p>
                            </div>
                            <div className={parentStyles.field}>
                                <label htmlFor="campaign-description">توضیحات</label>
                                <textarea
                                    id="campaign-description"
                                    value={form.description}
                                    maxLength={1000}
                                    onChange={(e) => patchForm({ description: e.target.value })}
                                    placeholder="هدف کمپین و هر توافقی که باید یادتان بماند."
                                />
                                <p className={parentStyles.fieldHint}>یادداشت داخلی برای تیم مارکتینگ.</p>
                            </div>
                            {isNew && (
                                <ToggleField
                                    title="بعد از ثبت فعال شود"
                                    hint="خاموش = پیش‌نویس می‌ماند و بعداً از فهرست کمپین‌ها فعالش می‌کنید."
                                    checked={activateAfterSave}
                                    onChange={setActivateAfterSave}
                                />
                            )}
                        </div>

                        <h2 className={parentStyles.formSectionTitle}>۲. زمان‌بندی</h2>
                        <div className={`${parentStyles.formSection} ${styles.formGrid}`}>
                            <div className={parentStyles.field}>
                                <label htmlFor="campaign-start">تاریخ شروع</label>
                                <input
                                    id="campaign-start"
                                    type="datetime-local"
                                    value={isoToLocalInput(form.startAt)}
                                    onChange={(e) => patchForm({ startAt: localInputToIso(e.target.value) })}
                                />
                                <p className={parentStyles.fieldHint}>خالی = از همان لحظه فعال‌سازی.</p>
                            </div>
                            <div className={parentStyles.field}>
                                <label htmlFor="campaign-end">تاریخ پایان</label>
                                <input
                                    id="campaign-end"
                                    type="datetime-local"
                                    value={isoToLocalInput(form.endAt)}
                                    onChange={(e) => patchForm({ endAt: localInputToIso(e.target.value) })}
                                />
                                <p className={parentStyles.fieldHint}>خالی = بدون تاریخ پایان. بعد از پایان، دعوت جدیدی به کمپین وصل نمی‌شود.</p>
                            </div>
                        </div>

                        <h2 className={parentStyles.formSectionTitle}>۳. شرایط و ضدتقلب</h2>
                        <div className={parentStyles.formSection}>
                            <ToggleField
                                title="فقط کاربران جدید"
                                hint="کد دعوت فقط برای حسابی پذیرفته می‌شود که در ۴۸ ساعت اخیر ساخته شده؛ جلوی اتصال حساب‌های قدیمی را می‌گیرد."
                                checked={form.newCustomerOnly}
                                onChange={(newCustomerOnly) => patchForm({ newCustomerOnly })}
                            />
                            <ToggleField
                                title="ترکیب قوانین در یک رویداد"
                                hint="روشن = اگر چند قانون با یک رویداد جور شوند، همه پاداش می‌دهند. خاموش (پیشنهادی) = فقط بالاترین اولویت."
                                checked={form.allowMultipleRewards}
                                onChange={(allowMultipleRewards) => patchForm({ allowMultipleRewards })}
                            />
                            <div className={styles.formGrid}>
                                <div className={parentStyles.field}>
                                    <label htmlFor="campaign-max">حداکثر پاداش هر دعوت‌کننده</label>
                                    <input
                                        id="campaign-max"
                                        type="number"
                                        min={1}
                                        dir="ltr"
                                        value={form.maxRewardsPerCustomer}
                                        onChange={(e) => patchForm({ maxRewardsPerCustomer: Math.max(1, Number(e.target.value) || 1) })}
                                    />
                                    <p className={parentStyles.fieldHint}>تعداد پاداش (نه مبلغ) که یک نفر در این کمپین می‌تواند بگیرد.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label htmlFor="campaign-review">دوره بررسی پاداش (روز)</label>
                                    <input
                                        id="campaign-review"
                                        type="number"
                                        min={0}
                                        dir="ltr"
                                        value={form.reviewPeriodDays}
                                        onChange={(e) => patchForm({ reviewPeriodDays: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                    <p className={parentStyles.fieldHint}>پاداش تا این مدت قابل تأیید نیست تا بازگشت وجه‌ها مشخص شوند. ۰ = فوری.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label htmlFor="campaign-min-order">حداقل مبلغ خرید (تومان)</label>
                                    <input
                                        id="campaign-min-order"
                                        type="number"
                                        min={0}
                                        dir="ltr"
                                        value={form.minimumOrderAmount}
                                        onChange={(e) => patchForm({ minimumOrderAmount: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                    <p className={parentStyles.fieldHint}>خریدهای کمتر از این مبلغ هیچ پاداشی نمی‌سازند. ۰ = بدون شرط.</p>
                                </div>
                            </div>
                        </div>

                        <h2 className={parentStyles.formSectionTitle}>۴. قوانین پاداش</h2>
                        {rules.map((rule, ruleIndex) => (
                            <div key={rule._id || `new-${ruleIndex}`} className={styles.ruleCard}>
                                <div className={styles.ruleHeader}>
                                    <span>قانون {ruleIndex + 1}{rule.name ? ` — ${rule.name}` : ''}</span>
                                    {rules.length > 1 && (
                                        <button
                                            type="button"
                                            className={`${styles.smallBtn} ${styles.danger}`}
                                            onClick={() => setRules((prev) => prev.filter((_, i) => i !== ruleIndex))}
                                        >
                                            <LuTrash2 /> حذف قانون
                                        </button>
                                    )}
                                </div>
                                <div className={styles.formGrid}>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-name-${ruleIndex}`}>نام قانون</label>
                                        <input
                                            id={`rule-name-${ruleIndex}`}
                                            value={rule.name}
                                            maxLength={120}
                                            onChange={(e) => patchRule(ruleIndex, { name: e.target.value })}
                                            placeholder="مثلاً: پاداش اولین خرید"
                                        />
                                        <p className={parentStyles.fieldHint}>در پاداش‌ها و کیف پول دعوت‌کننده نمایش داده می‌شود.</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-trigger-${ruleIndex}`}>رویداد</label>
                                        <select
                                            id={`rule-trigger-${ruleIndex}`}
                                            value={rule.triggerType}
                                            onChange={(e) => {
                                                const triggerType = e.target.value as ReferralTriggerType;
                                                patchRule(ruleIndex, triggerType === 'SIGNUP' ? { triggerType, rewardType: 'FIXED_AMOUNT' } : { triggerType });
                                            }}
                                        >
                                            {TRIGGERS.map((trigger) => (
                                                <option key={trigger} value={trigger}>
                                                    {TRIGGER_LABELS[trigger]}
                                                </option>
                                            ))}
                                        </select>
                                        <p className={parentStyles.fieldHint}>ثبت‌نام = همان لحظه اتصال کد؛ پرداخت = هر خرید قالب دعوت‌شده.</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-type-${ruleIndex}`}>نوع پاداش</label>
                                        <select
                                            id={`rule-type-${ruleIndex}`}
                                            value={rule.rewardType}
                                            onChange={(e) => patchRule(ruleIndex, { rewardType: e.target.value as ReferralRewardType })}
                                        >
                                            {REWARD_TYPES.filter((type) => rule.triggerType !== 'SIGNUP' || type === 'FIXED_AMOUNT').map((type) => (
                                                <option key={type} value={type}>
                                                    {REWARD_TYPE_LABELS[type]}
                                                </option>
                                            ))}
                                        </select>
                                        <p className={parentStyles.fieldHint}>«درصد از سود» فقط وقتی سود پلتفرم ثبت شود پاداش می‌سازد.</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-value-${ruleIndex}`}>{isPercent(rule.rewardType) ? 'درصد پاداش' : 'مبلغ پاداش (تومان)'}</label>
                                        <input
                                            id={`rule-value-${ruleIndex}`}
                                            type="number"
                                            min={0}
                                            max={isPercent(rule.rewardType) ? 100 : undefined}
                                            dir="ltr"
                                            value={rule.rewardValue}
                                            onChange={(e) => patchRule(ruleIndex, { rewardValue: Math.max(0, Number(e.target.value) || 0) })}
                                        />
                                        <p className={parentStyles.fieldHint}>{isPercent(rule.rewardType) ? 'مثلاً ۱۰ یعنی ۱۰٪ مبلغ خرید.' : 'به کیف پول فروش دعوت‌کننده واریز می‌شود.'}</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-cap-${ruleIndex}`}>سقف پاداش هر رویداد (تومان)</label>
                                        <input
                                            id={`rule-cap-${ruleIndex}`}
                                            type="number"
                                            min={0}
                                            dir="ltr"
                                            value={rule.rewardCap}
                                            onChange={(e) => patchRule(ruleIndex, { rewardCap: Math.max(0, Number(e.target.value) || 0) })}
                                        />
                                        <p className={parentStyles.fieldHint}>برای پاداش درصدی مهم است. ۰ = بدون سقف.</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-min-${ruleIndex}`}>حداقل مبلغ تراکنش (تومان)</label>
                                        <input
                                            id={`rule-min-${ruleIndex}`}
                                            type="number"
                                            min={0}
                                            dir="ltr"
                                            value={rule.minimumTransactionAmount}
                                            onChange={(e) => patchRule(ruleIndex, { minimumTransactionAmount: Math.max(0, Number(e.target.value) || 0) })}
                                        />
                                        <p className={parentStyles.fieldHint}>فقط برای همین قانون؛ ۰ = بدون شرط.</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label htmlFor={`rule-priority-${ruleIndex}`}>اولویت</label>
                                        <input
                                            id={`rule-priority-${ruleIndex}`}
                                            type="number"
                                            min={1}
                                            dir="ltr"
                                            value={rule.priority}
                                            onChange={(e) => patchRule(ruleIndex, { priority: Math.max(1, Number(e.target.value) || 1) })}
                                        />
                                        <p className={parentStyles.fieldHint}>عدد کوچک‌تر = اولویت بالاتر.</p>
                                    </div>
                                </div>
                                <ToggleField
                                    title="قانون فعال باشد"
                                    hint="قانون غیرفعال پاداشی نمی‌سازد ولی پاداش‌های قبلی‌اش باقی می‌مانند."
                                    checked={rule.isActive}
                                    onChange={(isActive) => patchRule(ruleIndex, { isActive })}
                                />
                                <ToggleField
                                    title="پاداش پلکانی (Tier)"
                                    hint="مقدار پاداش بر اساس عملکرد دعوت‌کننده عوض می‌شود؛ مثلاً از دعوت دهم به بعد پاداش بیشتر."
                                    checked={rule.tiered}
                                    onChange={(tiered) => patchRule(ruleIndex, { tiered })}
                                />
                                {rule.tiered && (
                                    <div className={styles.tiers}>
                                        <div className={parentStyles.field}>
                                            <label htmlFor={`rule-metric-${ruleIndex}`}>معیار پله‌ها</label>
                                            <select
                                                id={`rule-metric-${ruleIndex}`}
                                                value={rule.tierMetric}
                                                onChange={(e) => patchRule(ruleIndex, { tierMetric: e.target.value as ReferralTierMetric })}
                                            >
                                                {TIER_METRICS.map((metric) => (
                                                    <option key={metric} value={metric}>
                                                        {TIER_METRIC_LABELS[metric]}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className={parentStyles.fieldHint}>«از/تا» هر پله بر حسب همین معیار است؛ «تا» خالی = بدون سقف.</p>
                                        </div>
                                        <div className={`${styles.tierRow} ${styles.tierHead}`}>
                                            <span>از</span>
                                            <span>تا</span>
                                            <span>نوع پاداش</span>
                                            <span>مقدار</span>
                                            <span />
                                        </div>
                                        {rule.tiers.map((tier, tierIndex) => (
                                            <div key={tierIndex} className={styles.tierRow}>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    dir="ltr"
                                                    aria-label="از"
                                                    value={tier.minCount}
                                                    onChange={(e) => patchTier(ruleIndex, tierIndex, { minCount: Math.max(0, Number(e.target.value) || 0) })}
                                                />
                                                <input
                                                    type="number"
                                                    min={0}
                                                    dir="ltr"
                                                    aria-label="تا"
                                                    placeholder="بدون سقف"
                                                    value={tier.maxCount ?? ''}
                                                    onChange={(e) => patchTier(ruleIndex, tierIndex, { maxCount: e.target.value === '' ? null : Number(e.target.value) })}
                                                />
                                                <select
                                                    aria-label="نوع پاداش"
                                                    value={tier.rewardType}
                                                    onChange={(e) => patchTier(ruleIndex, tierIndex, { rewardType: e.target.value as ReferralRewardType })}
                                                >
                                                    {REWARD_TYPES.map((type) => (
                                                        <option key={type} value={type}>
                                                            {REWARD_TYPE_LABELS[type]}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    dir="ltr"
                                                    aria-label="مقدار"
                                                    value={tier.rewardValue}
                                                    onChange={(e) => patchTier(ruleIndex, tierIndex, { rewardValue: Math.max(0, Number(e.target.value) || 0) })}
                                                />
                                                <button
                                                    type="button"
                                                    className={`${styles.smallBtn} ${styles.danger}`}
                                                    aria-label="حذف پله"
                                                    onClick={() => patchRule(ruleIndex, { tiers: rule.tiers.filter((_, i) => i !== tierIndex) })}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className={styles.smallBtn}
                                            onClick={() =>
                                                patchRule(ruleIndex, {
                                                    tiers: [...rule.tiers, { minCount: 0, maxCount: null, rewardType: rule.rewardType, rewardValue: rule.rewardValue }],
                                                })
                                            }
                                        >
                                            <LuPlus /> افزودن پله
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            className={`${parentStyles.secondaryBtn} ${styles.addBtn}`}
                            onClick={() => setRules((prev) => [...prev, { ...EMPTY_RULE_FORM, priority: prev.length * 10 + 10 }])}
                        >
                            <LuPlus /> افزودن قانون
                        </button>

                        <div className={hrStyles.formNoteBox}>
                            بعد از ذخیره، کمپین{isNew && !activateAfterSave ? ' پیش‌نویس می‌ماند و' : ''} در تب «کمپین‌ها» قابل فعال‌سازی، توقف یا پایان
                            است. فقط دعوت‌هایی که بعد از فعال‌سازی ثبت شوند به این کمپین وصل می‌شوند.
                        </div>

                        <div className={parentStyles.formActions}>
                            <button type="submit" className={parentStyles.primaryBtn} disabled={saving || !api}>
                                {saving ? 'در حال ذخیره…' : isNew ? 'ثبت کمپین' : 'ذخیره تغییرات'}
                            </button>
                            <Link href={referralHref.campaigns} className={parentStyles.secondaryBtn}>
                                انصراف
                            </Link>
                        </div>
                    </form>
                </div>
            </Wrapper>
        </Container>
    );
}
