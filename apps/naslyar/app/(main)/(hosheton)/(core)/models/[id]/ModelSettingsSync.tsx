'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiSettings, FiLoader, FiSearch, FiX, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import syncStyles from './ModelPriceSync.module.scss';

export interface NodeSettingFieldOption {
    value: string;
    label: string;
}

export interface NodeSettingUrlSourcePreview {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    itemsPath?: string;
    valuePath?: string;
    labelPath?: string;
}

export interface NodeSettingFieldPreview {
    key: string;
    label: string;
    labelFa?: string;
    type: string;
    placeholder?: string;
    hintFa?: string;
    min?: number;
    max?: number;
    step?: number;
    optionsSource?: string;
    options?: NodeSettingFieldOption[];
    urlSource?: NodeSettingUrlSourcePreview;
}

interface SettingsPreviewResult {
    matched: boolean;
    source?: string;
    sourceLabel?: string;
    docsUrl?: string;
    settingsSchema: NodeSettingFieldPreview[];
    fieldCount: number;
    notes?: string;
    provenance?: {
        sourceUrl: string;
        fetchedAt: string;
        docAnchor: string;
        excerptHash: string;
        parserVersion: string;
        warnings: string[];
    };
}

interface Props {
    modelName: string;
    modelClass: string;
    providerName?: string;
    token: string;
    baseUrl: string;
    currentSettings?: NodeSettingFieldPreview[];
    onApply: (
        fields: NodeSettingFieldPreview[],
        provenance?: SettingsPreviewResult['provenance'],
    ) => void;
}

