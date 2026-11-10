'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuArrowRight,
    LuBookOpen,
    LuBug,
    LuCheck,
    LuCircleCheck,
    LuCircleX,
    LuFlaskConical,
    LuImage,
    LuListChecks,
    LuLoaderCircle,
    LuPlay,
    LuPlus,
    LuRefreshCw,
    LuSquare,
    LuTerminal,
    LuX,
} from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { useQaConsoleStore } from '@/app/zustand/store/useQaConsoleStore';
import {
    abortQaRelease,
    createQaRelease,
    fetchQaBugs,
    fetchQaReleaseDetail,
    fetchQaReleases,
    fetchQaRunDetail,
    fetchQaRunners,
    fetchQaSummary,
    fetchQaTestCases,
    finishQaRelease,
    retryQaRun,
} from '@/app/lib/qa-testing/qa-api';
import type {
    QaArtifact,
    QaBug,
    QaRelease,
    QaRunLog,
    QaRunMode,
    QaRunnerStatus,
    QaTestCase,
    QaTestRun,
} from '@/app/lib/qa-testing/qa-types';
import styles from './QaConsole.module.scss';

type TabKey = 'guide' | 'releases' | 'tests' | 'bugs';
type QaSummaryData = Awaited<ReturnType<typeof fetchQaSummary>>;

function formatDuration(ms: number, lang: string): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(value: string | null, lang: string): string {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-GB');
    } catch {
        return value;
    }
}

export function QaConsole() {
    const open = useQaConsoleStore((s) => s.open);
    const closeQaConsole = useQaConsoleStore((s) => s.closeQaConsole);
    const { t } = useTranslation('common');

    const [tab, setTab] = useState<TabKey>('guide');
    const [runners, setRunners] = useState<QaRunnerStatus[]>([]);
    const [error, setError] = useState<string | null>(null);

    const runnerOnline = useMemo(() => runners.some((r) => r.online), [runners]);

    const loadRunners = useCallback(async () => {
        try {
            const data = await fetchQaRunners();
            setRunners(data.runners);
        } catch {
            /* وضعیت رانر حیاتی نیست */
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        loadRunners();
        const interval = setInterval(loadRunners, 10_000);
        return () => clearInterval(interval);
    }, [open, loadRunners]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeQaConsole();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, closeQaConsole]);

    if (!open) return null;

    return (
        <>
            <div className={styles.overlay} onClick={closeQaConsole} />
            <aside className={styles.panel} role="dialog" aria-label={t('qa_title')}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        <h2>
                            <LuFlaskConical size={18} /> {t('qa_title')}
                        </h2>
                        <span className={styles.badge}>{t('qa_subtitle')}</span>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={`${styles.runnerBadge} ${runnerOnline ? styles.runnerOnline : styles.runnerOffline}`}>
                            <span className={styles.runnerDot} />
                            {runnerOnline ? t('qa_runner_online') : t('qa_runner_offline')}
                        </span>
                        <button type="button" className={styles.closeBtn} onClick={closeQaConsole} aria-label={t('qa_close')}>
                            <LuX size={18} />
                        </button>
                    </div>
                </header>

                <nav className={styles.tabs}>
                    <button type="button" className={`${styles.tab} ${tab === 'guide' ? styles.tabActive : ''}`} onClick={() => setTab('guide')}>
                        <LuBookOpen size={14} /> {t('qa_tab_guide')}
                    </button>
                    <button type="button" className={`${styles.tab} ${tab === 'tests' ? styles.tabActive : ''}`} onClick={() => setTab('tests')}>
                        <LuListChecks size={14} /> {t('qa_tab_tests')}
                    </button>
                    <button type="button" className={`${styles.tab} ${tab === 'releases' ? styles.tabActive : ''}`} onClick={() => setTab('releases')}>
                        <LuPlay size={14} /> {t('qa_tab_releases')}
                    </button>
                    <button type="button" className={`${styles.tab} ${tab === 'bugs' ? styles.tabActive : ''}`} onClick={() => setTab('bugs')}>
                        <LuBug size={14} /> {t('qa_tab_bugs')}
                    </button>
                </nav>

                {error ? <div className={styles.errorBar}>{error}</div> : null}

                <div className={styles.panelScroll}>
                    {tab === 'guide' ? <GuideTab runnerOnline={runnerOnline} onGoTests={() => setTab('tests')} /> : null}
                    {tab === 'tests' ? (
                        <TestsTab runnerOnline={runnerOnline} onCreated={() => setTab('releases')} onError={setError} />
                    ) : null}
                    {tab === 'releases' ? <ReleasesTab onError={setError} /> : null}
                    {tab === 'bugs' ? <BugsTab onError={setError} /> : null}
                </div>
            </aside>
        </>
    );
}

