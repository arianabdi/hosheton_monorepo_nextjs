'use client';

import { toFarsiNumber } from '@my-workspace/utils';
import styles from './ChecklistProgress.module.scss';

/** خروجی GET /api/provider-models/checklist-summary */
export interface ChecklistSummary {
    activeModels: number;
    checklistItems: number;
    total: number;
    done: number;
    completeModels: number;
    untouchedModels: number;
    items: Array<{ _id: string; title: string; done: number }>;
}

const fa = (value: number) => toFarsiNumber(String(value));
const percent = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

function statusOf(pct: number): { label: string; tone: 'good' | 'mid' | 'low' } {
    if (pct >= 90) return { label: 'تقریباً آماده', tone: 'good' };
    if (pct >= 50) return { label: 'در حال تکمیل', tone: 'mid' };
    return { label: 'عقب از برنامه', tone: 'low' };
}

/**
 * وضعیت کلی چک‌لیست همهٔ مدل‌های فعال (نه فقط صفحهٔ فعلی جدول):
 * نوار کلی + شمارش مدل‌های کامل/شروع‌نشده (کلیک = فیلتر جدول) + پیشرفت هر آیتم چک‌لیست.
 */
export default function ChecklistProgress({
    summary,
    loading,
    onFilter,
}: {
    summary: ChecklistSummary | null;
    loading: boolean;
    /** eq100 | zero | partial → فیلتر جدول روی مدل‌های فعال */
    onFilter: (progress: 'eq100' | 'zero' | 'partial') => void;
}) {
    if (!summary) {
        return loading ? <section className={`${styles.card} ${styles.skeleton}`} aria-busy="true" /> : null;
    }
    if (!summary.checklistItems) {
        return (
            <section className={styles.card}>
                <p className={styles.empty}>هنوز آیتمی برای چک‌لیست مدل‌ها تعریف نشده — از تنظیمات هوش مصنوعی اضافه کنید.</p>
            </section>
        );
    }

    const pct = percent(summary.done, summary.total);
    const status = statusOf(pct);
    const partial = Math.max(0, summary.activeModels - summary.completeModels - summary.untouchedModels);

    return (
        <section className={`${styles.card} ${loading ? styles.stale : ''}`} aria-label="وضعیت چک‌لیست مدل‌های فعال">
            <div className={styles.head}>
                <div className={styles.headText}>
                    <h3>آمادگی مدل‌های فعال</h3>
                    <p>
                        {fa(summary.done)} از {fa(summary.total)} آیتم چک‌لیست انجام شده
                        <span className={styles.dot}>·</span>
                        <span className={styles.headMeta}>{fa(summary.activeModels)} مدل فعال × {fa(summary.checklistItems)} آیتم</span>
                    </p>
                </div>
                <div className={styles.headValue}>
                    <strong>{fa(pct)}٪</strong>
                    <span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span>
                </div>
            </div>

            <div
                className={styles.bar}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="درصد انجام چک‌لیست"
            >
                <div className={`${styles.fill} ${styles[status.tone]}`} style={{ width: `${pct}%` }} />
            </div>

            <div className={styles.counts}>
                <button type="button" onClick={() => onFilter('eq100')} title="نمایش مدل‌های فعالِ کامل در جدول">
                    <span className={`${styles.swatch} ${styles.good}`} /> {fa(summary.completeModels)} مدل کامل
                </button>
                <button type="button" onClick={() => onFilter('partial')} title="نمایش مدل‌های فعالِ نیمه‌کاره در جدول">
                    <span className={`${styles.swatch} ${styles.mid}`} /> {fa(partial)} نیمه‌کاره
                </button>
                <button type="button" onClick={() => onFilter('zero')} title="نمایش مدل‌های فعالی که هیچ آیتمی ندارند">
                    <span className={`${styles.swatch} ${styles.low}`} /> {fa(summary.untouchedModels)} شروع‌نشده
                </button>
            </div>

            <ul className={styles.items}>
                {summary.items.map((item) => {
                    const itemPct = percent(item.done, summary.activeModels);
                    return (
                        <li key={item._id} className={styles.item} title={`${item.title}: ${fa(item.done)} از ${fa(summary.activeModels)} مدل فعال`}>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <span className={styles.itemBar}>
                                <span className={`${styles.itemFill} ${styles[statusOf(itemPct).tone]}`} style={{ width: `${itemPct}%` }} />
                            </span>
                            <span className={styles.itemCount}>{fa(item.done)}/{fa(summary.activeModels)}</span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
