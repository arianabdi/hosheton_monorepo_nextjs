'use client';

import React from 'react';
import type { PermissionGroup } from '../access-api';
import styles from '../access-roles.module.scss';

type Props = {
    groups: PermissionGroup[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    disabled?: boolean;
};

export default function PermissionMatrix({ groups, selectedKeys, onChange, disabled }: Props) {
    const toggleKey = (key: string) => {
        if (disabled) return;
        if (selectedKeys.includes(key)) {
            onChange(selectedKeys.filter((k) => k !== key));
        } else {
            onChange([...selectedKeys, key]);
        }
    };

    const toggleGroup = (group: PermissionGroup) => {
        if (disabled) return;
        const groupKeys = group.items.map((i) => i.key);
        const allSelected = groupKeys.every((k) => selectedKeys.includes(k));
        if (allSelected) {
            onChange(selectedKeys.filter((k) => !groupKeys.includes(k)));
        } else {
            onChange(Array.from(new Set([...selectedKeys, ...groupKeys])));
        }
    };

    if (!groups.length) {
        return (
            <p className={styles.emptyHint}>
                فهرست دسترسی‌ها خالی است. ابتدا «همگام‌سازی با منو» را اجرا کنید.
            </p>
        );
    }

    return (
        <div className={styles.matrix}>
            {groups.map((group) => {
                const groupKeys = group.items.map((i) => i.key);
                const selectedCount = groupKeys.filter((k) => selectedKeys.includes(k)).length;
                const allSelected = groupKeys.length > 0 && selectedCount === groupKeys.length;

                return (
                    <section key={group.groupKey} className={styles.matrixGroup}>
                        <header className={styles.matrixGroupHead}>
                            <label className={styles.matrixGroupLabel}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    disabled={disabled}
                                    onChange={() => toggleGroup(group)}
                                />
                                <span>{group.groupLabel}</span>
                                <span className={styles.matrixCount}>
                                    {selectedCount}/{groupKeys.length}
                                </span>
                            </label>
                        </header>
                        <div className={styles.matrixItems}>
                            {group.items.map((item) => (
                                <label key={item.key} className={styles.matrixItem}>
                                    <input
                                        type="checkbox"
                                        checked={selectedKeys.includes(item.key)}
                                        disabled={disabled}
                                        onChange={() => toggleKey(item.key)}
                                    />
                                    <span>
                                        <strong>{item.label}</strong>
                                        <code>{item.key}</code>
                                        {item.routeHint ? (
                                            <small>{item.routeHint}</small>
                                        ) : null}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
