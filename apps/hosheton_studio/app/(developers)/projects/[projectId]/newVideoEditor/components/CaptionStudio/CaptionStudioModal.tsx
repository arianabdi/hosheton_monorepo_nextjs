'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuCheck, LuChevronDown, LuChevronUp, LuLoaderCircle, LuPlus, LuSparkles, LuTrash2,
} from 'react-icons/lu';
import { ModalCloseButton, ModalHelper } from '@my-workspace/components';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { runVideoEditorTranscribe, type CaptionSegment } from '../../utils/editor-agent-api';
import type { Clip, TextClipStyle } from '../../types/timeline';
import { mergeTextStyle } from '../../utils/text-style';
import TextStyleControls from '../TextStyleControls/TextStyleControls';
import { MobileEditorScreen } from '../MobileEditor/MobileEditor';
import styles from './CaptionStudioModal.module.scss';

export type CaptionSegmentDraft = {
    start: number;
    end: number;
    text: string;
    /** Per-row style overrides applied on top of the shared caption style. */
    style?: Partial<TextClipStyle>;
};

/** "As transcribed" — no re-splitting by word count. */
export const CAPTION_WORDS_UNLIMITED = 999;

/**
 * CapCut-style regrouping: merge every row's words onto one flat timeline
 * (word timing spread evenly inside its row) and re-cut into chunks of at
 * most `maxWords` words.
 */
export function regroupCaptionsByWordCount(
    rows: CaptionSegmentDraft[],
    maxWords: number,
): CaptionSegmentDraft[] {
    if (!rows.length || maxWords >= CAPTION_WORDS_UNLIMITED) return rows;
    const words: Array<{ word: string; start: number; end: number }> = [];
    for (const row of rows) {
        const parts = row.text.split(/\s+/).filter(Boolean);
        if (!parts.length) continue;
        const duration = Math.max(0.2, row.end - row.start);
        const per = duration / parts.length;
        parts.forEach((word, index) => {
            words.push({ word, start: row.start + index * per, end: row.start + (index + 1) * per });
        });
    }
    const out: CaptionSegmentDraft[] = [];
    for (let index = 0; index < words.length; index += maxWords) {
        const chunk = words.slice(index, index + maxWords);
        out.push({
            start: chunk[0].start,
            end: chunk[chunk.length - 1].end,
            text: chunk.map((item) => item.word).join(' '),
        });
    }
    return out;
}

export type CaptionStudioApplyPayload = {
    sourceClipId: string;
    segments: CaptionSegmentDraft[];
    style: Partial<TextClipStyle>;
    replaceExisting: boolean;
};

type CaptionStudioModalProps = {
    projectId: string;
    clips: Clip[];
    /** video clip id → { count, style } of existing auto-caption rows. */
    captionGroups: Map<string, { count: number; style?: TextClipStyle }>;
    selectedClipId: string | null;
    onClose: () => void;
    onApply: (payload: CaptionStudioApplyPayload) => void;
    /** Phone layout: open as a full-screen editor window instead of a modal. */
    screenDir?: 'rtl' | 'ltr';
};

const LANGUAGE_VALUES = ['auto', 'fa', 'en', 'ar', 'tr'] as const;

/** Models whose names hint at audio/video understanding score first. */
const AUDIO_HINT = /audio|omni|whisper|transcri|gemini|gpt-4o|realtime|-a\b|qvq/i;