// ============================================================ تب راهنما

const GuideTab: React.FC<{ runnerOnline: boolean; onGoTests: () => void }> = ({ runnerOnline, onGoTests }) => {
    const { t } = useTranslation('common');
    return (
        <div className={styles.guide}>
            <p className={styles.guideIntro}>{t('qa_guide_intro')}</p>

            {!runnerOnline ? (
                <div className={styles.guideWarn}>
                    <LuCircleX size={16} /> {t('qa_runner_offline_hint')}
                </div>
            ) : null}

            <Step
                index={1}
                icon={<LuTerminal size={15} />}
                title={t('qa_guide_step1_title')}
                body={t('qa_guide_step1_body')}
                code={'cd my-workspace-nextjs/apps/qa-runner\ncp .env.example .env     # QA_AUTH_TOKEN و QA_RUNNER_API_KEY را پر کنید\nnpx playwright install chromium'}
            />
            <Step
                index={2}
                icon={<LuRefreshCw size={15} />}
                title={t('qa_guide_step2_title')}
                body={t('qa_guide_step2_body')}
                code={'yarn qa:watch            # منتظر اجراهایی که از همین کنسول می‌سازید\n# یا اجرای یک‌باره:\nyarn qa:smoke            # بدون هزینه AI'}
            />
            <Step
                index={3}
                icon={<LuListChecks size={15} />}
                title={t('qa_guide_step3_title')}
                body={t('qa_guide_step3_body')}
            >
                <button type="button" className={styles.primaryBtn} onClick={onGoTests}>
                    <LuListChecks size={14} /> {t('qa_guide_step3_action')}
                </button>
            </Step>
            <Step
                index={4}
                icon={<LuCircleCheck size={15} />}
                title={t('qa_guide_step4_title')}
                body={t('qa_guide_step4_body')}
            />

            <div className={styles.guideCard}>
                <h4>{t('qa_guide_cost_title')}</h4>
                <ul>
                    <li><b>Smoke</b> — {t('qa_guide_cost_smoke')}</li>
                    <li><b>Full</b> — {t('qa_guide_cost_full')}</li>
                    <li><b>Paid</b> — {t('qa_guide_cost_paid')}</li>
                </ul>
            </div>

            <div className={styles.guideNote}>
                {t('qa_guide_mobile_note')}
            </div>
        </div>
    );
};

const Step: React.FC<{ index: number; icon: React.ReactNode; title: string; body: string; code?: string; children?: React.ReactNode }> = ({
    index,
    icon,
    title,
    body,
    code,
    children,
}) => (
    <div className={styles.guideStep}>
        <div className={styles.guideStepHead}>
            <span className={styles.guideStepNum}>{index}</span>
            <span className={styles.guideStepIcon}>{icon}</span>
            <h4>{title}</h4>
        </div>
        <p>{body}</p>
        {code ? <pre className={styles.guideCode} dir="ltr">{code}</pre> : null}
        {children}
    </div>
);

// ============================================================ تب تست‌ها (انتخاب و اجرا)

