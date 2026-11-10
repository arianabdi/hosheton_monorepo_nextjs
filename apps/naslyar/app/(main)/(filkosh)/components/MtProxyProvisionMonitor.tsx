'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LuCheck, LuLoader, LuCircleSlash, LuClock, LuX} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {filkoshApi, MtProxyProvisionSnapshot} from '../lib/filkosh-api';

const STATE_LABEL: Record<string, string> = {
    running: 'در حال نصب',
    ok: 'نصب کامل شد',
    failed: 'نصب ناموفق',
    cancelled: 'متوقف شد',
};

const STEP_STATE_LABEL: Record<string, string> = {
    pending: 'در انتظار',
    running: 'در حال اجرا',
    ok: 'انجام شد',
    failed: 'خطا',
    skipped: 'رد شد',
};

/**
 * نمایش زنده‌ی پیشرفت نصب MTProto proxy:
 * مراحل، لاگ خط‌به‌خط، دکمه توقف و نتیجه نهایی.
 * هر ۲ ثانیه وضعیت را از سرور می‌گیرد تا وقتی job تمام شود.
 */
export default function MtProxyProvisionMonitor({
    nodeId,
    onFinished,
    autoCancelBanner = true,
}: {
    nodeId: string;
    /** بعد از پایان موفق/ناموفق صدا زده می‌شود (state نهایی را می‌گیرد) */
    onFinished?: (state: string) => void;
    autoCancelBanner?: boolean;
}) {
    const [snap, setSnap] = useState<MtProxyProvisionSnapshot | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logBoxRef = useRef<HTMLDivElement | null>(null);
    const finishedRef = useRef(false);
    // onFinished در ref نگه داشته می‌شود تا poll نسبت به آن پایدار بماند؛
    // در غیر این صورت هر رندرِ والد، useEffect پولینگ را ری‌استارت و finishedRef را
    // پاک می‌کند و onFinished مدام دوباره صدا زده می‌شود (حلقه‌ی reload).
    const onFinishedRef = useRef(onFinished);

    useEffect(() => {
        onFinishedRef.current = onFinished;
    }, [onFinished]);

    const isLiveRunning = !!snap && (snap.state === 'running' || snap.running === true);

    const poll = useCallback(async () => {
        try {
            const s = await filkoshApi.getMtProxyProvisionStatus(nodeId);
            setSnap(s);
            if (!s.running && s.state !== 'running' && !finishedRef.current) {
                finishedRef.current = true;
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                onFinishedRef.current?.(s.state);
            }
        } catch {
            // خطای شبکه موقتی — بدون toast (جلوگیری از اسپم)؛ polling ادامه پیدا می‌کند
        }
    }, [nodeId]);

    useEffect(() => {
        finishedRef.current = false;
        // پولینگ اول با setTimeout(0) — مطابق الگوی useLoadOnMount — تا setState
        // به صورت sync در بدنه‌ی effect صدا زده نشود.
        const bootTimer = window.setTimeout(() => void poll(), 0);
        timerRef.current = setInterval(() => void poll(), 2000);
        return () => {
            window.clearTimeout(bootTimer);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [poll]);

    // اسکرول خودکار لاگ به آخرین خط
    useEffect(() => {
        const box = logBoxRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [snap?.logs?.length]);

    const cancel = async () => {
        try {
            setCancelling(true);
            await filkoshApi.cancelMtProxyProvision(nodeId);
            SuccessToaster({message: 'دستور توقف صادر شد — در حال جمع‌بندی…'});
            void poll();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setCancelling(false);
        }
    };

    if (!snap) {
        return (
            <div className={styles.provisionBox}>
                <div className={styles.provisionHead}>
                    <LuLoader className={styles.spinIcon} size={16} />
                    <span>در حال دریافت وضعیت نصب…</span>
                </div>
            </div>
        );
    }

    // وقتی job زنده در حافظه نیست (پس از ری‌استارت API) — نمایش از آخرین وضعیت ذخیره‌شده روی نود
    const view: MtProxyProvisionSnapshot = snap.state
        ? snap
        : {
            nodeId: snap.nodeId,
            nodeName: snap.nodeName,
            state: snap.persisted?.state || 'failed',
            method: snap.persisted?.method || '',
            steps: [],
            stepIndex: snap.persisted?.stepIndex || 0,
            stepTotal: snap.persisted?.stepTotal || 0,
            logs: snap.persisted?.logs || [],
            startedAt: snap.persisted?.startedAt || '',
            finishedAt: snap.persisted?.finishedAt || null,
            error: snap.persisted?.error || '',
            cancelRequested: false,
            running: false,
        };

    const steps = view.steps?.length ? view.steps : [];
    const progressPercent = view.stepTotal
        ? Math.round(((view.stepIndex + (view.state === 'ok' ? 1 : 0)) / view.stepTotal) * 100)
        : 0;
    const doneCount = steps.filter((s) => s.state === 'ok').length;

    return (
        <div className={styles.provisionBox}>
            <div className={styles.provisionHead}>
                <div className={styles.provisionTitleWrap}>
                    {isLiveRunning ? (
                        <LuLoader className={styles.spinIcon} size={18} />
                    ) : view.state === 'ok' ? (
                        <LuCheck className={styles.provisionIconOk} size={18} />
                    ) : (
                        <LuCircleSlash className={styles.provisionIconFail} size={18} />
                    )}
                    <div>
                        <h3 className={styles.provisionTitle}>
                            {STATE_LABEL[view.state] || view.state}
                            {view.method === 'docker' ? ' (Docker)' : ' (systemd)'}
                        </h3>
                        <p className={styles.provisionMeta}>
                            {steps.length
                                ? `${toFarsiNumber(doneCount)} از ${toFarsiNumber(view.stepTotal)} مرحله انجام شد`
                                : 'گزارش آخرین نصب (بدون جزئیات مراحل)'}
                            {view.startedAt ? ` · شروع: ${new Date(view.startedAt).toLocaleTimeString('fa-IR')}` : ''}
                        </p>
                    </div>
                </div>
                {isLiveRunning ? (
                    <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={cancel}
                        disabled={cancelling || view.cancelRequested}
                    >
                        <LuX size={14} />
                        {view.cancelRequested ? 'در حال توقف…' : cancelling ? '…' : 'توقف نصب'}
                    </button>
                ) : null}
            </div>

            {steps.length ? (
                <div className={styles.provisionProgressTrack}>
                    <div
                        className={styles.provisionProgressFill}
                        data-tone={view.state === 'failed' ? 'fail' : view.state === 'cancelled' ? 'cancel' : 'ok'}
                        style={{width: `${Math.max(progressPercent, 4)}%`}}
                    />
                </div>
            ) : null}

            {autoCancelBanner && view.cancelRequested && isLiveRunning ? (
                <p className={styles.provisionBanner}>درخواست توقف ثبت شده — چند لحظه تا متوقف شدن کامل صبر کنید.</p>
            ) : null}

            {steps.length ? (
                <ol className={styles.provisionSteps}>
                    {steps.map((step, i) => (
                        <li
                            key={step.key}
                            className={styles.provisionStep}
                            data-state={step.state}
                        >
                            <span className={styles.provisionStepIcon}>
                                {step.state === 'ok' ? <LuCheck size={13} /> : null}
                                {step.state === 'running' ? <LuLoader className={styles.spinIcon} size={13} /> : null}
                                {step.state === 'failed' ? <LuX size={13} /> : null}
                                {step.state === 'pending' ? <LuClock size={13} /> : null}
                                {step.state === 'skipped' ? <LuCircleSlash size={13} /> : null}
                            </span>
                            <span className={styles.provisionStepLabel}>
                                {toFarsiNumber(i + 1)}. {step.label}
                                {step.detail ? <em className={styles.provisionStepDetail}> — {step.detail}</em> : null}
                            </span>
                            <span className={styles.provisionStepState}>{STEP_STATE_LABEL[step.state] || step.state}</span>
                        </li>
                    ))}
                </ol>
            ) : null}

            {view.error ? <p className={styles.installError}>{view.error}</p> : null}

            {view.logs?.length ? (
                <div className={styles.provisionLogBox} ref={logBoxRef}>
                    {view.logs.map((l, i) => (
                        <div key={`${l.at}-${i}`} className={styles.provisionLogLine} data-stream={l.stream}>
                            <span className={styles.provisionLogTime}>
                                {new Date(l.at).toLocaleTimeString('fa-IR')}
                            </span>
                            <span>{l.line}</span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
