'use client';

import React, { useEffect, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Documents.module.scss';
import type { AccessRoleItem } from '../../../users/access-api';
import type { DocumentFileMeta } from '../documents.types';

type Props = {
    open: boolean;
    fileName: string;
    initialMeta: Partial<DocumentFileMeta>;
    accessRoles: AccessRoleItem[];
    onClose: () => void;
    onSave: (payload: {
        title: string;
        allowedAccessRoleIds: string[];
        expiresAt?: string;
    }) => Promise<void>;
};

export default function DocumentMetadataModal({
    open,
    fileName,
    initialMeta,
    accessRoles,
    onClose,
    onSave,
}: Props) {
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTitle(initialMeta.title?.trim() || fileName);
        setExpiresAt(initialMeta.expiresAt ? initialMeta.expiresAt.slice(0, 10) : '');
        setSelectedRoleIds(initialMeta.allowedAccessRoleIds ?? []);
    }, [open, initialMeta, fileName]);

    if (!open) return null;

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
        );
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onSave({
                title: title.trim(),
                allowedAccessRoleIds: selectedRoleIds,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>ویرایش سند</h2>
                    <button type="button" className={styles.modalClose} onClick={onClose} aria-label="بستن">
                        ×
                    </button>
                </div>

                <p className={styles.modalHint}>
                    نام سند و نقش‌های مجاز را تعریف کنید. اعمال محدودیت در لیست — فاز بعد.
                </p>

                <div className={parentStyles.field}>
                    <label>نام سند *</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً قرارداد همکاری" />
                </div>

                <div className={parentStyles.field}>
                    <label>نقش‌های مجاز</label>
                    {accessRoles.length === 0 ? (
                        <p className={styles.modalHint}>هنوز نقش دسترسی تعریف نشده — از بخش کاربران ایجاد کنید.</p>
                    ) : (
                        <div className={styles.roleCheckList}>
                            {accessRoles.map((role) => (
                                <label key={role._id} className={styles.roleCheckItem}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRoleIds.includes(role._id)}
                                        onChange={() => toggleRole(role._id)}
                                    />
                                    <span>{role.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className={parentStyles.field}>
                    <label>تاریخ انقضا</label>
                    <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className={parentStyles.secondaryBtn} onClick={onClose}>
                        انصراف
                    </button>
                    <button
                        type="button"
                        className={parentStyles.primaryBtn}
                        disabled={!title.trim() || saving}
                        onClick={() => void handleSave()}
                    >
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                </div>
            </div>
        </div>
    );
}
