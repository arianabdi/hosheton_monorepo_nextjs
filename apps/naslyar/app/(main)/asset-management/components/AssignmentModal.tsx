'use client';

import React from 'react';
import { AdminUserListItem, fetchAdminUserList, formatAdminUserLabel } from '@/app/(main)/users/user-list-api';
import { AssetItem, AssetLocation } from '../asset-management-api';
import { ALL_ASSET_STATUSES, ASSET_STATUS_LABELS } from '../asset-management.utils';
import { jalaliStringToIso } from '../jalali.client';
import ModuleGuide from './ModuleGuide';
import { ASSET_GUIDES } from './guides';
import styles from '../AssetManagement.module.scss';

export type AssignmentMode = 'assign' | 'return' | 'transfer' | 'status';

interface AssignmentModalProps {
    mode: AssignmentMode;
    asset: AssetItem;
    locations: AssetLocation[];
    /** id تگ form — دکمه ثبت در فوتر مودال با همین id بایند می‌شود */
    formId: string;
    onSubmit: (body: Record<string, unknown>) => void;
}

const MODE_TITLES: Record<AssignmentMode, string> = {
    assign: 'تحویل دارایی',
    return: 'برگشت دارایی',
    transfer: 'انتقال دارایی',
    status: 'تغییر وضعیت',
};
export { MODE_TITLES };

/**
 * مودال عملیات چرخه تحویل: تحویل به کارمند، برگشت، انتقال و تغییر وضعیت.
 * لیست کاربران از ماژول user (API اصلی لاگین) گرفته می‌شود.
 */
export default function AssignmentModal({ mode, asset, locations, formId, onSubmit }: AssignmentModalProps) {
    const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
    const [usersLoading, setUsersLoading] = React.useState(true);
    const [usersFailed, setUsersFailed] = React.useState(false);
    const [toUserId, setToUserId] = React.useState('');
    const [locationId, setLocationId] = React.useState(asset.locationId || '');
    const [unit, setUnit] = React.useState(asset.unit || '');
    const [status, setStatus] = React.useState('');
    const [date, setDate] = React.useState('');
    const [notes, setNotes] = React.useState('');

    React.useEffect(() => {
        let mounted = true;
        fetchAdminUserList({ limit: 500, page: 1 })
            .then(({ users: list }) => {
                if (mounted) setUsers(list || []);
            })
            .catch(() => {
                /* در نبود دسترسی، ورودی دستی toName استفاده می‌شود */
                if (mounted) setUsersFailed(true);
            })
            .finally(() => {
                if (mounted) setUsersLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const statusOptions = ALL_ASSET_STATUSES.filter((s) => s !== asset.status);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const body: Record<string, unknown> = {};
        if (date.trim()) {
            const iso = jalaliStringToIso(date);
            if (!iso) {
                alert('تاریخ نامعتبر است — قالب درست: ۱۴۰۳/۰۴/۱۲');
                return;
            }
            body.date = iso;
        }
        if (notes.trim()) body.notes = notes.trim();

        if (mode === 'assign') {
            if (!toUserId) {
                alert('تحویل‌گیرنده را انتخاب کنید');
                return;
            }
            body.toUserId = toUserId;
        } else if (mode === 'transfer') {
            // فقط مقادیر واقعاً تغییرکرده ارسال می‌شود؛ مقدار پیش‌فرضِ هم‌سان با شناسنامه نباید فرستاده شود
            // (محلِ تکراری ممکن است حذف/متعلق به دیگری باشد و واحدِ خالی، واحدِ فعلی را پاک می‌کند)
            const locationChanged = !!locationId && locationId !== (asset.locationId || '');
            const unitChanged = unit.trim() !== (asset.unit || '');
            if (!toUserId && !locationChanged && !unitChanged) {
                alert('حداقل تحویل‌گیرنده، محل استقرار یا واحد سازمانی را تغییر دهید');
                return;
            }
            if (toUserId) body.toUserId = toUserId;
            if (locationChanged) body.locationId = locationId;
            if (unitChanged) body.unit = unit.trim();
        } else if (mode === 'status') {
            if (!status) {
                alert('وضعیت جدید را انتخاب کنید');
                return;
            }
            body.status = status;
        }
        onSubmit(body);
    };

    return (
        <form id={formId} className={styles.modalForm} onSubmit={submit}>
            <p className={styles.subtitle} style={{ marginTop: 0 }}>
                {asset.assetCode} — {asset.title}
            </p>

            {mode === 'assign' && (
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label>تحویل‌گیرنده *</label>
                        <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
                            <option value="">{usersLoading ? 'در حال بارگذاری...' : '— انتخاب کنید —'}</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {formatAdminUserLabel(u)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {mode === 'transfer' && (
                <>
                <ModuleGuide guide={ASSET_GUIDES.transfer} defaultExpanded={false} />
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label>تحویل‌گیرنده جدید</label>
                        <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
                            <option value="">
                                {usersLoading ? 'در حال بارگذاری...' : '— بدون تغییر —'}
                            </option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {formatAdminUserLabel(u)}
                                </option>
                            ))}
                        </select>
                        {usersFailed ? (
                            <span className={styles.fieldHint} style={{ color: '#c0392b' }}>
                                فهرست کاربران از سرور اصلی دریافت نشد؛ اتصال به سرورِ انتخاب‌شده هنگام ورود را
                                بررسی کنید. تا آن موقع می‌توانید فقط محل استقرار یا واحد سازمانی را تغییر دهید.
                            </span>
                        ) : null}
                    </div>
                    <div className={styles.field}>
                        <label>محل استقرار جدید</label>
                        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                            <option value="">— بدون تغییر —</option>
                            {locations.map((l) => (
                                <option key={l._id} value={l._id}>
                                    {l.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label>واحد سازمانی</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="مثال: واحد مالی"
                        />
                    </div>
                </div>
                </>
            )}

            {mode === 'status' && (
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label>وضعیت جدید *</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">— انتخاب کنید —</option>
                            {statusOptions.map((s) => (
                                <option key={s} value={s}>
                                    {ASSET_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        <span className={styles.fieldHint}>
                            برای تحویل/برگشت از دکمه‌های مخصوص همان عملیات استفاده کنید.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>تاریخ عملیات (شمسی)</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        placeholder="خالی = امروز"
                    />
                </div>
                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <label>توضیحات / صورتجلسه</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </div>
        </form>
    );
}
