'use client';

import { useMemo, useState } from 'react';
import { LuLightbulb, LuPlay } from 'react-icons/lu';
import { toFarsiNumber } from '@my-workspace/utils';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { explorerQuery, type ExplorerTargetQuery, type QueryResult } from '../lib/database-api';
import { pipelineTemplates, type SchemaField } from './suggestions';
import CodeEditor from './CodeEditor';
import ResultsView from './ResultsView';
import SuggestionsDialog from './SuggestionsDialog';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

export default function AggregatePanel({
    baseUrl,
    token,
    target,
    collection,
    fields,
    onOpen,
}: {
    baseUrl: string;
    token: string;
    target: ExplorerTargetQuery;
    collection: string;
    fields: SchemaField[];
    onOpen: (doc: any) => void;
}) {
    const [mode, setMode] = useState<'aggregate' | 'distinct'>('aggregate');
    const [pipeline, setPipeline] = useState('[\n  { $match: {} },\n  { $limit: 20 }\n]');
    const [field, setField] = useState('');
    const [filter, setFilter] = useState('{}');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const templates = useMemo(() => pipelineTemplates(fields), [fields]);

    const run = async (p = pipeline) => {
        try {
            setLoading(true);
            setError('');
            const res =
                mode === 'aggregate'
                    ? await explorerQuery(baseUrl, token, target, { collection, op: 'aggregate', pipeline: p, limit: 500 })
                    : await explorerQuery(baseUrl, token, target, { collection, op: 'distinct', field, filter });
            setResult(res);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'اجرا نشد');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <SimpleLineTabs
                tabs={[
                    { id: 'aggregate', label: 'Aggregate (گزارش و گروه‌بندی)' },
                    { id: 'distinct', label: 'مقدارهای یکتا (distinct)' },
                ]}
                activeTab={mode}
                onChange={(id) => {
                    setMode(id as 'aggregate' | 'distinct');
                    setResult(null);
                    setError('');
                }}
            />

            <div className={styles.panel}>
            <div className={styles.panelHead}>
                <div>
                    <h3 className={styles.panelTitle}>{mode === 'aggregate' ? 'گزارش با pipeline' : 'مقدارهای یکتای یک فیلد'}</h3>
                    <p className={styles.panelLead}>
                        {mode === 'aggregate'
                            ? 'مرحله‌ها را بنویسید یا از «گزارش‌های آماده» یکی را بردارید؛ فقط خواندن است و داده‌ای عوض نمی‌شود.'
                            : 'ببینید یک فیلد چه مقدارهایی دارد (مثلاً همهٔ وضعیت‌ها)؛ فیلتر اختیاری است.'}
                    </p>
                </div>
                {mode === 'aggregate' && (
                    <button type="button" className={db.secondaryBtn} onClick={() => setSuggestOpen(true)}>
                        <LuLightbulb /> گزارش‌های آماده ({toFarsiNumber(templates.length)})
                    </button>
                )}
            </div>
            {mode === 'aggregate' ? (
                <>
                    <label className={styles.editorBox}>
                        <span className={styles.editorLabel}>
                            <b>pipeline</b> آرایه‌ای از مرحله‌ها؛ حداکثر ۵۰۰ سند برمی‌گردد. $out و $merge مجاز نیست.
                        </span>
                        <CodeEditor value={pipeline} onChange={setPipeline} onRun={() => run()} rows={8} ariaLabel="pipeline" />
                    </label>
                </>
            ) : (
                <div className={styles.editorGrid}>
                    <label className={styles.editorBox}>
                        <span className={styles.editorLabel}><b>فیلد</b></span>
                        <input className={`${styles.input} ${styles.ltr}`} list="dbx-fields" value={field} onChange={(e) => setField(e.target.value)} placeholder="status" />
                        <datalist id="dbx-fields">
                            {fields.map((f) => (
                                <option key={f.path} value={f.path} />
                            ))}
                        </datalist>
                    </label>
                    <label className={styles.editorBox}>
                        <span className={styles.editorLabel}><b>فیلتر</b> (اختیاری)</span>
                        <CodeEditor value={filter} onChange={setFilter} onRun={() => run()} rows={1} ariaLabel="فیلتر" />
                    </label>
                </div>
            )}

            <div className={styles.runRow}>
                <button type="button" className={db.primaryBtn} onClick={() => run()} disabled={loading || (mode === 'distinct' && !field.trim())}>
                    <LuPlay /> {loading ? 'در حال اجرا…' : 'اجرا'}
                </button>
                <span className={styles.kbd}>Ctrl + Enter</span>
            </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {result && <ResultsView result={result} collection={collection} onOpen={onOpen} editable={false} />}

            <SuggestionsDialog
                open={suggestOpen}
                onClose={() => setSuggestOpen(false)}
                title="گزارش‌های آماده"
                lead={`برای مجموعهٔ ${collection}؛ روی هر گزارش بزنید تا pipeline آن در کادر بنشیند و اجرا شود.`}
                groups={[
                    {
                        title: 'گزارش‌های این مجموعه',
                        lead: 'از روی فیلدهای همین مجموعه ساخته شده‌اند؛ بعد از اجرا می‌توانید pipeline را در کادر تغییر دهید.',
                        items: templates.map((t) => ({
                            key: t.label,
                            label: t.label,
                            hint: t.hint,
                            code: t.pipeline,
                            onPick: () => {
                                setPipeline(t.pipeline);
                                void run(t.pipeline);
                            },
                        })),
                    },
                ]}
            />
        </div>
    );
}