function formatTime(value: number) {
    const total = Math.max(0, value);
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * "Caption Studio": transcribe a video clip's speech into timed caption rows,
 * edit every row in one place, style them all at once, then drop them onto a
 * text layer above the video.
 */
export default function CaptionStudioModal({
    projectId,
    clips,
    captionGroups,
    selectedClipId,
    onClose,
    onApply,
    screenDir,
}: CaptionStudioModalProps) {
    const { t } = useTranslation('videoEditor');

    const [sourceClipId, setSourceClipId] = useState<string>(() => (
        selectedClipId && clips.some((clip) => clip.id === selectedClipId)
            ? selectedClipId
            : (clips[0]?.id ?? '')
    ));
    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [modelId, setModelId] = useState('');
    const [language, setLanguage] = useState<(typeof LANGUAGE_VALUES)[number]>('auto');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<CaptionSegmentDraft[] | null>(null);
    /** Full transcript, kept so word-count re-splitting never loses text. */
    const [rawSegments, setRawSegments] = useState<CaptionSegmentDraft[] | null>(null);
    const [wordsPerCaption, setWordsPerCaption] = useState(CAPTION_WORDS_UNLIMITED);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [detectedNote, setDetectedNote] = useState<string | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(true);
    /** User-edited style; null = follow the existing caption group's style. */
    const [styleOverride, setStyleOverride] = useState<TextClipStyle | null>(null);

    useEffect(() => {
        let cancelled = false;
        providersApi.listModels({ class: 'text' })
            .then((res) => {
                if (cancelled) return;
                const list = (res.models || [])
                    .filter((model) => model.isActive !== false && model.isAlive !== false)
                    .sort((a, b) => (
                        Number(AUDIO_HINT.test(b.name || '')) - Number(AUDIO_HINT.test(a.name || ''))
                    ));
                setModels(list);
                setModelId((current) => (current && list.some((model) => model._id === current)
                    ? current
                    : (list.find((model) => AUDIO_HINT.test(model.name || ''))?._id || list[0]?._id || '')));
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    // Style follows the existing caption group of the chosen clip until the
    // user edits it; picking another clip resets to that clip's group style.
    const existingGroup = captionGroups.get(sourceClipId);
    const style = styleOverride ?? mergeTextStyle(existingGroup?.style);
    const updateStyle = (patch: Partial<TextClipStyle>) => {
        setStyleOverride(mergeTextStyle({ ...style, ...patch }));
    };

    const sourceClip = useMemo(
        () => clips.find((clip) => clip.id === sourceClipId) ?? null,
        [clips, sourceClipId],
    );

    const generate = async () => {
        if (!sourceClip?.sourceUrl || generating) return;
        setGenerating(true);
        setError(null);
        setDetectedNote(null);
        try {
            const response = await runVideoEditorTranscribe(projectId, {
                mediaUrl: sourceClip.sourceUrl,
                ...(modelId ? { modelId } : {}),
                ...(language !== 'auto' ? { language } : {}),
            });
            const rows = (response.segments || []).map((segment: CaptionSegment) => ({
                start: Math.max(0, Number(segment.start) || 0),
                end: Math.max(0, Number(segment.end) || 0),
                text: String(segment.text || '').trim(),
            })).filter((segment) => segment.text && segment.end > segment.start);
            if (!rows.length) {
                setError(t('caption_empty_result'));
                setSegments(null);
                setRawSegments(null);
                return;
            }
            setRawSegments(rows);
            setSegments(regroupCaptionsByWordCount(rows, wordsPerCaption));
            setExpandedRow(null);
            if (response.modelName) {
                setDetectedNote(t('caption_model_used', { model: response.modelName }));
            }
        } catch (err) {
            setError(getApiErrorMessage(err, t('caption_generate_failed')));
        } finally {
            setGenerating(false);
        }
    };

    const updateSegment = (index: number, patch: Partial<CaptionSegmentDraft>) => {
        setSegments((current) => (current || []).map((segment, i) => (
            i === index ? { ...segment, ...patch } : segment
        )));
    };

    /** Re-cut the transcript into chunks of `maxWords` words (CapCut-style). */
    const changeWordsPerCaption = (maxWords: number) => {
        setWordsPerCaption(maxWords);
        setExpandedRow(null);
        if (rawSegments) {
            setSegments(regroupCaptionsByWordCount(rawSegments, maxWords));
        }
    };

    const totalText = useMemo(() => (
        (segments || []).reduce((max, segment) => Math.max(max, segment.end), 0)
    ), [segments]);

    const body = (
                <div className={styles.body}>
                    <div className={styles.sourceRow}>
                        <label className={styles.field}>
                            <span>{t('caption_source_clip')}</span>
                            <select
                                value={sourceClipId}
                                onChange={(event) => {
                                    setSourceClipId(event.target.value);
                                    setStyleOverride(null);
                                }}
                            >
                                {!clips.length && <option value="">{t('caption_no_video')}</option>}
                                {clips.map((clip) => (
                                    <option key={clip.id} value={clip.id}>
                                        {clip.title} ({formatTime(clip.startTime)}–{formatTime(clip.startTime + clip.duration)})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.field}>
                            <span>{t('caption_model')}</span>
                            <select
                                value={modelId}
                                onChange={(event) => setModelId(event.target.value)}
                            >
                                {!models.length && <option value="">{t('chat_no_model')}</option>}
                                {models.map((model) => (
                                    <option key={model._id} value={model._id}>
                                        {model.displayName || model.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.field}>
                            <span>{t('caption_language')}</span>
                            <select
                                value={language}
                                onChange={(event) => setLanguage(event.target.value as (typeof LANGUAGE_VALUES)[number])}
                            >
                                {LANGUAGE_VALUES.map((value) => (
                                    <option key={value} value={value}>{t(`caption_lang_${value}`)}</option>
                                ))}
                            </select>
                        </label>

                        <label className={`${styles.field} ${styles.wordsField}`} title={t('words_per_caption_hint')}>
                            <span>{t('words_per_caption')}</span>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                step={1}
                                value={wordsPerCaption >= CAPTION_WORDS_UNLIMITED ? '' : wordsPerCaption}
                                placeholder="∞"
                                onChange={(event) => {
                                    const parsed = Number(event.target.value);
                                    if (event.target.value === '') {
                                        changeWordsPerCaption(CAPTION_WORDS_UNLIMITED);
                                    } else if (Number.isFinite(parsed) && parsed >= 1) {
                                        changeWordsPerCaption(Math.min(20, Math.round(parsed)));
                                    }
                                }}
                            />
                        </label>

                        <button
                            type="button"
                            className={styles.generateBtn}
                            disabled={!sourceClip || generating}
                            onClick={() => { void generate(); }}
                        >
                            {generating ? <LuLoaderCircle className={styles.spin} /> : <LuSparkles />}
                            {generating ? t('caption_generating') : t('caption_generate')}
                        </button>
                    </div>

                    {existingGroup && (
                        <label className={styles.replaceRow}>
                            <input
                                type="checkbox"
                                checked={replaceExisting}
                                onChange={(event) => setReplaceExisting(event.target.checked)}
                            />
                            <span>{t('caption_replace_existing', { count: existingGroup.count })}</span>
                        </label>
                    )}

                    {error && <p className={styles.errorLine}>{error}</p>}
                    {detectedNote && <p className={styles.noteLine}>{detectedNote}</p>}

                    {!segments && !generating && (
                        <div className={styles.hintBox}>
                            <p>{t('caption_intro')}</p>
                        </div>
                    )}

                    {generating && (
                        <div className={styles.hintBox}>
                            <p><LuLoaderCircle className={styles.spin} /> {t('caption_wait')}</p>
                        </div>
                    )}

                    {segments && (
                        <>
                            <div className={styles.styleRow}>
                                <label className={styles.field}>
                                    <span>{t('font')}</span>
                                    <select
                                        value={style.fontFamily}
                                        onChange={(event) => updateStyle({ fontFamily: event.target.value })}
                                    >
                                        <option value="'Vazirmatn', 'Segoe UI', Tahoma, sans-serif">Vazirmatn / System</option>
                                        <option value="Tahoma, sans-serif">Tahoma</option>
                                        <option value="Arial, Helvetica, sans-serif">Arial</option>
                                        <option value="Georgia, serif">Georgia</option>
                                        <option value="'Courier New', Courier, monospace">Courier New</option>
                                        <option value="Impact, sans-serif">Impact</option>
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    <span>{t('font_size')}</span>
                                    <input
                                        type="number"
                                        min={16}
                                        max={140}
                                        value={style.fontSize}
                                        onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })}
                                    />
                                </label>
                                <label className={`${styles.field} ${styles.colorField}`}>
                                    <span>{t('text_color')}</span>
                                    <input
                                        type="color"
                                        value={style.color || '#ffffff'}
                                        onChange={(event) => updateStyle({ color: event.target.value })}
                                    />
                                </label>
                                <label className={`${styles.field} ${styles.colorField}`}>
                                    <span>{t('stroke')}</span>
                                    <input
                                        type="color"
                                        value={style.strokeColor || '#000000'}
                                        onChange={(event) => updateStyle({ strokeColor: event.target.value })}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>{t('motion')}</span>
                                    <select
                                        value={style.motion}
                                        onChange={(event) => updateStyle({ motion: event.target.value as TextClipStyle['motion'] })}
                                    >
                                        <option value="none">{t('motion_none')}</option>
                                        <option value="fadeIn">{t('motion_fadeIn')}</option>
                                        <option value="slideUp">{t('motion_slideUp')}</option>
                                        <option value="pop">{t('motion_pop')}</option>
                                        <option value="typewriter">{t('motion_typewriter')}</option>
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    <span>{t('exit_motion')}</span>
                                    <select
                                        value={style.exitMotion ?? 'none'}
                                        onChange={(event) => updateStyle({ exitMotion: event.target.value as TextClipStyle['exitMotion'] })}
                                    >
                                        <option value="none">{t('exit_none')}</option>
                                        <option value="fadeOut">{t('exit_fadeOut')}</option>
                                        <option value="slideOutDown">{t('exit_slideOutDown')}</option>
                                        <option value="slideOutUp">{t('exit_slideOutUp')}</option>
                                        <option value="shrinkOut">{t('exit_shrinkOut')}</option>
                                    </select>
                                </label>
                            </div>

                            <div className={styles.segmentList}>
                                <div className={`${styles.segmentRow} ${styles.listHead}`}>
                                    <span className={styles.timeCell}>{t('caption_start')}</span>
                                    <span className={styles.timeCell}>{t('caption_end')}</span>
                                    <span className={styles.textCell}>{t('text_content')}</span>
                                    <span className={styles.rowActions} />
                                </div>
                                {segments.map((segment, index) => (
                                    <React.Fragment key={`${index}-${segment.start}`}>
                                        <div
                                            className={`${styles.segmentRow} ${expandedRow === index ? styles.segmentRowOpen : ''}`}
                                        >
                                            <input
                                                className={styles.timeCell}
                                                type="number"
                                                step={0.1}
                                                min={0}
                                                value={Number(segment.start.toFixed(2))}
                                                onChange={(event) => updateSegment(index, { start: Number(event.target.value) })}
                                            />
                                            <input
                                                className={styles.timeCell}
                                                type="number"
                                                step={0.1}
                                                min={0}
                                                value={Number(segment.end.toFixed(2))}
                                                onChange={(event) => updateSegment(index, { end: Number(event.target.value) })}
                                            />
                                            <textarea
                                                className={styles.textCell}
                                                rows={1}
                                                value={segment.text}
                                                onChange={(event) => updateSegment(index, { text: event.target.value })}
                                            />
                                            <span className={styles.rowActions}>
                                                {segment.style && Object.keys(segment.style).length > 0 && (
                                                    <span className={styles.overrideBadge} title={t('caption_row_styled')}>
                                                        <LuSparkles />
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    title={t('caption_row_style')}
                                                    aria-label={t('caption_row_style')}
                                                    onClick={() => setExpandedRow((current) => (current === index ? null : index))}
                                                >
                                                    {expandedRow === index ? <LuChevronUp /> : <LuChevronDown />}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.deleteRowBtn}
                                                    title={t('caption_delete_row')}
                                                    aria-label={t('caption_delete_row')}
                                                    onClick={() => {
                                                        setSegments((current) => (current || []).filter((_, i) => i !== index));
                                                        setExpandedRow((current) => (current === index ? null : current));
                                                    }}
                                                >
                                                    <LuTrash2 />
                                                </button>
                                            </span>
                                        </div>
                                        {expandedRow === index && (
                                            <div className={styles.rowStyleEditor}>
                                                <p className={styles.rowStyleHint}>
                                                    {t('caption_row_style_hint')}
                                                    <button
                                                        type="button"
                                                        className={styles.resetRowStyleBtn}
                                                        disabled={!segment.style}
                                                        onClick={() => updateSegment(index, { style: undefined })}
                                                    >
                                                        {t('color_none')}
                                                    </button>
                                                </p>
                                                <TextStyleControls
                                                    hideText
                                                    text=""
                                                    style={mergeTextStyle({ ...style, ...(segment.style ?? {}) })}
                                                    onChangeText={() => undefined}
                                                    onChangeStyle={(patch) => updateSegment(index, {
                                                        style: { ...(segment.style ?? {}), ...patch },
                                                    })}
                                                />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                                <button
                                    type="button"
                                    className={styles.addRowBtn}
                                    onClick={() => setSegments((current) => [
                                        ...(current || []),
                                        { start: totalText, end: totalText + 2, text: '' },
                                    ])}
                                >
                                    <LuPlus /> {t('caption_add_row')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
    );

    const footer = (
                <footer className={styles.footer}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose}>
                        {t('caption_cancel')}
                    </button>
                    <button
                        type="button"
                        className={styles.applyBtn}
                        disabled={!segments || !segments.length || !sourceClipId}
                        onClick={() => {
                            if (!segments?.length) return;
                            onApply({
                                sourceClipId,
                                segments: segments.filter((segment) => segment.text.trim()),
                                style,
                                replaceExisting,
                            });
                        }}
                    >
                        <LuCheck /> {t('caption_apply')}
                    </button>
                </footer>
    );

    if (screenDir) {
        return (
            <MobileEditorScreen title={t('caption_studio')} icon={<LuSparkles />} dir={screenDir} onClose={onClose} flush>
                <div className={`${styles.modal} ${styles.screenModal}`}>
                    {body}
                    {footer}
                </div>
            </MobileEditorScreen>
        );
    }

    return (
        <ModalHelper
            open
            onClose={onClose}
            size="lg"
            hideCloseBtn
            closeOnOverlayClick={false}
            sheetTitle={t('caption_studio')}
            component={(
                <div className={styles.modal}>
                    <header className={styles.header}>
                        <span className={styles.title}><LuSparkles /> {t('caption_studio')}</span>
                        <ModalCloseButton placement="inline" size="sm" onClick={onClose} aria-label={t('caption_close')} />
                    </header>
                    {body}
                    {footer}
                </div>
            )}
        />
    );
}
