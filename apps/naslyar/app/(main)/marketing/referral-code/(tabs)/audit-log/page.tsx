'use client';

import { useReferralData } from '../../lib/ReferralAdminProvider';
import { formatDate } from '../../lib/format';
import { CAMPAIGN_STATUS_LABELS, REVIEW_ACTION_LABELS, type ReferralCampaignStatus, type RewardReviewAction } from '../../lib/referral.types';
import type { ReferralAdminApi } from '../../lib/referral-api';
import Guide from '../../components/Guide';
import styles from '../../ReferralCode.module.scss';

const loadAuditLogs = (api: ReferralAdminApi) => api.listAuditLogs(200);

const ENTITY_LABELS: Record<string, string> = {
    ReferralCampaign: 'کمپین',
    ReferralRule: 'قانون پاداش',
    ReferralReward: 'پاداش',
};

const BASIC_ACTIONS: Record<string, string> = { create: 'ایجاد', update: 'ویرایش', delete: 'حذف' };

/** «status:ACTIVE» و «reward:pay» به متن فارسی */
function actionLabel(action: string): string {
    if (BASIC_ACTIONS[action]) return BASIC_ACTIONS[action];
    const [kind, value] = action.split(':');
    if (kind === 'status') return `تغییر وضعیت به «${CAMPAIGN_STATUS_LABELS[value as ReferralCampaignStatus] || value}»`;
    if (kind === 'reward') return REVIEW_ACTION_LABELS[value as RewardReviewAction] || action;
    return action;
}

/** گزارش تغییرات — چه کسی، چه زمانی، روی کدام کمپین/قانون/پاداش چه کرد */
export default function ReferralAuditLogPage() {
    const { data: logs, loading } = useReferralData(loadAuditLogs);

    return (
        <>
            <Guide
                icon="🧾"
                title="گزارش تغییرات"
                intro="هر ساخت/ویرایش کمپین و قانون، تغییر وضعیت و تصمیم روی پاداش با نام ادمین ثبت می‌شود؛ برای پیگیری اختلاف حساب یا شکایت کاربر از همین‌جا شروع کنید."
                cards={[
                    {
                        title: 'چه چیزهایی ثبت می‌شود',
                        items: [
                            <>ایجاد، ویرایش و حذف کمپین‌ها و قوانین پاداش.</>,
                            <>فعال‌سازی، توقف و پایان کمپین.</>,
                            <>تأیید، رد، لغو و پرداخت هر پاداش (با دلیل).</>,
                        ],
                    },
                ]}
            />

            {!logs ? (
                loading && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                    </div>
                )
            ) : logs.length === 0 ? (
                <div className={styles.emptyState}>هنوز تغییری ثبت نشده است.</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>زمان</th>
                                <th>ادمین</th>
                                <th>عملیات</th>
                                <th>موضوع</th>
                                <th>شناسه</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log._id}>
                                    <td data-label="زمان" className={styles.muted}>{formatDate(log.createdAt, true)}</td>
                                    <td data-label="ادمین">{log.actorName || <span className={styles.codeCell}>{log.actorId}</span>}</td>
                                    <td data-label="عملیات">{actionLabel(log.action)}</td>
                                    <td data-label="موضوع">{ENTITY_LABELS[log.entityType] || log.entityType}</td>
                                    <td data-label="شناسه" className={`${styles.codeCell} ${styles.muted}`}>{log.entityId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
