'use client';

import React, { useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import AdminUserPickModalContent from './AdminUserPickModalContent';
import type { AdminUserListItem } from './user-list-api';
import { formatAdminUserLabel } from './user-list-api';
import styles from './UserFilterField.module.scss';

type Props = {
    selectedUser: AdminUserListItem | null;
    onSelect: (user: AdminUserListItem | null) => void;
    id?: string;
};

export default function UserFilterField({ selectedUser, onSelect, id }: Props) {
    const [open, setOpen] = useState(false);
    const label = selectedUser ? formatAdminUserLabel(selectedUser) : '';

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(null);
    };

    return (
        <>
            <div className={styles.shell}>
                <button
                    id={id}
                    type="button"
                    className={`${styles.trigger} ${selectedUser ? styles.hasValue : ''}`}
                    onClick={() => setOpen(true)}
                >
                    <span className={styles.triggerText}>
                        {selectedUser ? label : 'انتخاب کاربر…'}
                    </span>
                </button>
                {selectedUser ? (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        aria-label="پاک کردن فیلتر کاربر"
                        onClick={handleClear}
                    >
                        ×
                    </button>
                ) : null}
            </div>
            <ModalHelper
                open={open}
                onClose={() => setOpen(false)}
                component={
                    <AdminUserPickModalContent
                        onSelect={user => onSelect(user)}
                        onClose={() => setOpen(false)}
                    />
                }
            />
        </>
    );
}
