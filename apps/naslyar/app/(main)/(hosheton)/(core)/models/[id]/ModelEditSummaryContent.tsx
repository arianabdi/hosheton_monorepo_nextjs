'use client';

import styles from './ModelEditSummaryPanel.module.scss';

export interface ModeSummaryItem {
    editorId: string;
    modeType: string;
    endpointPath: string;
    isDefault: boolean;
    priority: number;
    routesCount: number;
}

export interface SettingSummaryItem {
    index: number;
    key: string;
    label: string;
    type: string;
}

export interface ModelEditSummaryContentProps {
    displayName: string;
    modelName: string;
    providerLabel: string;
    sectionLabel: string;
    classLabel: string;
    isActive: boolean;
    /** نمایش مارکاپ: «۲۵٪ (اختصاصی)» یا «سراسری (۲۰٪)» */
    markupLabel: string;
    modeItems: ModeSummaryItem[];
    settingItems: SettingSummaryItem[];
    metadataCount: number;
    activeTabLabel: string;
    onModeClick?: (editorId: string) => void;
    onSettingClick?: (index: number) => void;
}

const FIELD_TYPE_LABELS_FA: Record<string, string> = {
    text: 'متن',
    textarea: 'متن بلند',
    number: 'عدد',
    select: 'انتخاب',
    checkbox: 'چک‌باکس',
    slider: 'اسلایدر',
};

function fieldTypeLabel(type: string): string {
    return FIELD_TYPE_LABELS_FA[type] || type;
}

export default function ModelEditSummaryContent({
    displayName,
    modelName,
    providerLabel,
    sectionLabel,
    classLabel,
    isActive,
    markupLabel,
    modeItems,
    settingItems,
    metadataCount,
    activeTabLabel,
    onModeClick,
    onSettingClick,
}: ModelEditSummaryContentProps) {
    const rows = [
        { label: 'نام نمایشی', value: displayName || '—' },
        { label: 'شناسه مدل', value: modelName || '—', mono: true },
        { label: 'ارائه‌دهنده', value: providerLabel || '—' },
        { label: 'نوع سرویس', value: sectionLabel || '—' },
        { label: 'نوع مدل', value: classLabel || '—' },
        { label: 'مارکاپ', value: markupLabel || '—' },
        {
            label: 'وضعیت',
            value: isActive ? 'فعال' : 'غیرفعال',
            badge: isActive ? 'active' : 'inactive',
        },
        { label: 'متادیتا', value: `${metadataCount} مورد` },
    ] as const;

    return (
        <div className={styles.content}>
            <section className={styles.block}>
                <h3 className={styles.blockTitle}>اطلاعات کلی</h3>
                <ul className={styles.list}>
                    {rows.map((row) => (
                        <li key={row.label} className={styles.item}>
                            <span className={styles.label}>{row.label}</span>
                            {'badge' in row && row.badge ? (
                                <span className={row.badge === 'active' ? styles.badgeActive : styles.badgeInactive}>
                                    {row.value}
                                </span>
                            ) : (
                                <span className={'mono' in row && row.mono ? `${styles.value} ${styles.mono}` : styles.value}>
                                    {row.value}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            <section className={styles.block}>
                <h3 className={styles.blockTitle}>مودها</h3>
                {modeItems.length === 0 ? (
                    <p className={styles.emptyHint}>هنوز مودی تعریف نشده است.</p>
                ) : (
                    <ol className={styles.timeline}>
                        {modeItems.map((mode) => (
                            <li key={mode.editorId} className={styles.timelineItem}>
                                <span className={styles.timelineDot} aria-hidden />
                                <button
                                    type="button"
                                    className={styles.timelineButton}
                                    onClick={() => onModeClick?.(mode.editorId)}
                                >
                                    <div className={styles.timelineHead}>
                                        <strong className={styles.timelineTitle}>
                                            {mode.modeType || 'مود بدون نوع'}
                                        </strong>
                                        {mode.isDefault ? (
                                            <span className={styles.timelineBadge}>پیش‌فرض</span>
                                        ) : null}
                                    </div>
                                    <div className={styles.timelineMeta}>
                                        {mode.endpointPath || 'بدون endpoint'}
                                    </div>
                                    <div className={styles.timelineFoot}>
                                        اولویت {mode.priority} · {mode.routesCount} route
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section className={styles.block}>
                <h3 className={styles.blockTitle}>تنظیمات مدل</h3>
                {settingItems.length === 0 ? (
                    <p className={styles.emptyHint}>فیلد تنظیماتی ثبت نشده است.</p>
                ) : (
                    <ol className={styles.timeline}>
                        {settingItems.map((field) => (
                            <li key={`${field.key}-${field.index}`} className={styles.timelineItem}>
                                <span className={styles.timelineDot} aria-hidden />
                                <button
                                    type="button"
                                    className={styles.timelineButton}
                                    onClick={() => onSettingClick?.(field.index)}
                                >
                                    <div className={styles.timelineHead}>
                                        <strong className={styles.timelineTitle}>{field.label}</strong>
                                        <span className={styles.timelineType}>{fieldTypeLabel(field.type)}</span>
                                    </div>
                                    <div className={`${styles.timelineMeta} ${styles.mono}`}>{field.key}</div>
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <div className={styles.activeTabHint}>
                بخش فعال: <strong>{activeTabLabel}</strong>
            </div>
        </div>
    );
}
