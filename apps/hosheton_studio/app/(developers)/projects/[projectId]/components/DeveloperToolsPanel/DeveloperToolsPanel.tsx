'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LuX, LuCheck, LuClock, LuChevronDown, LuChevronRight, LuChevronLeft } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import styles from './DeveloperToolsPanel.module.scss';
import { developerApi } from '../../../lib/developer-api';
import type { AiProviderLog } from '../../../types/developer-api';
import {
    CostEstimatePanel,
    type CostEstimateResult,
} from '../../../components/CostEstimatePanel';
import type { DeveloperProviderLogEvent } from '../../../context/MediaStudioContext';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAppStore } from '@/app/zustand/store/useAppStore';

interface DeveloperToolsPanelProps {
    open: boolean;
    onClose: () => void;
    registerProviderLogListener?: (
        listener: ((event: DeveloperProviderLogEvent) => void) | null,
    ) => void;
}

const HISTORY_PAGE_SIZE = 10;

function pendingSignature(logs: AiProviderLog[]): string {
    return logs.map((log) => `${log._id}:${log.updatedAt}:${log.status}`).join('|');
}

function upsertPendingList(current: AiProviderLog[], log: AiProviderLog): AiProviderLog[] {
    if (log.status !== 'pending') {
        return current.filter((item) => item._id !== log._id);
    }

    const next = current.filter((item) => item._id !== log._id);
    next.push(log);
    return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function toCostResult(raw?: Record<string, unknown> | null): CostEstimateResult | null {
    if (!raw || typeof raw !== 'object') return null;
    return raw as unknown as CostEstimateResult;
}

function getPendingLabel(log: AiProviderLog): string {
    const parts = [log.provider, log.method, log.endpoint].filter(Boolean);
    return parts.join(' · ');
}

function getPayloadMappingWarnings(log: AiProviderLog): string[] {
    const transformation = log.payloadTransformation || {};
    const rejected = Array.isArray(transformation.rejectedKeys) ? transformation.rejectedKeys : [];
    const legacy = Array.isArray(transformation.legacyKeys) ? transformation.legacyKeys : [];
    return [
        ...(rejected.length ? [`Rejected settings: ${rejected.join(', ')}`] : []),
        ...(legacy.length ? [`Settings using legacy mapping: ${legacy.join(', ')}`] : []),
    ];
}

export function DeveloperToolsPanel({
    open,
    onClose,
    registerProviderLogListener,
}: DeveloperToolsPanelProps) {
    const { t } = useTranslation(['projects', 'common']);
    const lang = useAppStore((s) => s.lang);
    const [interceptMode, setInterceptMode] = useState(false);
    const [interceptLoading, setInterceptLoading] = useState(false);
    const [logs, setLogs] = useState<AiProviderLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRefreshing, setPendingRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [logDetailLoading, setLogDetailLoading] = useState(false);
    const [pendingLogs, setPendingLogs] = useState<AiProviderLog[]>([]);
    const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
    const [pendingExpanded, setPendingExpanded] = useState(true);

    const logsContainerRef = useRef<HTMLDivElement>(null);
    const pendingSignatureRef = useRef('');
    const prevPendingCountRef = useRef(0);
    const serverHistoryOffsetRef = useRef(0);

    const selectedPending = useMemo(
        () => pendingLogs.find((log) => log._id === selectedPendingId) ?? pendingLogs[0] ?? null,
        [pendingLogs, selectedPendingId],
    );

    const selectedPendingIndex = selectedPending
        ? pendingLogs.findIndex((log) => log._id === selectedPending._id)
        : -1;

    const applyPendingLogs = useCallback((nextPending: AiProviderLog[]) => {
        const sorted = [...nextPending].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        const signature = pendingSignature(sorted);
        if (signature !== pendingSignatureRef.current) {
            pendingSignatureRef.current = signature;
            setPendingLogs(sorted);
        }
        setSelectedPendingId((current) => {
            if (current && sorted.some((log) => log._id === current)) return current;
            return sorted[0]?._id ?? null;
        });
    }, []);

    const upsertHistoryLog = useCallback((log: AiProviderLog) => {
        setLogs((current) => {
            const exists = current.some((item) => item._id === log._id);
            if (exists) {
                return current.map((item) => (item._id === log._id ? log : item));
            }
            setHistoryTotal((total) => total + 1);
            return [log, ...current];
        });
    }, []);

    const handleProviderLogEvent = useCallback((event: DeveloperProviderLogEvent) => {
        const log = event.log;

        setPendingLogs((current) => {
            const next = upsertPendingList(current, log);
            pendingSignatureRef.current = pendingSignature(next);

            setSelectedPendingId((selected) => {
                if (log.status === 'pending') {
                    return selected ?? log._id;
                }
                if (selected === log._id) {
                    return next[0]?._id ?? null;
                }
                return selected;
            });

            return next;
        });

        if (log.status === 'pending') {
            setPendingExpanded(true);
        }
        upsertHistoryLog(log);
    }, [upsertHistoryLog]);

    useEffect(() => {
        if (!open || !registerProviderLogListener) return undefined;
        registerProviderLogListener(handleProviderLogEvent);
        return () => registerProviderLogListener(null);
    }, [open, handleProviderLogEvent, registerProviderLogListener]);

    const loadPending = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;
        if (!silent) setPendingRefreshing(true);
        try {
            const data = await developerApi.getPendingProviderLogs();
            applyPendingLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load pending logs:', err);
            if (!silent) {
                pendingSignatureRef.current = '';
                setPendingLogs([]);
                setSelectedPendingId(null);
            }
        } finally {
            if (!silent) setPendingRefreshing(false);
        }
    }, [applyPendingLogs]);

    const loadHistory = useCallback(async (options?: { silent?: boolean; append?: boolean }) => {
        const silent = options?.silent ?? false;
        const append = options?.append ?? false;
        const container = logsContainerRef.current;
        const scrollTop = silent && container && !append ? container.scrollTop : 0;

        if (append) {
            setLoadingMore(true);
        } else if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const skip = append ? serverHistoryOffsetRef.current : 0;
            const page = await developerApi.getProviderLogs({
                limit: HISTORY_PAGE_SIZE,
                skip,
            });

            serverHistoryOffsetRef.current = append
                ? serverHistoryOffsetRef.current + page.logs.length
                : page.logs.length;
            setHistoryTotal(page.total);
            setHasMoreHistory(page.hasMore);
            setLogs((current) => {
                if (!append) return page.logs;
                const seen = new Set(current.map((log) => log._id));
                const merged = [...current];
                for (const log of page.logs) {
                    if (!seen.has(log._id)) merged.push(log);
                }
                return merged;
            });

            if (append || (silent && container)) {
                requestAnimationFrame(() => {
                    if (container) container.scrollTop = scrollTop;
                });
            }
        } catch (err) {
            console.error('Failed to load logs:', err);
            if (!append && !silent) {
                setLogs([]);
                setHasMoreHistory(false);
                setHistoryTotal(0);
            }
        } finally {
            if (append) {
                setLoadingMore(false);
            } else if (silent) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (pendingLogs.length > prevPendingCountRef.current) {
            setPendingExpanded(true);
        }
        prevPendingCountRef.current = pendingLogs.length;
    }, [pendingLogs.length]);

    const loadAll = useCallback(async (options?: { silent?: boolean }) => {
        await Promise.all([
            loadPending({ silent: options?.silent }),
            loadHistory({ silent: options?.silent }),
        ]);
    }, [loadPending, loadHistory]);

    const loadInterceptMode = useCallback(async () => {
        try {
            const data = await developerApi.getInterceptMode();
            setInterceptMode(!!data.interceptModeEnabled);
        } catch (err) {
            console.error('Failed to load intercept mode:', err);
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        pendingSignatureRef.current = '';
        void loadInterceptMode();
        void loadAll();
    }, [open, loadInterceptMode, loadAll]);

    // Pending/history updates arrive via developer:provider-log socket (no polling).

    const handleRefreshPending = () => {
        void loadPending();
    };

    const handleRefreshLogs = () => {
        void loadHistory({ silent: logs.length > 0 });
    };

    const handleLoadMore = () => {
        if (loadingMore || !hasMoreHistory) return;
        void loadHistory({ append: true });
    };

    const handleInterceptToggle = async (enabled: boolean) => {
        setInterceptLoading(true);
        try {
            const data = await developerApi.setInterceptMode(enabled);
            setInterceptMode(!!data.interceptModeEnabled);
            if (enabled) {
                void loadPending();
            }
        } catch (err) {
            console.error('Failed to update intercept mode:', err);
        } finally {
            setInterceptLoading(false);
        }
    };

    const handleApproveRequest = async () => {
        if (!selectedPending) return;
        const approvedId = selectedPending._id;
        try {
            const updated = await developerApi.approveRequest(approvedId);
            handleProviderLogEvent({ action: 'updated', log: updated });
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    const handleRejectRequest = async () => {
        if (!selectedPending) return;
        try {
            const updated = await developerApi.rejectRequest(selectedPending._id);
            handleProviderLogEvent({ action: 'updated', log: updated });
        } catch (err) {
            console.error('Failed to reject:', err);
        }
    };

    const goToPending = (direction: -1 | 1) => {
        if (pendingLogs.length <= 1) return;
        const currentIndex = selectedPendingIndex >= 0 ? selectedPendingIndex : 0;
        const nextIndex = (currentIndex + direction + pendingLogs.length) % pendingLogs.length;
        setSelectedPendingId(pendingLogs[nextIndex]._id);
    };

    // History rows come from a slim list projection; fetch full bodies once on expand.
    const toggleExpanded = useCallback((logId: string) => {
        if (expandedLog === logId) {
            setExpandedLog(null);
            return;
        }
        setExpandedLog(logId);
        const cached = logs.find((log) => log._id === logId);
        if (cached && typeof cached.requestBody !== 'undefined') return;
        setLogDetailLoading(true);
        developerApi.getProviderLog(logId).then((full) => {
            setLogs((current) => current.map((log) => (log._id === logId ? full : log)));
        }).catch((err) => {
            console.error('Failed to load log details:', err);
        }).finally(() => {
            setLogDetailLoading(false);
        });
    }, [expandedLog, logs]);

    if (!open) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.panel}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <h2>{t('common:developers_panel')}</h2>
                        <span className={styles.badge}>AI Provider Requests</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <LuX />
                    </button>
                </div>

                <div className={styles.controls}>
                    <div className={styles.switchGroup}>
                        <label className={styles.switchLabel}>
                            <input
                                type="checkbox"
                                checked={interceptMode}
                                disabled={interceptLoading}
                                onChange={(e) => void handleInterceptToggle(e.target.checked)}
                            />
                            <span className={styles.switchSlider} />
                        </label>
                        <div className={styles.switchText}>
                            <span className={styles.switchTitle}>Intercept Mode</span>
                            <span className={styles.switchDesc}>
                                POST requests wait for admin/developer approval before sending to provider
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.panelScroll} ref={logsContainerRef}>
                {(interceptMode || selectedPending) && (
                    <div className={styles.pendingSectionHeader}>
                        <span className={styles.pendingSectionTitle}>
                            Pending Requests
                            {pendingLogs.length > 0 ? ` (${pendingLogs.length})` : ''}
                        </span>
                        <button
                            type="button"
                            className={styles.refreshBtn}
                            onClick={handleRefreshPending}
                            disabled={pendingRefreshing}
                        >
                            {pendingRefreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                )}

                {!selectedPending && interceptMode && !pendingRefreshing && (
                    <div className={styles.pendingEmptyHint}>No pending requests right now</div>
                )}

                {selectedPending && pendingLogs.length > 1 && (
                    <div className={styles.pendingSwitcherBar}>
                        <div className={styles.pendingActiveName} title={getPendingLabel(selectedPending)}>
                            {getPendingLabel(selectedPending)}
                        </div>
                        <div className={styles.pendingSwitcherControls}>
                            <button
                                type="button"
                                className={styles.pendingNavBtn}
                                onClick={() => goToPending(-1)}
                                aria-label={t('prev_request')}
                            >
                                <LuChevronLeft />
                            </button>
                            <span className={styles.pendingNavLabel}>
                                {t('carousel_counter', {
                                    current: formatAppNumber(selectedPendingIndex + 1, lang),
                                    total: formatAppNumber(pendingLogs.length, lang),
                                })}
                            </span>
                            <button
                                type="button"
                                className={styles.pendingNavBtn}
                                onClick={() => goToPending(1)}
                                aria-label={t('next_request')}
                            >
                                <LuChevronRight />
                            </button>
                        </div>
                    </div>
                )}

                {selectedPending && (
                    <div className={`${styles.pendingRequest} ${pendingExpanded ? styles.pendingExpanded : styles.pendingCollapsed}`}>
                        <button
                            type="button"
                            className={styles.pendingHeader}
                            onClick={() => setPendingExpanded((prev) => !prev)}
                            aria-expanded={pendingExpanded}
                        >
                            <span className={styles.pendingHeaderMain}>
                                {pendingExpanded ? <LuChevronDown /> : <LuChevronRight />}
                                <LuClock />
                                <span>Pending Request - Awaiting Approval</span>
                                {pendingLogs.length > 1 && (
                                    <span className={styles.pendingCountBadge}>{pendingLogs.length}</span>
                                )}
                            </span>
                            {!pendingExpanded && pendingLogs.length <= 1 && (
                                <span
                                    className={styles.pendingHeaderSummary}
                                    title={getPendingLabel(selectedPending)}
                                >
                                    {getPendingLabel(selectedPending)}
                                </span>
                            )}
                        </button>

                        {pendingExpanded && (
                            <>
                        <div className={styles.requestDetails}>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Endpoint:</span>
                                <code className={styles.detailValue}>{selectedPending.endpoint}</code>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Method:</span>
                                <code className={styles.detailValue}>{selectedPending.method}</code>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Provider:</span>
                                <code className={styles.detailValue}>{selectedPending.provider}</code>
                            </div>
                            <div className={styles.detailSection}>
                                <span className={styles.detailLabel}>Request Body:</span>
                                <pre className={styles.jsonBlock}>
                                    {JSON.stringify(selectedPending.requestBody, null, 2)}
                                </pre>
                            </div>
                            {getPayloadMappingWarnings(selectedPending).map((warning) => (
                                <div key={warning} className={styles.errorMessage}>{warning}</div>
                            ))}
                        </div>

                        <div className={styles.pendingCostWrap}>
                        <CostEstimatePanel
                            compact
                            modelId={selectedPending.modelId}
                            nodeType={selectedPending.nodeType}
                            modelSettings={selectedPending.resolvedSettings || undefined}
                            runtimeMetrics={selectedPending.runtimeMetrics || undefined}
                            prefilledEstimate={toCostResult(selectedPending.costEstimate)}
                        />
                        </div>

                        <div className={styles.pendingActions}>
                            <button className={styles.rejectBtn} onClick={handleRejectRequest}>
                                <LuX />
                                Reject
                            </button>
                            <button className={styles.approveBtn} onClick={handleApproveRequest}>
                                <LuCheck />
                                Approve & Send
                            </button>
                        </div>
                            </>
                        )}

                        {!pendingExpanded && (
                            <div className={styles.pendingCollapsedActions}>
                                <button type="button" className={styles.rejectBtn} onClick={handleRejectRequest}>
                                    <LuX /> Reject
                                </button>
                                <button type="button" className={styles.approveBtn} onClick={handleApproveRequest}>
                                    <LuCheck /> Approve
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.logsContainer}>
                    <div className={styles.logsHeader}>
                        <h3>Request History</h3>
                        <button
                            className={styles.refreshBtn}
                            onClick={handleRefreshLogs}
                            disabled={refreshing}
                        >
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>

                    {loading && logs.length === 0 ? (
                        <div className={styles.loadingState}>Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No requests logged yet</p>
                            <span>AI provider requests will appear here</span>
                        </div>
                    ) : (
                        <div className={styles.logsList}>
                            {logs.map((log) => (
                                <div key={log._id} className={styles.logItem}>
                                    <div className={styles.logSummary} onClick={() => toggleExpanded(log._id)}>
                                        <div className={styles.logIcon}>
                                            {expandedLog === log._id ? <LuChevronDown /> : <LuChevronRight />}
                                        </div>
                                        <div className={styles.logInfo}>
                                            <div className={styles.logTitle}>
                                                <span className={`${styles.statusBadge} ${styles[log.status]}`}>
                                                    {log.status}
                                                </span>
                                                <code className={styles.logEndpoint}>{log.endpoint}</code>
                                            </div>
                                            <div className={styles.logMeta}>
                                                <span>{log.provider}</span>
                                                {log.nodeType ? (
                                                    <>
                                                        <span>•</span>
                                                        <span>{log.nodeType}</span>
                                                    </>
                                                ) : null}
                                                <span>•</span>
                                                <span>{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                                            </div>
                                        </div>
                                        {log.responseStatus && (
                                            <div className={`${styles.httpStatus} ${log.responseStatus < 400 ? styles.success : styles.error}`}>
                                                {log.responseStatus}
                                            </div>
                                        )}
                                    </div>

                                    {expandedLog === log._id && (
                                        <div className={styles.logDetails}>
                                            <div className={styles.detailSection}>
                                                <div className={styles.sectionHeader}>
                                                    <span className={styles.sectionTitle}>Request</span>
                                                    <span className={styles.httpMethod}>{log.method}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Endpoint:</span>
                                                    <code className={styles.detailValue}>{log.endpoint}</code>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Provider:</span>
                                                    <code className={styles.detailValue}>{log.provider}</code>
                                                </div>
                                                {log.requestHeaders && (
                                                    <div className={styles.detailBlock}>
                                                        <span className={styles.detailLabel}>Headers:</span>
                                                        <pre className={styles.jsonBlock}>
                                                            {JSON.stringify(log.requestHeaders, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {typeof log.requestBody !== 'undefined' ? (
                                                    <div className={styles.detailBlock}>
                                                        <span className={styles.detailLabel}>Body:</span>
                                                        <pre className={styles.jsonBlock}>
                                                            {JSON.stringify(log.requestBody, null, 2)}
                                                        </pre>
                                                    </div>
                                                ) : (
                                                    <div className={styles.detailBlock}>
                                                        <span className={styles.detailLabel}>Body:</span>
                                                        <pre className={styles.jsonBlock}>
                                                            {logDetailLoading ? 'Loading…' : '—'}
                                                        </pre>
                                                    </div>
                                                )}
                                                {getPayloadMappingWarnings(log).map((warning) => (
                                                    <div key={warning} className={styles.errorMessage}>{warning}</div>
                                                ))}
                                            </div>

                                            {(log.costEstimate || log.actualCost) && (
                                                <div className={styles.detailSection}>
                                                    {log.costEstimate ? (
                                                        <CostEstimatePanel
                                                            compact
                                                            modelId={log.modelId}
                                                            nodeType={log.nodeType}
                                                            modelSettings={log.resolvedSettings || undefined}
                                                            runtimeMetrics={log.runtimeMetrics || undefined}
                                                            prefilledEstimate={toCostResult(log.costEstimate)}
                                                        />
                                                    ) : null}
                                                    {log.actualCost ? (
                                                        <CostEstimatePanel
                                                            compact
                                                            actualCost={toCostResult(log.actualCost)}
                                                        />
                                                    ) : null}
                                                </div>
                                            )}

                                            {log.responseBody && (
                                                <div className={styles.detailSection}>
                                                    <div className={styles.sectionHeader}>
                                                        <span className={styles.sectionTitle}>Response</span>
                                                        {log.responseStatus && (
                                                            <span className={`${styles.httpStatus} ${log.responseStatus < 400 ? styles.success : styles.error}`}>
                                                                {log.responseStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {log.responseHeaders && (
                                                        <div className={styles.detailBlock}>
                                                            <span className={styles.detailLabel}>Headers:</span>
                                                            <pre className={styles.jsonBlock}>
                                                                {JSON.stringify(log.responseHeaders, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {typeof log.responseBody !== 'undefined' && (
                                                        <div className={styles.detailBlock}>
                                                            <span className={styles.detailLabel}>Body:</span>
                                                            <pre className={styles.jsonBlock}>
                                                                {JSON.stringify(log.responseBody, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.responseTime && (
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailLabel}>Response Time:</span>
                                                            <code className={styles.detailValue}>{log.responseTime}ms</code>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {log.error && (
                                                <div className={styles.errorSection}>
                                                    <span className={styles.errorLabel}>Error:</span>
                                                    <pre className={styles.errorBlock}>{log.error}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {hasMoreHistory && (
                        <div className={styles.loadMoreRow}>
                            <button
                                type="button"
                                className={styles.loadMoreBtn}
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading…' : 'Load more'}
                            </button>
                            <span className={styles.loadMoreHint}>
                                Showing {logs.length} of {historyTotal}
                            </span>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </>
    );
}
