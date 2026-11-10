'use client';

import React, { useEffect, useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import styles from '../Support.module.scss';
import { SUPPORT_PRIORITY_LABELS, SUPPORT_STATUS_LABELS, SupportCategory, SupportTicketFilters } from '../lib/support-api';

type Props = {
    open: boolean;
    onClose: () => void;
    categories: SupportCategory[];
    filters: SupportTicketFilters;
    onApply: (filters: SupportTicketFilters) => void;
};

const EMPTY: SupportTicketFilters = { search: '', status: '', priority: '', categoryId: '', startDate: '', endDate: '' };

/**
 * پنجره‌ی فیلترهای پیشرفته تیکت‌ها — همه‌ی فیلترها منظم داخل یک ModalHelper
 */
export default function TicketFiltersModal({ open, onClose, categories, filters, onApply }: Props) {
    const [draft, setDraft] = useState<SupportTicketFilters>(filters);

    // هر بار باز شدن، فرم از فیلترهای جاری پر می‌شود
    useEffect(() => {
        if (open) setDraft({ ...EMPTY, ...filters });
    }, [open, filters]);

    const set = (key: keyof SupportTicketFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setDraft((prev) => ({ ...prev, [key]: e.target.value }));

    const apply = () => {
        onApply(draft);
        onClose();
    };

    const clear = () => {
        setDraft({ ...EMPTY });
        onApply({ ...EMPTY });
        onClose();
    };

    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            component={
                <div className={styles.filtersBody} aria-label="فیلترهای تیکت">
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>جستجوی عنوان تیکت:</label>
                            <input
                                type="text"
                                placeholder="کلمه کلیدی..."
                                value={draft.search || ''}
                                onChange={set('search')}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>وضعیت تیکت:</label>
                            <select value={draft.status || ''} onChange={set('status')} className={styles.filterSelect}>
                                <option value="">همه وضعیت‌ها</option>
                                {Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>اولویت:</label>
                            <select value={draft.priority || ''} onChange={set('priority')} className={styles.filterSelect}>
                                <option value="">همه اولویت‌ها</option>
                                {Object.entries(SUPPORT_PRIORITY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>دسته‌بندی:</label>
                            <select value={draft.categoryId || ''} onChange={set('categoryId')} className={styles.filterSelect}>
                                <option value="">همه دسته‌ها</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>از تاریخ:</label>
                            <input type="date" value={draft.startDate || ''} onChange={set('startDate')} className={styles.filterInput} />
                        </div>

                        <div className={styles.filterItem}>
                            <label>تا تاریخ:</label>
                            <input type="date" value={draft.endDate || ''} onChange={set('endDate')} className={styles.filterInput} />
                        </div>
                    </div>

                    <div className={styles.filtersActions}>
                        <button type="button" className={styles.primaryBtn} onClick={apply}>
                            اعمال فیلترها
                        </button>
                        <button type="button" className={styles.clearFiltersBtn} onClick={clear}>
                            پاک‌سازی همه
                        </button>
                    </div>
                </div>
            }
            sheetTitle="فیلترهای تیکت"
            size="720px"
        />
    );
}
