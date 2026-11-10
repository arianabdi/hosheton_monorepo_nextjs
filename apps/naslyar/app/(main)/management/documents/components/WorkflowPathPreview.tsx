'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../Documents.module.scss';

export interface WorkflowPathStepPreview {
    label: string;
    assigneeDisplay?: string;
    instruction?: string;
}

export function WorkflowPathPreview({
    labels,
    steps,
}: {
    labels?: string[];
    steps?: WorkflowPathStepPreview[];
}) {
    const items: WorkflowPathStepPreview[] =
        steps ||
        (labels || []).map((label) => ({ label }));

    if (items.length === 0) {
        return <p className={styles.wizardEmptyHint}>هنوز مرحله‌ای تعریف نشده است.</p>;
    }

    if (steps || items.some((item) => item.assigneeDisplay || item.instruction)) {
        return (
            <div className={styles.wizardPathDetailList}>
                {items.map((item, index) => (
                    <div key={`${item.label}-${index}`} className={styles.wizardPathDetailItem}>
                        <strong>{index + 1}. {item.label}</strong>
                        {item.assigneeDisplay ? <span>ارسال به: {item.assigneeDisplay}</span> : null}
                        {item.instruction ? <span> — {item.instruction}</span> : null}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.wizardPathPreview}>
            {items.map((item, index) => (
                <React.Fragment key={`${item.label}-${index}`}>
                    <span className={styles.wizardPathStep}>{item.label}</span>
                    {index < items.length - 1 ? <span className={styles.wizardPathArrow}>←</span> : null}
                </React.Fragment>
            ))}
        </div>
    );
}

export function HrCatalogEmptyHint() {
    return (
        <p className={styles.wizardEmptyHint}>
            هنوز سمت/واحد/کارمندی در منابع انسانی تعریف نشده.{' '}
            <Link href="/management/hr/roles">تعریف سمت‌ها</Link>
            {' '}یا{' '}
            <Link href="/management/hr/employees/new">ثبت نیروی انسانی</Link>
        </p>
    );
}