const TestsTab: React.FC<{ runnerOnline: boolean; onCreated: () => void; onError: (msg: string) => void }> = ({
    runnerOnline,
    onCreated,
    onError,
}) => {
    const { t } = useTranslation('common');
    const [cases, setCases] = useState<QaTestCase[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sectionFilter, setSectionFilter] = useState<string>('all');
    const [mode, setMode] = useState<QaRunMode>('smoke');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchQaTestCases();
            setCases(data.testCases);
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
        } finally {
            setLoading(false);
        }
    }, [onError]);

    useEffect(() => {
        load();
    }, [load]);

    const sections = useMemo(() => ['all', ...Array.from(new Set(cases.map((c) => c.section)))], [cases]);
    const visibleCases = useMemo(
        () => (sectionFilter === 'all' ? cases : cases.filter((c) => c.section === sectionFilter)),
        [cases, sectionFilter],
    );
    const selectedVisible = useMemo(
        () => visibleCases.filter((c) => selected.has(c.key)),
        [visibleCases, selected],
    );

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAllVisible = () => setSelected((prev) => new Set([...prev, ...visibleCases.map((c) => c.key)]));
    const clearSelection = () => setSelected(new Set());

    const runSelected = async (testKeys?: string[]) => {
        if (!runnerOnline) {
            onError(t('qa_runner_offline_hint'));
            return;
        }
        setCreating(true);
        try {
            const version = `manual-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
            await createQaRelease({ version, mode, testKeys });
            onCreated();
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={styles.section}>
            <div className={styles.testsToolbar}>
                <div className={styles.filterChips}>
                    {sections.map((s) => (
                        <button
                            key={s}
                            type="button"
                            className={`${styles.filterChip} ${sectionFilter === s ? styles.filterChipActive : ''}`}
                            onClick={() => setSectionFilter(s)}
                        >
                            {s === 'all' ? t('qa_filter_all') : s}
                        </button>
                    ))}
                </div>
                <div className={styles.testsActions}>
                    <select className={styles.modeSelect} value={mode} onChange={(e) => setMode(e.target.value as QaRunMode)} title={t('qa_mode')}>
                        <option value="smoke">{t('qa_mode_smoke')}</option>
                        <option value="full">{t('qa_mode_full')}</option>
                    </select>
                </div>
            </div>

            <div className={styles.testsBar}>
                <button type="button" className={styles.linkBtn} onClick={selectAllVisible}>{t('qa_select_all')}</button>
                <button type="button" className={styles.linkBtn} onClick={clearSelection}>{t('qa_clear_selection')}</button>
                <span className={styles.selectedCount}>
                    {t('qa_selected_count', { count: selectedVisible.length })}
                </span>
                <div className={styles.testsActions}>
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={creating || !selectedVisible.length}
                        onClick={() => runSelected(selectedVisible.map((c) => c.key))}
                        title={t('qa_run_selected_title')}
                    >
                        {creating ? <LuLoaderCircle className={styles.spin} size={14} /> : <LuPlay size={14} />}
                        {t('qa_run_selected')}
                    </button>
                    <button
                        type="button"
                        className={styles.ghostBtn}
                        disabled={creating || !cases.length}
                        onClick={() => runSelected(undefined)}
                        title={t('qa_run_all_title')}
                    >
                        <LuPlay size={14} /> {t('qa_run_all')}
                    </button>
                </div>
            </div>

            {!runnerOnline ? <div className={styles.guideWarn}><LuCircleX size={15} /> {t('qa_runner_offline_hint')}</div> : null}

            {loading ? (
                <div className={styles.emptyState}><LuLoaderCircle className={styles.spin} size={16} /> {t('qa_loading')}</div>
            ) : (
                <div className={styles.testList}>
                    {visibleCases.map((c) => (
                        <label key={c._id} className={`${styles.testRow} ${selected.has(c.key) ? styles.testRowSelected : ''}`}>
                            <input
                                type="checkbox"
                                checked={selected.has(c.key)}
                                onChange={() => toggle(c.key)}
                            />
                            <span className={styles.testKey}>{c.key}</span>
                            <span className={styles.testTitle} title={c.description}>{c.title}</span>
                            <span className={styles.testSection}>{c.section}</span>
                            <span className={`${styles.costBadge} ${styles[`cost_${c.costTier}`]}`}>
                                {c.costTier === 'free' ? t('qa_cost_free') : c.costTier === 'cheap' ? t('qa_cost_cheap') : t('qa_cost_paid')}
                            </span>
                            {c.type === 'api' ? <span className={styles.typeBadge}>API</span> : null}
                        </label>
                    ))}
                    {!visibleCases.length ? <div className={styles.emptyState}>{t('qa_tests_empty_hint')}</div> : null}
                </div>
            )}
        </div>
    );
};

// ============================================================ تب اجراها (Releaseها)

const ReleasesTab: React.FC<{ onError: (msg: string) => void }> = ({ onError }) => {
    const { t, i18n } = useTranslation('common');
    const lang = i18n.language || 'fa';
    const [summary, setSummary] = useState<QaSummaryData | null>(null);
    const [releases, setReleases] = useState<QaRelease[]>([]);
    const [selectedRelease, setSelectedRelease] = useState<QaRelease | null>(null);
    const [runs, setRuns] = useState<QaTestRun[]>([]);
    const [selectedRun, setSelectedRun] = useState<QaTestRun | null>(null);
    const [runLogs, setRunLogs] = useState<QaRunLog[]>([]);
    const [runArtifacts, setRunArtifacts] = useState<QaArtifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newVersion, setNewVersion] = useState('');
    const [newMode, setNewMode] = useState<QaRunMode>('smoke');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadReleases = useCallback(async () => {
        try {
            const data = await fetchQaSummary();
            setSummary(data);
            setReleases(data.releases);
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
        }
    }, [onError]);

    const loadDetail = useCallback(async (id: string) => {
        try {
            const data = await fetchQaReleaseDetail(id);
            setSelectedRelease(data.release);
            setRuns(data.runs);
            return data.release;
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
            return null;
        }
    }, [onError]);

    useEffect(() => {
        loadReleases().finally(() => setLoading(false));
    }, [loadReleases]);

    useEffect(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        if (!selectedRelease) return;
        const isActive = selectedRelease.status === 'running' || selectedRelease.status === 'pending';
        if (!isActive) return;
        pollRef.current = setInterval(() => loadDetail(selectedRelease._id), 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
        };
    }, [selectedRelease?.status, selectedRelease?._id, loadDetail]);

    const openRun = async (id: string) => {
        setLoading(true);
        try {
            const data = await fetchQaRunDetail(id);
            setSelectedRun(data.run);
            setRunLogs(data.logs);
            setRunArtifacts(data.artifacts);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newVersion.trim()) return;
        setCreating(true);
        try {
            await createQaRelease({ version: newVersion.trim(), mode: newMode });
            setNewVersion('');
            setShowCreate(false);
            await loadReleases();
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
        } finally {
            setCreating(false);
        }
    };

    const statusClass = (status: string) => styles[`status_${status}`] || '';
    const statusLabel = (status: string) => t(`qa_status_${status}`);

    if (selectedRun) {
        return (
            <div className={styles.section}>
                <div className={styles.detailHeader}>
                    <button type="button" className={styles.iconBtn} onClick={() => setSelectedRun(null)} aria-label={t('qa_back')}>
                        <LuArrowRight size={16} />
                    </button>
                    <h3>{selectedRun.key}</h3>
                    <span className={`${styles.statusBadge} ${statusClass(selectedRun.status)}`}>{statusLabel(selectedRun.status)}</span>
                    <div className={styles.detailActions}>
                        {selectedRun.status === 'failed' || selectedRun.status === 'skipped' ? (
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        await retryQaRun(selectedRun._id);
                                        setSelectedRun(null);
                                        if (selectedRelease) await loadDetail(selectedRelease._id);
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            >
                                <LuRefreshCw size={13} /> {t('qa_retry')}
                            </button>
                        ) : null}
                    </div>
                </div>
                <div className={styles.statRow}>
                    <span>{selectedRun.title}</span>
                    <span dir="ltr">{selectedRun.browser || '—'}</span>
                    <span>{formatDuration(selectedRun.durationMs, lang)}</span>
                </div>
                {selectedRun.error ? <pre className={styles.errorBox} dir="ltr">{selectedRun.error}</pre> : null}
                {selectedRun.skipReason ? <div className={styles.skipBox}>{selectedRun.skipReason}</div> : null}

                <h4 className={styles.subTitle}>{t('qa_artifacts')}</h4>
                <div className={styles.artifactGrid}>
                    {runArtifacts.map((a) => (
                        <a key={a._id} className={styles.artifactCard} href={a.url} target="_blank" rel="noreferrer">
                            {a.kind === 'screenshot' ? (
                                <img src={a.url} alt={a.label || 'screenshot'} loading="lazy" />
                            ) : (
                                <span className={styles.artifactFallback}>{a.kind}</span>
                            )}
                            <span className={styles.artifactLabel}>{a.label || a.kind}</span>
                        </a>
                    ))}
                    {!runArtifacts.length ? <div className={styles.emptyStateSmall}>{t('qa_no_artifacts')}</div> : null}
                </div>

                <h4 className={styles.subTitle}>{t('qa_logs')}</h4>
                <div className={styles.logList}>
                    {runLogs.map((log) => (
                        <div key={log._id} className={`${styles.logRow} ${styles[`log_${log.level}`] || ''}`}>
                            <span className={styles.logTime}>{formatDate(log.at, lang)}</span>
                            {log.step ? <span className={styles.logStep} dir="ltr">{log.step}</span> : null}
                            <span className={styles.logMessage} dir="auto">{log.message}</span>
                        </div>
                    ))}
                    {!runLogs.length ? <div className={styles.emptyStateSmall}>{t('qa_no_logs')}</div> : null}
                </div>
            </div>
        );
    }

    if (selectedRelease) {
        return (
            <div className={styles.section}>
                <div className={styles.detailHeader}>
                    <button type="button" className={styles.iconBtn} onClick={() => { setSelectedRelease(null); loadReleases(); }} aria-label={t('qa_back')}>
                        <LuArrowRight size={16} />
                    </button>
                    <h3>{selectedRelease.version}</h3>
                    <span className={`${styles.statusBadge} ${statusClass(selectedRelease.status)}`}>{statusLabel(selectedRelease.status)}</span>
                    <span className={styles.modeBadge}>{selectedRelease.mode === 'full' ? t('qa_mode_full') : t('qa_mode_smoke')}</span>
                    <div className={styles.detailActions}>
                        {selectedRelease.status === 'running' || selectedRelease.status === 'pending' ? (
                            <button type="button" className={styles.dangerBtn} disabled={busy} onClick={async () => {
                                setBusy(true);
                                try {
                                    await abortQaRelease(selectedRelease._id);
                                    await loadDetail(selectedRelease._id);
                                } finally {
                                    setBusy(false);
                                }
                            }}>
                                <LuSquare size={12} /> {t('qa_abort')}
                            </button>
                        ) : (
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={async () => {
                                setBusy(true);
                                try {
                                    await finishQaRelease(selectedRelease._id);
                                    await loadDetail(selectedRelease._id);
                                } finally {
                                    setBusy(false);
                                }
                            }}>
                                {t('qa_finish')}
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.statRow}>
                    <span>{t('qa_total')}: {selectedRelease.totals?.total ?? runs.length}</span>
                    <span className={styles.okText}>{t('qa_passed')}: {selectedRelease.totals?.passed ?? 0}</span>
                    <span className={styles.badText}>{t('qa_failed')}: {selectedRelease.totals?.failed ?? 0}</span>
                    <span>{t('qa_skipped')}: {selectedRelease.totals?.skipped ?? 0}</span>
                    <span dir="ltr">${selectedRelease.costUsd?.toFixed?.(3) ?? '0'}</span>
                </div>

                {loading ? <div className={styles.emptyState}><LuLoaderCircle className={styles.spin} size={16} /></div> : null}

                <div className={styles.runTable}>
                    <div className={`${styles.runRow} ${styles.runHeadRow}`}>
                        <span>{t('qa_col_key')}</span>
                        <span>{t('qa_col_title')}</span>
                        <span>{t('qa_col_section')}</span>
                        <span>{t('qa_col_status')}</span>
                        <span>{t('qa_col_duration')}</span>
                        <span>{t('qa_col_artifacts')}</span>
                    </div>
                    {runs.map((run) => (
                        <button key={run._id} type="button" className={styles.runRow} onClick={() => openRun(run._id)}>
                            <span className={styles.testKey}>{run.key}</span>
                            <span className={styles.runTitle} title={run.error || run.title}>{run.title}</span>
                            <span>{run.section}</span>
                            <span><span className={`${styles.statusBadge} ${statusClass(run.status)}`}>{statusLabel(run.status)}</span></span>
                            <span>{formatDuration(run.durationMs, lang)}</span>
                            <span className={styles.artifactCell}>
                                {run.artifactCount ? <><LuImage size={13} /> {run.artifactCount}</> : '—'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <div className={styles.testsToolbar}>
                <div className={styles.summaryChips}>
                    {summary ? (
                        <>
                            <span className={styles.summaryChip}>{summary.stats.totalReleases} {t('qa_unit_releases')}</span>
                            <span className={`${styles.summaryChip} ${styles.chip_passed}`}>{summary.stats.passed} {t('qa_passed')}</span>
                            <span className={`${styles.summaryChip} ${styles.chip_failed}`}>{summary.stats.failed} {t('qa_failed')}</span>
                        </>
                    ) : null}
                </div>
                <div className={styles.testsActions}>
                    <button type="button" className={styles.iconBtn} onClick={loadReleases} aria-label={t('qa_refresh')}>
                        <LuRefreshCw size={14} />
                    </button>
                    <button type="button" className={styles.primaryBtn} onClick={() => setShowCreate((v) => !v)}>
                        <LuPlus size={14} /> {t('qa_new_release')}
                    </button>
                </div>
            </div>

            {showCreate ? (
                <div className={styles.createForm}>
                    <input
                        className={styles.input}
                        placeholder={t('qa_version_placeholder')}
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        dir="ltr"
                    />
                    <select className={styles.input} value={newMode} onChange={(e) => setNewMode(e.target.value as QaRunMode)}>
                        <option value="smoke">{t('qa_mode_smoke')}</option>
                        <option value="full">{t('qa_mode_full')}</option>
                    </select>
                    <button type="button" className={styles.primaryBtn} disabled={creating || !newVersion.trim()} onClick={handleCreate}>
                        {creating ? <LuLoaderCircle className={styles.spin} size={14} /> : <LuCheck size={14} />} {t('qa_create_release')}
                    </button>
                </div>
            ) : null}

            {loading ? (
                <div className={styles.emptyState}><LuLoaderCircle className={styles.spin} size={16} /> {t('qa_loading')}</div>
            ) : (
                <div className={styles.releaseList}>
                    {releases.map((release) => (
                        <button
                            key={release._id}
                            type="button"
                            className={styles.releaseRow}
                            onClick={async () => {
                                setLoading(true);
                                await loadDetail(release._id);
                                setLoading(false);
                            }}
                        >
                            <div className={styles.releaseMain}>
                                <span className={styles.version}>{release.version}</span>
                                <span className={`${styles.statusBadge} ${statusClass(release.status)}`}>{statusLabel(release.status)}</span>
                                <span className={styles.modeBadge}>{release.mode === 'full' ? t('qa_mode_full') : t('qa_mode_smoke')}</span>
                            </div>
                            <div className={styles.releaseMeta}>
                                <span>{release.totals?.passed || 0}/{release.totals?.total || 0} {t('qa_passed')}</span>
                                {(release.totals?.failed || 0) > 0 ? <span className={styles.badText}>{release.totals.failed} {t('qa_failed')}</span> : null}
                                <span>{formatDate(release.createdAt, lang)}</span>
                            </div>
                            <div className={styles.progressTrack}>
                                <div
                                    className={`${styles.progressFill} ${(release.totals?.failed || 0) > 0 ? styles.progressBad : ''}`}
                                    style={{
                                        width: `${release.totals?.total ? Math.round(
                                            ((release.totals.passed + release.totals.failed + release.totals.skipped) / release.totals.total) * 100,
                                        ) : 0}%`,
                                    }}
                                />
                            </div>
                        </button>
                    ))}
                    {!releases.length ? <div className={styles.emptyState}>{t('qa_releases_empty')}</div> : null}
                </div>
            )}
        </div>
    );
};

// ============================================================ تب باگ‌ها

const BugsTab: React.FC<{ onError: (msg: string) => void }> = ({ onError }) => {
    const { t, i18n } = useTranslation('common');
    const lang = i18n.language || 'fa';
    const [bugs, setBugs] = useState<QaBug[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchQaBugs();
            setBugs(data.bugs);
        } catch (e) {
            onError(e instanceof Error ? e.message : 'error');
        } finally {
            setLoading(false);
        }
    }, [onError]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className={styles.section}>
            <div className={styles.testsToolbar}>
                <span className={styles.sectionHint}>{t('qa_bugs_hint')}</span>
                <button type="button" className={styles.iconBtn} onClick={load} aria-label={t('qa_refresh')}>
                    <LuRefreshCw size={14} />
                </button>
            </div>
            {loading ? (
                <div className={styles.emptyState}><LuLoaderCircle className={styles.spin} size={16} /> {t('qa_loading')}</div>
            ) : (
                <div className={styles.bugList}>
                    {bugs.map((bug) => (
                        <div key={bug._id} className={styles.bugCard}>
                            <div className={styles.bugHead}>
                                <span className={styles.testKey}>{bug.key}</span>
                                {bug.release?.version ? <span className={styles.versionBadge}>{bug.release.version}</span> : null}
                                <span className={styles.bugDate}>{formatDate(bug.createdAt, lang)}</span>
                            </div>
                            <div className={styles.bugTitle}>{bug.title}</div>
                            {bug.error ? <pre className={styles.bugError} dir="ltr">{bug.error}</pre> : null}
                            <div className={styles.bugFooter}>
                                {bug.screenshot?.url ? (
                                    <a className={styles.evidenceLink} href={bug.screenshot.url} target="_blank" rel="noreferrer">
                                        <LuImage size={13} /> {t('qa_view_evidence')}
                                    </a>
                                ) : null}
                                <span className={styles.sectionHint}>{t('qa_col_section')}: {bug.section}</span>
                            </div>
                        </div>
                    ))}
                    {!bugs.length ? <div className={styles.emptyState}>{t('qa_bugs_empty')}</div> : null}
                </div>
            )}
        </div>
    );
};

export default QaConsole;
