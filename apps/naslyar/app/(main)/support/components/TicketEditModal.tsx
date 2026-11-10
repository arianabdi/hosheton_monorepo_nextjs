'use client';

import React, { useEffect, useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from '../Support.module.scss';
import {
    SUPPORT_PRIORITY_LABELS,
    SUPPORT_STATUS_LABELS,
    SupportCategory,
    SupportTicketItem,
    updateTicketAdmin,
} from '../lib/support-api';

type Props = {
    open: boolean;
    onClose: () => void;
    categories: SupportCategory[];
    ticket: SupportTicketItem | null;
    baseUrl: string;
    token: string | null;
    onSaved: (updated: SupportTicketItem) => void;
};

/**
 * ویرایش عملیاتی تیکت از منوی اکشن — وضعیت، اولویت و دسته‌بندی
 */
export default function TicketEditModal({ open, onClose, categories, ticket, baseUrl, token, onSaved }: Props) {
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && ticket) {
            setStatus(ticket.status || '');
            setPriority(ticket.priority || '');
            setCategoryId(ticket.categoryId?._id || '');
        }
    }, [open, ticket]);

    const save = async () => {
        if (!ticket || saving) return;
        try {
            setSaving(true);
            const updated = await updateTicketAdmin(baseUrl, token, ticket._id, {
                status: status || undefined,
                priority: priority || undefined,
                categoryId: categoryId || null,
            });
            SuccessToaster('تغییرات تیکت با موفقیت ذخیره شد.');
            onSaved(updated);
            onClose();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalHelper
            open={open && Boolean(ticket)}
            onClose={onClose}
            component={
                <div className={styles.editForm} aria-label="ویرایش تیکت">
                    <div className={styles.filterItem}>
                        <label>وضعیت تیکت:</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.filterSelect}>
                            {Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterItem}>
                        <label>اولویت:</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={styles.filterSelect}>
                            {Object.entries(SUPPORT_PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterItem}>
                        <label>دسته‌بندی:</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={styles.filterSelect}>
                            <option value="">بدون دسته‌بندی</option>
                            {categories.map((c) => (
                                <option key={c._id} value={c._id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    {!categories.length ? (
                        <p className={styles.editHint}>
                            هنوز دسته‌بندی‌ای ثبت نشده — از بخش «دسته‌بندی‌ها» می‌توانید دسته‌هایی مثل «تسویه حساب» بسازید.
                        </p>
                    ) : null}

                    <div className={styles.filtersActions}>
                        <button type="button" className={styles.primaryBtn} onClick={() => void save()} disabled={saving}>
                            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                        <button type="button" className={styles.clearFiltersBtn} onClick={onClose} disabled={saving}>
                            انصراف
                        </button>
                    </div>
                </div>
            }
            sheetTitle={`ویرایش تیکت: ${ticket?.title || ''}`}
            size="560px"
        />
    );
}
