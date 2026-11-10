'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { LuChevronDown, LuCircleAlert, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { HoshetonError } from '@/app/lib/errors';
import { useMediaStudio } from '../../../context/MediaStudioContext';
import type { ProcessErrorItem } from '../../../types/process-errors';
import styles from './ProcessErrorNotifier.module.scss';

function truncate(text: string, max = 72): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 1)}…`;
}

/** متن فرانت همان؛ خطای سرور/worker فقط پیام هوشتون */
function ProcessErrorText({ item, children }: { item: ProcessErrorItem; children: (text: string) => ReactNode }) {
    if (item.error === undefined) return <>{children(item.message)}</>;
    return (
        <HoshetonError error={item.error} kind="generation">
            {(e) => children(e.message)}
        </HoshetonError>
    );
}

export function ProcessErrorNotifier() {
    const { processErrors, dismissProcessError, openLogsForNode } = useMediaStudio();
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [expanded, setExpanded] = useState(false);

    const visibleErrors = useMemo(
        () => [...processErrors].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
        [processErrors],
    );

    const latestError = visibleErrors[0];

    const handleItemClick = useCallback((nodeId?: string) => {
        if (nodeId) openLogsForNode(nodeId);
        setExpanded(false);
    }, [openLogsForNode]);

    if (!visibleErrors.length || !latestError) return null;

    return (
        <div className={styles.wrapper}>
            <button
                type="button"
                className={styles.compactBar}
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
            >
                <LuCircleAlert className={styles.compactIcon} />
                <ProcessErrorText item={latestError}>
                    {(text) => <span className={styles.compactText}>{truncate(text)}</span>}
                </ProcessErrorText>
                <span className={styles.countBadge}>{visibleErrors.length}</span>
                <LuChevronDown className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
            </button>

            {expanded && (
                <div className={styles.popup} role="dialog" aria-label={t('process_errors')}>
                    <div className={styles.popupHeader}>
                        <span>{t('process_errors')}</span>
                        <button
                            type="button"
                            className={styles.popupClose}
                            onClick={() => setExpanded(false)}
                            aria-label={tc('close')}
                        >
                            <LuX />
                        </button>
                    </div>
                    <ul className={styles.errorList}>
                        {visibleErrors.map((item) => (
                            <li key={item.id} className={styles.errorItem}>
                                <button
                                    type="button"
                                    className={styles.errorItemBody}
                                    onClick={() => handleItemClick(item.nodeId)}
                                >
                                    <span className={styles.errorItemTitle}>
                                        {item.nodeType || item.nodeLabel || item.nodeId || t('pipeline_run')}
                                    </span>
                                    <ProcessErrorText item={item}>
                                        {(text) => <span className={styles.errorItemMessage}>{text}</span>}
                                    </ProcessErrorText>
                                </button>
                                <button
                                    type="button"
                                    className={styles.errorItemDismiss}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissProcessError(item.id);
                                    }}
                                    aria-label={t('dismiss_error')}
                                >
                                    <LuX />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
