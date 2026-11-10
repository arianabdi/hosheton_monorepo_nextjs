'use client';

import Link from 'next/link';
import { useReferralData } from '../lib/ReferralAdminProvider';
import { referralHref } from '../lib/sections';
import { formatNumber, formatToman } from '../lib/format';
import type { ReferralAdminApi } from '../lib/referral-api';
import Guide from '../components/Guide';
import parentStyles from '../../Marketing.module.scss';
import styles from '../ReferralCode.module.scss';

const loadOverview = (api: ReferralAdminApi) => api.getOverview();

/** نمای کلی کد معرف — آمار، کارهای منتظر اقدام و آموزش کامل ماژول */
export default function ReferralOverviewPage() {
    const { data: overview, loading } = useReferralData(loadOverview);

    const stats = overview
        ? [
              { label: 'کمپین فعال', value: `${formatNumber(overview.activeCampaignCount)} از ${formatNumber(overview.campaignCount)}` },
              { label: 'دعوت‌شدگان', value: formatNumber(overview.totalReferrals) },
              { label: 'دعوت موفق', value: formatNumber(overview.successfulReferrals) },
              { label: 'در دوره بررسی', value: formatToman(overview.pendingAmount) },
              { label: 'آماده پرداخت', value: formatToman(overview.approvedAmount) },
              { label: 'پرداخت‌شده', value: formatToman(overview.paidAmount) },
          ]
        : [];

    const approvedCount = overview?.rewardByStatus?.APPROVED?.count || 0;
    const pendingCount = overview?.rewardByStatus?.PENDING?.count || 0;

    return (
        <>
            {!overview ? (
                loading && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                    </div>
                )
            ) : (
                <>
                    <div className={parentStyles.statsBar}>
                        {stats.map((s) => (
                            <div key={s.label} className={parentStyles.statCard}>
                                <div className={parentStyles.statValue}>{s.value}</div>
                                <div className={parentStyles.statLabel}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {(overview.activeCampaignCount === 0 || approvedCount > 0 || pendingCount > 0) && (
                        <ul className={styles.actionList}>
                            {overview.activeCampaignCount === 0 && (
                                <li>
                                    <span>
                                        <strong>هیچ کمپین فعالی نیست</strong> — لینک‌های دعوت ذخیره می‌شوند ولی تا فعال‌سازی یک کمپین به
                                        دعوت‌کننده وصل نمی‌شوند.
                                    </span>
                                    <Link href={referralHref.campaigns} className={styles.smallBtn}>
                                        کمپین‌ها
                                    </Link>
                                </li>
                            )}
                            {approvedCount > 0 && (
                                <li>
                                    <span>
                                        <strong>{formatNumber(approvedCount)} پاداش آماده پرداخت</strong> به کیف پول فروش دعوت‌کننده‌ها.
                                    </span>
                                    <Link href={referralHref.rewards('APPROVED')} className={`${styles.smallBtn} ${styles.primary}`}>
                                        پرداخت
                                    </Link>
                                </li>
                            )}
                            {pendingCount > 0 && (
                                <li>
                                    <span>
                                        <strong>{formatNumber(pendingCount)} پاداش در دوره بررسی</strong> — بعد از پایان دوره قابل تأیید
                                        است.
                                    </span>
                                    <Link href={referralHref.rewards('PENDING')} className={styles.smallBtn}>
                                        بررسی
                                    </Link>
                                </li>
                            )}
                        </ul>
                    )}
                </>
            )}

            <Guide
                icon="🎁"
                title="آموزش کد معرف"
                intro={
                    <>
                        هر کاربر استودیو یک کد و لینک دعوت ثابت دارد (در پروفایلش، تب «دعوت دوستان»). اینجا تعیین می‌کنید با
                        ثبت‌نام یا پرداخت دعوت‌شده‌ها چه پاداشی به دعوت‌کننده برسد و پاداش‌ها را تأیید و پرداخت می‌کنید. این ماژول
                        <strong> کد تخفیف</strong> نیست و به خریدار چیزی نمی‌دهد؛ فقط به دعوت‌کننده پاداش می‌دهد.
                    </>
                }
                cards={[
                    {
                        title: 'ترتیب راه‌اندازی',
                        ordered: true,
                        items: [
                            <>در «کمپین جدید» نام، بازه زمانی و شرایط (فقط کاربر جدید، دوره بررسی) را تعیین کنید.</>,
                            <>حداقل یک قانون پاداش بسازید: رویداد (ثبت‌نام / اولین پرداخت / هر پرداخت) + نوع و مقدار پاداش.</>,
                            <>کمپین را در تب <Link href={referralHref.campaigns}>کمپین‌ها</Link> «فعال» کنید؛ تا آن موقع هیچ دعوتی وصل نمی‌شود.</>,
                        ],
                    },
                    {
                        title: 'مسیر کاربر دعوت‌شده',
                        ordered: true,
                        items: [
                            <>لینک <span className={styles.codeCell}>studio.hosheton.com/?ref=CODE</span> را باز می‌کند؛ کد ۳۰ روز در مرورگرش می‌ماند.</>,
                            <>در صفحه ورود یادآوری کد را می‌بیند و با موبایل ثبت‌نام می‌کند.</>,
                            <>در «تکمیل پروفایل» کد پیش‌پر است (قابل ویرایش)؛ با ذخیره، به دعوت‌کننده وصل می‌شود.</>,
                        ],
                    },
                    {
                        title: 'چرخه پاداش',
                        items: [
                            <><strong>در دوره بررسی:</strong> تازه صادر شده؛ تا پایان دوره کمپین (مثلاً برای بازگشت وجه) قابل تأیید نیست.</>,
                            <><strong>آماده پرداخت:</strong> تأیید شده و منتظر واریز است.</>,
                            <><strong>پرداخت‌شده:</strong> به کیف پول فروش (تومانی) با نوع تراکنش «پاداش دعوت» واریز شد.</>,
                            <><strong>رد / لغو:</strong> با ثبت دلیل؛ در آمار کاربر حساب نمی‌شود.</>,
                        ],
                    },
                    {
                        title: 'ضدتقلب و اشتباهات رایج',
                        items: [
                            <>دعوت خود، اتصال دوباره به دعوت‌کننده دیگر و کاربر قدیمی (بیش از ۴۸ ساعت از ثبت‌نام) سمت سرور رد می‌شود.</>,
                            <>هر رویداد فقط یک‌بار پاداش می‌سازد؛ تغییر کمپین روی پاداش‌های صادرشده اثری ندارد.</>,
                            <>«درصد از سود» بدون داده سود پلتفرم پاداشی نمی‌سازد؛ برای خرید قالب «درصد از پرداخت» را بزنید.</>,
                        ],
                    },
                ]}
                example={
                    <>
                        کمپین «دعوت پاییز» با قانون «اولین پرداخت — ۱۰٪، سقف ۱۰۰٬۰۰۰ تومان» و دوره بررسی ۷ روز: دوست کاربر با لینک او
                        ثبت‌نام می‌کند و قالبی ۴۰۰٬۰۰۰ تومانی می‌خرد ← پاداش ۴۰٬۰۰۰ تومان «در دوره بررسی» ثبت می‌شود ← ۷ روز بعد در
                        تب <Link href={referralHref.rewards('PENDING')}>پاداش‌ها</Link> تأیید و سپس به کیف پول فروش دعوت‌کننده پرداخت
                        می‌شود.
                    </>
                }
                note={
                    <>
                        اگر چند کمپین هم‌زمان فعال باشد، دعوت جدید به قدیمی‌ترین کمپین فعال در بازه زمانی‌اش وصل می‌شود؛ برای
                        جلوگیری از ابهام همیشه فقط یک کمپین فعال نگه دارید.
                    </>
                }
            />
        </>
    );
}
