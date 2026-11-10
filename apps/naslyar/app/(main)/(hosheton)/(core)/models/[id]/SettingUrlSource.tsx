'use client';

import { useState } from 'react';
import axios from 'axios';

import styles from './SettingFieldEditor.module.scss';
import { buildUrlSourcePayload, type NodeSettingFieldForm } from './settingFieldForm';

function formatRawServerResponse(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

type UrlSourceTestResult = {
    upstreamRaw: unknown;
    upstreamStatus?: number | null;
    options: Array<{ value: string; label: string }>;
    isError: boolean;
};

function parseUrlSourceTestResponse(payload: unknown): UrlSourceTestResult {
    const body = (payload && typeof payload === 'object' ? payload : {}) as {
        data?: {
            raw?: unknown;
            status?: number | null;
            options?: Array<{ value: string; label: string }>;
            message?: unknown;
        };
        statusCode?: number;
    };
    const nested = body.data;
    const statusCode = body.statusCode ?? nested?.status ?? null;
    return {
        upstreamRaw: nested?.raw ?? nested ?? body,
        upstreamStatus: nested?.status ?? statusCode,
        options: Array.isArray(nested?.options) ? nested.options : [],
        isError: Boolean(statusCode && statusCode >= 400),
    };
}

function UrlSourceTestResultPanel({ result }: { result: UrlSourceTestResult }) {
    return (
        <div className={styles.testResult}>
            <section>
                <span className={styles.testResultTitle}>
                    پاسخ سرور مقصد
                    {result.upstreamStatus != null ? <span className={styles.hint}> — HTTP {result.upstreamStatus}</span> : null}
                </span>
                <span className={styles.sectionHint}>
                    از روی همین JSON مسیر آرایه و فیلدهای value / label را پیدا کنید.
                </span>
                <pre className={styles.pre}>{formatRawServerResponse(result.upstreamRaw)}</pre>
            </section>
            {!result.isError ? (
                <section>
                    <span className={styles.testResultTitle}>گزینه‌های نهایی ({result.options.length} مورد)</span>
                    <span className={styles.sectionHint}>همین لیست در استودیو به‌جای گزینه‌های ثابت نمایش داده می‌شود.</span>
                    <pre className={styles.pre}>{formatRawServerResponse(result.options)}</pre>
                </section>
            ) : null}
        </div>
    );
}

/**
 * ویرایشگر + تست زنده‌ی `NodeSettingField.urlSource` — اتصال فیلد select به هر آدرس دلخواه
 * و بررسی نگاشت value / label قبل از ذخیره.
 */
export default function SettingUrlSource({
    field,
    onPatch,
    token,
    baseUrl,
    providerName,
}: {
    field: NodeSettingFieldForm;
    onPatch: (patch: Partial<NodeSettingFieldForm>) => void;
    token: string | null;
    baseUrl: string;
    providerName?: string;
}) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<UrlSourceTestResult | null>(null);

    const runTest = async () => {
        const urlSource = buildUrlSourcePayload(field);
        if (!urlSource) {
            setTestResult(null);
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post(
                `${baseUrl}/api/ai/options/fetch`,
                { ...urlSource, providerName: providerName || undefined },
                { headers: { authorization: `Bearer ${token ?? ''}` } },
            );
            setTestResult(parseUrlSourceTestResponse(res.data));
        } catch (e) {
            const err = e as { response?: { data?: unknown } };
            setTestResult(parseUrlSourceTestResponse(err.response?.data ?? e));
        } finally {
            setTesting(false);
        }
    };

    return (
        <>
            <div className={`${styles.grid} ${styles.grid4}`}>
                <label className={`${styles.field} ${styles.span2}`}>
                    <span className={styles.fieldLabel}>آدرس URL *</span>
                    <input
                        value={field.urlSourceUrl}
                        className={styles.ltr}
                        placeholder="{{baseUrl}}/voices"
                        onChange={(e) => onPatch({ urlSourceUrl: e.target.value })}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>متد</span>
                    <select
                        value={field.urlSourceMethod}
                        onChange={(event) => onPatch({ urlSourceMethod: event.target.value as 'GET' | 'POST' })}
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                    </select>
                </label>
                <span />
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>مسیر آرایه <span className={styles.fieldCode}>itemsPath</span></span>
                    <input
                        value={field.urlSourceItemsPath}
                        className={styles.ltr}
                        placeholder="voices"
                        onChange={(e) => onPatch({ urlSourceItemsPath: e.target.value })}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>فیلد مقدار <span className={styles.fieldCode}>valuePath</span></span>
                    <input
                        value={field.urlSourceValuePath}
                        className={styles.ltr}
                        placeholder="voice_id"
                        onChange={(e) => onPatch({ urlSourceValuePath: e.target.value })}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>فیلد عنوان <span className={styles.fieldCode}>labelPath</span></span>
                    <input
                        value={field.urlSourceLabelPath}
                        className={styles.ltr}
                        placeholder="name"
                        onChange={(e) => onPatch({ urlSourceLabelPath: e.target.value })}
                    />
                </label>
                <span />
                <label className={`${styles.field} ${styles.spanAll}`}>
                    <span className={styles.fieldLabel}>هدرها <span className={styles.hint}>(هر خط: Key: Value)</span></span>
                    <textarea
                        rows={2}
                        className={`${styles.ltr} ${styles.mono}`}
                        value={field.urlSourceHeaders}
                        placeholder={'xi-api-key: {{apiKey}}'}
                        onChange={(e) => onPatch({ urlSourceHeaders: e.target.value })}
                    />
                    <span className={styles.hint}>
                        متغیرها: {'{{baseUrl}}'}، {'{{apiKey}}'}، {'{{metadata.<key>}}'} — از حساب فعال ارائه‌دهنده
                        ({providerName || '—'}) پر می‌شوند. baseUrl معمولاً /v1 دارد؛ پس فقط /voices بگذارید نه /v1/voices.
                    </span>
                </label>
            </div>
            <div>
                <button
                    type="button"
                    className={styles.ghostBtn}
                    disabled={testing || !field.urlSourceUrl.trim()}
                    onClick={runTest}
                >
                    {testing ? 'در حال آزمایش…' : 'آزمایش دریافت گزینه‌ها'}
                </button>
            </div>
            {testResult ? <UrlSourceTestResultPanel result={testResult} /> : null}
        </>
    );
}
