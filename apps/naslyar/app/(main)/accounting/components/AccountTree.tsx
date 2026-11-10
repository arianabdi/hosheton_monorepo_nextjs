'use client';

import React from 'react';
import { LuChevronDown, LuChevronLeft, LuPlus, LuPencil, LuArchive } from 'react-icons/lu';
import type { AccountingAccountNode } from '../accounting-api';
import { ACCOUNT_TYPE_LABELS, AccountingAccountType } from '../accounting.utils';
import styles from '../Accounting.module.scss';

interface AccountTreeProps {
    nodes: AccountingAccountNode[];
    onAddChild?: (node: AccountingAccountNode) => void;
    onEdit?: (node: AccountingAccountNode) => void;
    onArchive?: (node: AccountingAccountNode) => void;
}

/**
 * نمایش بازگشتی درخت کدینگ حساب‌ها با قابلیت باز/بسته کردن شاخه‌ها
 */
export default function AccountTree({ nodes, onAddChild, onEdit, onArchive }: AccountTreeProps) {
    // سطح‌های اول و دوم به صورت پیش‌فرض باز هستند
    const [expanded, setExpanded] = React.useState<Set<string>>(
        () => new Set(nodes.map((n) => n._id)),
    );

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderNode = (node: AccountingAccountNode, depth: number) => {
        const hasChildren = (node.children || []).length > 0;
        const isOpen = expanded.has(node._id);
        return (
            <div key={node._id} className={styles.treeNode}>
                <div className={styles.treeRow} style={{ paddingRight: `${depth * 1.1}rem` }}>
                    {hasChildren ? (
                        <button
                            type="button"
                            className={styles.treeToggle}
                            onClick={() => toggle(node._id)}
                            aria-label={isOpen ? 'بستن شاخه' : 'باز کردن شاخه'}
                        >
                            {isOpen ? <LuChevronDown size={14} /> : <LuChevronLeft size={14} />}
                        </button>
                    ) : (
                        <span className={styles.treeSpacer} />
                    )}
                    <span className={styles.treeCode}>{node.code}</span>
                    <span className={`${styles.treeTitle} ${node.isArchive ? styles.treeArchive : ''}`}>
                        {node.title}
                    </span>
                    <span className={styles.badgeType}>{ACCOUNT_TYPE_LABELS[node.type as AccountingAccountType]}</span>
                    {node.isControl && <span className={styles.badgeType}>کنترلی</span>}
                    <div className={styles.treeActions}>
                        {onAddChild && (
                            <button
                                type="button"
                                className={styles.treeToggle}
                                title="افزودن زیرمجموعه"
                                onClick={() => onAddChild(node)}
                            >
                                <LuPlus size={15} />
                            </button>
                        )}
                        {onEdit && (
                            <button
                                type="button"
                                className={styles.treeToggle}
                                title="ویرایش"
                                onClick={() => onEdit(node)}
                            >
                                <LuPencil size={14} />
                            </button>
                        )}
                        {onArchive && (
                            <button
                                type="button"
                                className={styles.treeToggle}
                                title="حذف/آرشیو"
                                onClick={() => onArchive(node)}
                            >
                                <LuArchive size={14} />
                            </button>
                        )}
                    </div>
                </div>
                {hasChildren && isOpen && (
                    <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
                )}
            </div>
        );
    };

    return <div className={styles.treeWrapper}>{nodes.map((node) => renderNode(node, 0))}</div>;
}
