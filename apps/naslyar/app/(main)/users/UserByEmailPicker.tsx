'use client';

import React, { useId, useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';
import {
    AdminUserListItem,
    findUsersByEmail,
    formatAdminUserLabel,
} from './user-list-api';
import styles from './UserByEmailPicker.module.scss';

type Props = {
    selectedUser: AdminUserListItem | null;
    onSelect: (user: AdminUserListItem | null) => void;
    disabled?: boolean;
};

export default function UserByEmailPicker({ selectedUser, onSelect, disabled }: Props) {
    const inputId = useId();
    const [email, setEmail] = useState(selectedUser?.email ?? '');
    const [searching, setSearching] = useState(false);
    const [candidates, setCandidates] = useState<AdminUserListItem[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async () => {
        const q = email.trim();
        if (!q.includes('@')) {
            setSearchError('ایمیل معتبر وارد کنید.');
            setCandidates([]);
            return;
        }
        try {
            setSearching(true);
            setSearchError(null);
            setCandidates([]);
            const { exact, matches } = await findUsersByEmail(q);
            if (exact) {
                onSelect(exact);
                setCandidates([]);
                return;
            }
            if (matches.length === 0) {
                setSearchError('کاربری با این ایمیل پیدا نشد.');
                onSelect(null);
                return;
            }
            if (matches.length === 1) {
                onSelect(matches[0]);
                return;
            }
            setCandidates(matches);
            setSearchError('چند کاربر پیدا شد — یکی را انتخاب کنید.');
            onSelect(null);
        } catch (err) {
            ErrorToaster(err);
            setSearchError('خطا در جستجوی کاربر.');
        } finally {
            setSearching(false);
        }
    };

    const handleClear = () => {
        onSelect(null);
        setCandidates([]);
        setSearchError(null);
        setEmail('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleSearch();
        }
    };

    if (selectedUser) {
        return (
            <div className={styles.wrap}>
                <div className={styles.selectedCard}>
                    <div className={styles.selectedMain}>
                        <span className={styles.selectedName}>{formatAdminUserLabel(selectedUser)}</span>
                        {selectedUser.username && (
                            <span className={styles.selectedMeta}>@{selectedUser.username}</span>
                        )}
                        {selectedUser.email && (
                            <span className={styles.selectedMeta}>{selectedUser.email}</span>
                        )}
                        <span className={styles.selectedId}>{selectedUser._id}</span>
                    </div>
                    <button
                        type="button"
                        className={styles.changeBtn}
                        onClick={handleClear}
                        disabled={disabled}
                    >
                        تغییر کاربر
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.searchRow}>
                <input
                    id={inputId}
                    type="email"
                    autoComplete="off"
                    placeholder="user@example.com"
                    value={email}
                    disabled={disabled || searching}
                    onChange={e => {
                        setEmail(e.target.value);
                        setSearchError(null);
                        setCandidates([]);
                    }}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="button"
                    className={styles.searchBtn}
                    disabled={disabled || searching || !email.trim()}
                    onClick={() => void handleSearch()}
                >
                    {searching ? 'در حال جستجو…' : 'یافتن کاربر'}
                </button>
            </div>
            <p className={styles.hint}>
                کاربر از ماژول کاربران با ایمیل پیدا می‌شود؛ شناسه به‌صورت خودکار برای فاکتور تنظیم می‌شود.
            </p>
            {searchError && <p className={styles.error} role="alert">{searchError}</p>}
            {candidates.length > 1 && (
                <div className={styles.pickList}>
                    {candidates.map(u => (
                        <button
                            key={u._id}
                            type="button"
                            className={styles.pickItem}
                            onClick={() => {
                                onSelect(u);
                                setCandidates([]);
                                setSearchError(null);
                                setEmail(u.email ?? email);
                            }}
                        >
                            {formatAdminUserLabel(u)}
                            {u.email && (
                                <>
                                    {' '}
                                    <span className={styles.pickItemEmail}>{u.email}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
