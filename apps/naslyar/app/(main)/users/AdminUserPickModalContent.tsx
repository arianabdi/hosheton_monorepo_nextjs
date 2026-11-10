'use client';

import React, { useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';
import {
    AdminUserListItem,
    fetchAdminUserList,
    formatAdminUserLabel,
    findUsersByEmail,
} from './user-list-api';
import styles from './AdminUserPickModalContent.module.scss';

type Props = {
    onSelect: (user: AdminUserListItem) => void;
    onClose: () => void;
};

export default function AdminUserPickModalContent({ onSelect, onClose }: Props) {
    const [email, setEmail] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<AdminUserListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const runSearch = async () => {
        const q = email.trim();
        if (q.length < 2) {
            setError('حداقل ۲ کاراکتر وارد کنید (ایمیل یا نام).');
            setResults([]);
            return;
        }
        try {
            setSearching(true);
            setError(null);
            if (q.includes('@')) {
                const { exact, matches } = await findUsersByEmail(q);
                setResults(exact ? [exact] : matches);
                if (!exact && matches.length === 0) {
                    setError('کاربری پیدا نشد.');
                }
                return;
            }
            const { users } = await fetchAdminUserList({ username: q, limit: 25, page: 1 });
            setResults(users);
            if (users.length === 0) {
                setError('کاربری پیدا نشد.');
            }
        } catch (err) {
            ErrorToaster(err);
            setError('خطا در جستجو.');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <h3 className={styles.title}>انتخاب کاربر</h3>
            <p className={styles.desc}>با ایمیل یا نام کاربر را پیدا کنید.</p>
            <div className={styles.searchRow}>
                <input
                    type="search"
                    placeholder="ایمیل یا نام…"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            void runSearch();
                        }
                    }}
                />
                <button type="button" disabled={searching} onClick={() => void runSearch()}>
                    {searching ? '…' : 'جستجو'}
                </button>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <ul className={styles.list}>
                {results.map(u => (
                    <li key={u._id}>
                        <button
                            type="button"
                            className={styles.item}
                            onClick={() => {
                                onSelect(u);
                                onClose();
                            }}
                        >
                            <span className={styles.itemName}>{formatAdminUserLabel(u)}</span>
                            {u.email ? <span className={styles.itemEmail}>{u.email}</span> : null}
                        </button>
                    </li>
                ))}
            </ul>
            <div className={styles.footer}>
                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                    بستن
                </button>
            </div>
        </div>
    );
}