export default function ModelSettingsSync({
    modelName,
    modelClass,
    providerName,
    token,
    baseUrl,
    currentSettings = [],
    onApply,
}: Props) {
    const [open, setOpen] = useState(false);
    const [sources, setSources] = useState<{
        id: string;
        label: string;
        docsUrl?: string;
        providerHints?: string[];
        classHints?: string[];
    }[]>([]);
    const [selectedSource, setSelectedSource] = useState('');
    const [loading, setLoading] = useState(false);
    const [found, setFound] = useState<SettingsPreviewResult | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || sources.length > 0) return;
        axios.get(`${baseUrl}/api/provider-models/settings/sources`, { headers: { authorization: `Bearer ${token}` } })
            .then((res) => {
                if (res.data?.statusCode === 200) {
                    const list = res.data.data || [];
                    setSources(list);
                    if (list.length) {
                        const providerKey = String(providerName || '').toLowerCase();
                        const preferred = list.find((source: {
                            id: string;
                            providerHints?: string[];
                            classHints?: string[];
                        }) =>
                            source.providerHints?.some((hint) =>
                                providerKey.includes(String(hint).toLowerCase()),
                            )
                            && (
                                !source.classHints?.length
                                || source.classHints.some((hint) =>
                                    String(hint).toLowerCase() === String(modelClass).toLowerCase(),
                                )
                            ),
                        );
                        setSelectedSource(preferred?.id || list[0].id);
                    }
                }
            })
            .catch(() => {
                setSources([
                    { id: 'byteplus-image-docs', label: 'BytePlus image generation official docs (crawl only)', docsUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1541523', providerHints: ['byteplus', 'modelark', 'seedream'], classHints: ['image'] },
                    { id: 'seedance', label: 'BytePlus Seedance', docsUrl: 'https://docs.byteplus.com/en/docs/ModelArk/2291680' },
                    { id: 'heygen', label: 'HeyGen', docsUrl: 'https://docs.heygen.com/' },
                    { id: 'kling', label: 'Kling AI', docsUrl: 'https://app.klingai.com/global/dev/document-api/' },
                    { id: 'elevenlabs', label: 'ElevenLabs', docsUrl: 'https://elevenlabs.io/docs/api-reference/text-to-speech' },
                    { id: 'gemini-docs', label: 'Google Gemini official docs (crawl only)', docsUrl: 'https://ai.google.dev/gemini-api/docs' },
                    { id: 'openai-docs', label: 'OpenAI official docs (crawl only)', docsUrl: 'https://developers.openai.com/api/reference/' },
                ]);
                setSelectedSource(modelClass === 'image' ? 'byteplus-image-docs' : 'seedance');
            });
    }, [open, baseUrl, token, sources.length, providerName, modelClass]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const search = async (source = selectedSource) => {
        if (!modelName.trim()) {
            ErrorToaster({ message: 'ابتدا شناسه مدل را وارد کنید.' });
            return;
        }

        setLoading(true);
        setFound(null);

        try {
            const res = await axios.post(
                `${baseUrl}/api/provider-models/settings/preview`,
                {
                    modelName: modelName.trim(),
                    providerName: providerName || '',
                    modelClass,
                    source: source || undefined,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );

            const result: SettingsPreviewResult = res.data?.data;
            if (result?.matched && result.settingsSchema?.length) {
                setFound(result);
            } else {
                ErrorToaster({ message: result?.notes || `تنظیماتی برای «${modelName}» پیدا نشد.` });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (!found?.settingsSchema?.length) return;
        onApply(found.settingsSchema, found.provenance);
        SuccessToaster({ message: `${found.fieldCount} فیلد تنظیمات اعمال شد — لطفاً بررسی کنید.` });
        setOpen(false);
        setFound(null);
    };

    const docsUrl = found?.docsUrl || sources.find((s) => s.id === selectedSource)?.docsUrl;

    return (
        <div className={syncStyles.wrapper} ref={panelRef}>
            <div className={syncStyles.bar}>
                <div className={syncStyles.barInfo}>
                    <FiSettings size={14} className={syncStyles.barIcon} />
                    <div>
                        <span className={syncStyles.barTitle}>همگام‌سازی تنظیمات از مستندات</span>
                        <span className={syncStyles.barHint}>
                            پارامترهای API (duration، resolution، ...) را از کاتالوگ مدل‌های شناخته‌شده بارگذاری می‌کند.
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    className={syncStyles.triggerBtn}
                    onClick={() => setOpen((p) => !p)}
                    disabled={!modelName.trim()}
                >
                    {open ? <><FiX size={14} /> بستن</> : <><FiSearch size={14} /> بارگذاری تنظیمات</>}
                </button>
            </div>

            {open && (
                <div className={syncStyles.panel}>
                    <div className={syncStyles.searchRow}>
                        <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className={syncStyles.sourceSelect}
                        >
                            {sources.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className={syncStyles.searchBtn}
                            onClick={() => search(selectedSource)}
                            disabled={loading}
                        >
                            {loading ? <><FiLoader size={13} className={syncStyles.spin} /> جستجو...</> : <><FiSearch size={13} /> بارگذاری</>}
                        </button>
                        {docsUrl && (
                            <a href={docsUrl} target="_blank" rel="noreferrer" className={syncStyles.sourceLink}>
                                مستندات رسمی <FiExternalLink size={11} />
                            </a>
                        )}
                    </div>

                    <p className={syncStyles.searchHint}>
                        جستجو برای: <code>{modelName}</code>
                        {modelClass && <> — کلاس: <code>{modelClass}</code></>}
                    </p>

                    {found && (
                        <div className={syncStyles.foundBox}>
                            <div className={syncStyles.foundHeader}>
                                <FiCheckCircle size={15} className={syncStyles.foundIcon} />
                                <div>
                                    <strong>{found.fieldCount} فیلد تنظیمات پیدا شد</strong>
                                    <span>منبع: {found.sourceLabel || found.source}</span>
                                </div>
                            </div>

                            <table className={syncStyles.table}>
                                <thead>
                                    <tr>
                                        <th>key</th>
                                        <th>نوع</th>
                                        <th>عنوان</th>
                                        <th>تغییر</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {found.settingsSchema.map((f) => (
                                        <tr key={f.key}>
                                            <td><code>{f.key}</code></td>
                                            <td>{f.type}</td>
                                            <td>{f.labelFa || f.label}</td>
                                            <td>
                                                {currentSettings.some((current) =>
                                                    current.key === f.key
                                                    && JSON.stringify(current) === JSON.stringify(f)
                                                ) ? 'بدون تغییر' : currentSettings.some((current) => current.key === f.key) ? 'بروزرسانی' : 'جدید'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {found.notes && <p className={syncStyles.emptyHint} style={{ textAlign: 'right' }}>{found.notes}</p>}
                            {found.provenance && (
                                <div className={syncStyles.emptyHint} style={{ textAlign: 'left', direction: 'ltr' }}>
                                    <div>Fetched: {new Date(found.provenance.fetchedAt).toLocaleString()}</div>
                                    <div>Anchor: {found.provenance.docAnchor}</div>
                                    <div>Parser: {found.provenance.parserVersion}</div>
                                    <div>SHA-256: <code>{found.provenance.excerptHash}</code></div>
                                    {found.provenance.warnings.map((warning) => (
                                        <div key={warning}>Warning: {warning}</div>
                                    ))}
                                </div>
                            )}

                            <button type="button" className={syncStyles.applyBtn} onClick={handleApply}>
                                اعمال تنظیمات به فرم ←
                            </button>
                        </div>
                    )}

                    {!loading && !found && (
                        <p className={syncStyles.emptyHint}>
                            منبع را انتخاب کنید و «بارگذاری» را بزنید. سپس با مستندات رسمی مقایسه کنید.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
