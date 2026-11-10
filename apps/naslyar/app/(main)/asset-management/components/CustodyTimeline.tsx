'use client';

import React from 'react';
import { AssetTimelineEvent } from '../asset-management-api';
import {
    ASSET_ASSIGNMENT_TYPE_LABELS,
    ASSET_AUDIT_ACTION_LABELS,
    ASSET_FIELD_LABELS,
} from '../asset-management.utils';
import { isoToJalaliString } from '../jalali.client';
import styles from '../AssetManagement.module.scss';

interface CustodyTimelineProps {
    events: AssetTimelineEvent[];
    resolveUserName: (userId?: string | null) => string;
    resolveLocationName: (locationId?: string | null) => string;
}

function formatValue(value: unknown, resolveUserName: (userId?: string | null) => string, resolveLocationName: (id?: string | null) => string): string {
    if (value === null || value === undefined || value === '') return '—';
    const str = String(value);
    // فیلدهای ارجاعی به نام نمایشی تبدیل می‌شوند
    if (str.length === 24 && /^[a-f0-9]{24}$/i.test(str)) {
        const user = resolveUserName(str);
        if (user !== str) return user;
        const location = resolveLocationName(str);
        if (location !== str) return location;
        return str;
    }
    return str;
}

/**
 * Timeline کامل دارایی — ترکیب رکوردهای تحویل/برگشت/انتقال و Audit Log.
 * پاسخ به سؤال «این دارایی از ابتدا دست چه کسانی بوده؟»
 */
export default function CustodyTimeline({ events, resolveUserName, resolveLocationName }: CustodyTimelineProps) {
    if (!events.length) {
        return <p className={styles.subtitle}>هنوز رخدادی برای این دارایی ثبت نشده است.</p>;
    }

    return (
        <div className={styles.timeline}>
            {events.map((event) => {
                const date = isoToJalaliString(event.date);
                if (event.kind === 'assignment') {
                    const from = event.fromUserId ? resolveUserName(event.fromUserId) : null;
                    const to = event.toUserId ? resolveUserName(event.toUserId) : event.toName || null;
                    const loc = event.locationId ? resolveLocationName(event.locationId) : null;
                    return (
                        <div className={styles.timelineItem} key={`a-${event._id}`}>
                            <div className={styles.timelineTitle}>
                                {ASSET_ASSIGNMENT_TYPE_LABELS[event.type] || event.type}
                            </div>
                            <div className={styles.timelineDate}>{date}</div>
                            <div className={styles.timelineBody}>
                                {(event.type === 'return' || from) && from && (
                                    <div>از: {from}</div>
                                )}
                                {to && <div>به: {to}</div>}
                                {loc && <div>محل: {loc}</div>}
                                {event.notes && <div>یادداشت: {event.notes}</div>}
                            </div>
                        </div>
                    );
                }

                const changes = event.changes || {};
                const changeKeys = Object.keys(changes);
                return (
                    <div className={`${styles.timelineItem} ${styles.timelineItemAudit}`} key={`l-${event._id}`}>
                        <div className={styles.timelineTitle}>
                            {ASSET_AUDIT_ACTION_LABELS[event.action] || event.action}
                        </div>
                        <div className={styles.timelineDate}>{date}</div>
                        {changeKeys.length > 0 && (
                            <div className={styles.timelineBody}>
                                {changeKeys.map((key) => (
                                    <span className={styles.timelineChange} key={key}>
                                        <span className={styles.subtitle}>
                                            {ASSET_FIELD_LABELS[key] || key}:
                                        </span>
                                        <span className={styles.from}>
                                            {formatValue(changes[key].from, resolveUserName, resolveLocationName)}
                                        </span>
                                        <span>←</span>
                                        <span className={styles.to}>
                                            {formatValue(changes[key].to, resolveUserName, resolveLocationName)}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                        {event.detail && <div className={styles.timelineBody}>{event.detail}</div>}
                    </div>
                );
            })}
        </div>
    );
}
