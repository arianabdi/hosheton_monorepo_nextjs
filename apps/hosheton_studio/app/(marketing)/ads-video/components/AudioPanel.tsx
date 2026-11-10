'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuAudioLines,
    LuLoaderCircle,
    LuMusic4,
    LuPause,
    LuPlay,
    LuPlus,
    LuRefreshCw,
    LuTrash2,
    LuWandSparkles,
} from 'react-icons/lu';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { adsVideoApi, type AdsCutFull, type AdsCutSfx, type AdsVoiceItem } from '../lib/ads-video-api';
import { formatClock } from '../lib/cut-runtime';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import styles from '../AdsVideo.module.scss';

export interface AudioPanelProps {
    cut: AdsCutFull | null;
    /** مدل متنیِ انتخابی در چت — برای نوشتن خودکار نریشن */
    textModelId?: string;
    /** زمان فعلی پلیر (ثانیه) — برای هایلایت ترک فعال */
    playerTime: number;
    /** پرش پلیر به یک لحظه (کلیک روی تایم‌لاین / پخش کات با صدا) */
    onSeekPlayer(time: number): void;
    onRefreshCut(cut: AdsCutFull): void;
    onError(message: string): void;
}

type SelectedTrack = { kind: 'voice' } | { kind: 'sfx'; sfxId: string } | null;

/**
 * تب «صدا» — تایم‌لاین صداهای درون کات، سینک با پلیر: هر لحظه که کات جلو می‌رود
 * ترکِ فعال پررنگ و بقیه کم‌رنگ می‌شوند؛ روی تایم‌لاین کلیک که کنی پلیر به همان
 * لحظه می‌پرد. ترک فعال را می‌شود همان‌جا بلندتر/کوتاه‌تر یا با AI جایگزین کرد.
 */
export function AudioPanel({ cut, textModelId, playerTime, onSeekPlayer, onRefreshCut, onError }: AudioPanelProps) {
    const { t } = useTranslation('adsVideo');
    const [audioModels, setAudioModels] = useState<ProviderModelItem[]>([]);
    const [audioModelId, setAudioModelId] = useState('');
    const [voices, setVoices] = useState<AdsVoiceItem[]>([]);
    const [voiceId, setVoiceId] = useState('');
    const [narrationText, setNarrationText] = useState(cut?.voiceover?.text || '');

    const [selected, setSelected] = useState<SelectedTrack>(null);
    const [draft, setDraft] = useState<{ startAt: number; volume: number }>({ startAt: 0, volume: 0.8 });
    const [busy, setBusy] = useState<'voice' | 'voiceAuto' | 'sfx' | 'track' | 'replace' | null>(null);
    const [sfxPrompt, setSfxPrompt] = useState('');
    const [sfxDuration, setSfxDuration] = useState(2);
    const [replacePrompt, setReplacePrompt] = useState('');
    const soloRef = useRef<HTMLAudioElement | null>(null);
    const [soloKey, setSoloKey] = useState<string | null>(null);
    const [draftForId, setDraftForId] = useState<string | null>(null);

    const duration = Math.max(0.5, cut?.durationSeconds || 5);
    const time = Math.min(Math.max(0, playerTime), duration);

    // ── مدل‌های صوتی و صداها ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await providersApi.listModels({ class: 'audio' });
                if (cancelled) return;
                setAudioModels(res.models || []);
                if (res.models?.length) setAudioModelId((prev) => prev || res.models[0]._id);
            } catch {
                if (!cancelled) setAudioModels([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!audioModelId) return;
        let cancelled = false;
        adsVideoApi.listVoices(audioModelId)
            .then((res) => {
                if (cancelled) return;
                setVoices(res.voices || []);
                setVoiceId((prev) => (res.voices?.some((v) => v.voiceId === prev) ? prev : res.voices?.[0]?.voiceId || ''));
            })
            .catch(() => {
                if (!cancelled) setVoices([]);
            });
        return () => {
            cancelled = true;
        };
    }, [audioModelId]);

    // همگام‌سازی متن نریشن با کات — با الگوی تنظیم state حین render
    const [syncedNarration, setSyncedNarration] = useState(cut?.voiceover?.text || '');
    const latestNarration = cut?.voiceover?.text || '';
    if (latestNarration !== syncedNarration) {
        setSyncedNarration(latestNarration);
        setNarrationText(latestNarration);
    }

    const sfxList = useMemo(() => cut?.soundEffects || [], [cut]);
    const voiceDuration = cut?.voiceover?.durationSeconds || duration;

    /** ترک صدای فعال در لحظه‌ی فعلی پلیر */
    const activeSfxId = useMemo(() => {
        const active = sfxList.find((sfx) => {
            const startAt = Number(sfx.startAt) || 0;
            const len = Number(sfx.durationSeconds) || 2;
            return time >= startAt && time < startAt + len;
        });
        return active?.sfxId || null;
    }, [sfxList, time]);

    const voiceActive = Boolean(cut?.voiceover?.audioUrl) && time < voiceDuration;

    const selectSfx = (sfx: AdsCutSfx) => {
        setSelected({ kind: 'sfx', sfxId: sfx.sfxId });
        setDraft({ startAt: Number(sfx.startAt) || 0, volume: Number(sfx.volume) || 0.8 });
    };

    const commitTrack = async (sfxId: string, patch: { startAt?: number; volume?: number }) => {
        if (!cut) return;
        setBusy('track');
        try {
            const res = await adsVideoApi.updateSfx(cut._id, sfxId, patch);
            onRefreshCut(res.cut);
        } catch (error) {
            onError(getApiErrorMessage(error, t('audio_err_update')));
        } finally {
            setBusy(null);
        }
    };

    const deleteTrack = async (sfxId: string) => {
        if (!cut) return;
        try {
            const res = await adsVideoApi.deleteSfx(cut._id, sfxId);
            setSelected(null);
            onRefreshCut(res.cut);
        } catch (error) {
            onError(getApiErrorMessage(error, t('audio_err_update')));
        }
    };

    /** جایگزینی سریع ترک فعال: افکت تازه در همان نقطه + حذف قبلی */
    const replaceTrack = async (sfx: AdsCutSfx) => {
        if (!cut || !replacePrompt.trim()) return;
        setBusy('replace');
        try {
            const gen = await adsVideoApi.generateSfx(cut._id, {
                prompt: replacePrompt.trim(),
                modelId: audioModelId || undefined,
                durationSeconds: sfx.durationSeconds || sfxDuration,
                volume: Number(sfx.volume) || 0.8,
                startAt: Number(sfx.startAt) || 0,
            });
            try {
                await adsVideoApi.deleteSfx(cut._id, sfx.sfxId);
            } catch {
                /* حذف قبلی ناموفق — جایگزین اضافه شده می‌ماند */
            }
            onRefreshCut(gen.cut);
            setReplacePrompt('');
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_sfx')));
        } finally {
            setBusy(null);
        }
    };

    const generateSfx = async () => {
        if (!cut || !sfxPrompt.trim()) return;
        setBusy('sfx');
        try {
            const res = await adsVideoApi.generateSfx(cut._id, {
                prompt: sfxPrompt.trim(),
                modelId: audioModelId || undefined,
                durationSeconds: sfxDuration,
                volume: 0.8,
                startAt: Math.min(time, Math.max(0, duration - 0.5)),
            });
            onRefreshCut(res.cut);
            setSfxPrompt('');
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_sfx')));
        } finally {
            setBusy(null);
        }
    };

    const generateVoiceover = async (autoWrite: boolean) => {
        if (!cut) return;
        if (!autoWrite && !narrationText.trim()) return;
        setBusy(autoWrite ? 'voiceAuto' : 'voice');
        try {
            const res = await adsVideoApi.generateVoiceover(cut._id, {
                text: autoWrite ? undefined : narrationText.trim(),
                autoWrite,
                modelId: audioModelId || undefined,
                textModelId: textModelId || undefined,
                voiceId: voiceId || undefined,
            });
            onRefreshCut(res.cut);
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_voice')));
        } finally {
            setBusy(null);
        }
    };

    const deleteVoiceover = async () => {
        if (!cut?.voiceover) return;
        try {
            const res = await adsVideoApi.deleteVoiceover(cut._id);
            onRefreshCut(res.cut);
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_voice_delete')));
        }
    };

    /** پخش تکی یک ترک */
    const playSolo = (url: string, key: string) => {
        soloRef.current?.pause();
        const audio = new Audio(url);
        audio.volume = 0.9;
        soloRef.current = audio;
        setSoloKey(key);
        audio.onended = () => { soloRef.current = null; setSoloKey(null); };
        void audio.play().catch(() => setSoloKey(null));
    };

    if (!cut) {
        return <div className={styles.panelEmpty}>{t('audio_select_first')}</div>;
    }

    // انتخاب مؤثر — ترک فعالِ لحظه پیش‌فرض است مگر کاربر ترک دیگری را کلیک کرده باشد
    const effectiveSelected: SelectedTrack = selected ?? (activeSfxId ? { kind: 'sfx', sfxId: activeSfxId } : (voiceActive ? { kind: 'voice' } : null));
    const selectedSfx = effectiveSelected?.kind === 'sfx' ? sfxList.find((item) => item.sfxId === effectiveSelected.sfxId) : null;
    const voiceSelected = effectiveSelected?.kind === 'voice';
    const playheadFrac = Math.min(1, time / duration);

    // draft همگام با ترک انتخاب‌شده — با الگوی تنظیم state حین render
    if (selectedSfx && draftForId !== selectedSfx.sfxId) {
        setDraftForId(selectedSfx.sfxId);
        setDraft({ startAt: Number(selectedSfx.startAt) || 0, volume: Number(selectedSfx.volume) || 0.8 });
    }
    if (!selectedSfx && draftForId !== null) {
        setDraftForId(null);
    }

    const rulerTicks: number[] = [];
    const step = duration <= 10 ? 1 : duration <= 20 ? 2 : 5;
    for (let s = 0; s <= duration; s += step) rulerTicks.push(s);

    const blockClass = (active: boolean, dimmed: boolean) => [
        styles.audioBlock,
        active ? styles.audioBlockVoice : '',
        voiceSelected ? styles.audioBlockSelected : '',
        dimmed ? styles.audioBlockDimmed : '',
    ].join(' ');

    return (
        <div className={styles.audioPanel}>
            <div className={styles.audioHead}>
                <strong>{t('audio_title')}</strong>
                <span>{t('audio_stats', { tracks: (cut.voiceover?.audioUrl ? 1 : 0) + sfxList.length, duration: formatClock(duration) })}</span>
                <button
                    type="button"
                    className={styles.playerBtn}
                    title={t('audio_play_cut')}
                    aria-label={t('audio_play_cut')}
                    onClick={() => onSeekPlayer(0)}
                >
                    <LuPlay size={12} />
                </button>
            </div>

            {/* تایم‌لاین میکس — سینک با پلیر */}
            <div className={styles.audioTimeline}>
                <div className={styles.audioRuler}>
                    {rulerTicks.map((s) => (
                        <span key={s} style={{ left: `${(s / duration) * 100}%` }}>{s}</span>
                    ))}
                </div>

                <div className={styles.audioRow}>
                    <span className={styles.audioRowLabel}>{t('audio_track_voice')}</span>
                    <div
                        className={styles.audioRowTrack}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const frac = (e.clientX - rect.left) / rect.width;
                            onSeekPlayer(frac * duration);
                        }}
                        role="presentation"
                    >
                        {cut.voiceover?.audioUrl ? (
                            <button
                                type="button"
                                className={blockClass(true, !voiceActive)}
                                style={{ left: '0%', width: `${Math.min(100, (voiceDuration / duration) * 100)}%` }}
                                title={cut.voiceover.text || t('audio_track_voice')}
                                onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'voice' }); setDraftForId(null); }}
                            >
                                <span>{cut.voiceover.text || t('audio_track_voice')}</span>
                            </button>
                        ) : (
                            <span className={styles.audioEmptyHint}>{t('audio_voice_empty')}</span>
                        )}
                    </div>
                </div>

                {sfxList.map((sfx) => {
                    const startAt = Number(sfx.startAt) || 0;
                    const len = Number(sfx.durationSeconds) || 2;
                    const width = Math.max(6, Math.min(100 - (startAt / duration) * 100, (len / duration) * 100));
                    const active = activeSfxId === sfx.sfxId;
                    return (
                        <div key={sfx.sfxId} className={styles.audioRow}>
                            <span className={`${styles.audioRowLabel} ${active ? styles.audioRowLabelActive : ''}`}>
                                {active ? t('audio_now_playing') : t('audio_track_sfx')}
                            </span>
                            <div
                                className={styles.audioRowTrack}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const frac = (e.clientX - rect.left) / rect.width;
                                    onSeekPlayer(frac * duration);
                                }}
                                role="presentation"
                            >
                                <button
                                    type="button"
                                    className={[
                                        styles.audioBlock,
                                        active ? styles.audioBlockActive : '',
                                        selected?.kind === 'sfx' && selected.sfxId === sfx.sfxId ? styles.audioBlockSelected : '',
                                        !active ? styles.audioBlockDimmed : '',
                                    ].join(' ')}
                                    style={{ left: `${(startAt / duration) * 100}%`, width: `${width}%` }}
                                    title={sfx.prompt}
                                    onClick={(e) => { e.stopPropagation(); selectSfx(sfx); }}
                                >
                                    <span>{sfx.prompt}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}

                <div className={styles.audioPlayhead} style={{ left: `calc(82px + (100% - 82px) * ${playheadFrac})` }} aria-hidden />
                {sfxList.length === 0 && !cut.voiceover?.audioUrl && (
                    <div className={styles.audioEmptyHint}>{t('audio_no_tracks')}</div>
                )}
            </div>

            {/* ویرایشگر نریشن */}
            {selected?.kind === 'voice' && cut.voiceover && (
                <div className={styles.audioEditor}>
                    <h5><LuAudioLines size={12} />{t('audio_track_voice')}</h5>
                    {cut.voiceover.audioUrl && (
                        <div className={styles.audioEditorActions}>
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={() => playSolo(cut.voiceover!.audioUrl!, 'voice')}
                            >
                                {soloKey === 'voice' ? <LuPause size={12} /> : <LuPlay size={12} />}
                                {t('audio_play_solo')}
                            </button>
                            <button type="button" className={styles.dangerGhostBtn} onClick={() => void deleteVoiceover()}>
                                <LuTrash2 size={12} />
                                {t('delete')}
                            </button>
                        </div>
                    )}
                    <p>{cut.voiceover.text || '—'}</p>
                </div>
            )}

            {/* ویرایشگر افکت انتخابی — با جایگزینی سریع */}
            {selectedSfx && (
                <div className={styles.audioEditor}>
                    <h5><LuMusic4 size={12} />{t('audio_editor_sfx')}</h5>
                    <p>{selectedSfx.prompt}</p>
                    <div className={styles.audioSliderRow}>
                        <label>{t('audio_start')}</label>
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={draft.startAt}
                            onChange={(e) => setDraft((prev) => ({ ...prev, startAt: Number(e.target.value) }))}
                            onPointerUp={() => void commitTrack(selectedSfx.sfxId, { startAt: draft.startAt })}
                            onKeyUp={() => void commitTrack(selectedSfx.sfxId, { startAt: draft.startAt })}
                        />
                        <output>{draft.startAt.toFixed(1)}s</output>
                    </div>
                    <div className={styles.audioSliderRow}>
                        <label>{t('audio_volume')}</label>
                        <button type="button" className={styles.playerBtn} onClick={() => {
                            const next = Math.max(0, draft.volume - 0.1);
                            setDraft((prev) => ({ ...prev, volume: next }));
                            void commitTrack(selectedSfx.sfxId, { volume: next });
                        }}>−</button>
                        <input
                            type="range"
                            min={0}
                            max={1.5}
                            step={0.05}
                            value={draft.volume}
                            onChange={(e) => setDraft((prev) => ({ ...prev, volume: Number(e.target.value) }))}
                            onPointerUp={() => void commitTrack(selectedSfx.sfxId, { volume: draft.volume })}
                            onKeyUp={() => void commitTrack(selectedSfx.sfxId, { volume: draft.volume })}
                        />
                        <button type="button" className={styles.playerBtn} onClick={() => {
                            const next = Math.min(1.5, draft.volume + 0.1);
                            setDraft((prev) => ({ ...prev, volume: next }));
                            void commitTrack(selectedSfx.sfxId, { volume: next });
                        }}>+</button>
                        <output>{draft.volume.toFixed(2)}</output>
                    </div>
                    <div className={styles.audioEditorActions}>
                        {selectedSfx.audioUrl && (
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={() => playSolo(selectedSfx.audioUrl!, selectedSfx.sfxId)}
                            >
                                <LuPlay size={12} />
                                {t('audio_play_solo')}
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.dangerGhostBtn}
                            disabled={busy === 'track'}
                            onClick={() => void deleteTrack(selectedSfx.sfxId)}
                        >
                            <LuTrash2 size={12} />
                            {t('delete')}
                        </button>
                    </div>
                    {/* جایگزینی سریع همان نقطه با صدای تازه */}
                    <div className={styles.audioReplaceRow}>
                        <input
                            value={replacePrompt}
                            onChange={(e) => setReplacePrompt(e.target.value)}
                            placeholder={t('audio_replace_placeholder')}
                        />
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            disabled={busy !== null || !replacePrompt.trim()}
                            title={t('audio_replace_btn')}
                            onClick={() => void replaceTrack(selectedSfx)}
                        >
                            {busy === 'replace' ? <LuLoaderCircle size={12} className={styles.spin} /> : <LuRefreshCw size={12} />}
                            {t('audio_replace_btn')}
                        </button>
                    </div>
                </div>
            )}

            {/* ساخت افکت جدید با AI — در زمان فعلی پلیر می‌نشیند */}
            <div className={styles.audioAddForm}>
                <div className={styles.audioAddRow}>
                    <label>
                        {t('audio_new_sfx_prompt')}
                        <input
                            value={sfxPrompt}
                            onChange={(e) => setSfxPrompt(e.target.value)}
                            placeholder={t('audio_new_sfx_placeholder')}
                        />
                    </label>
                    <label>
                        {t('audio_new_sfx_duration')}
                        <input
                            type="number"
                            min={1}
                            max={22}
                            value={sfxDuration}
                            onChange={(e) => setSfxDuration(Number(e.target.value) || 2)}
                        />
                    </label>
                </div>
                <div className={styles.audioAddRow}>
                    <label>
                        {t('audio_model_label')}
                        <select value={audioModelId} onChange={(e) => setAudioModelId(e.target.value)}>
                            {audioModels.length === 0 && <option value="">{t('no_audio_models')}</option>}
                            {audioModels.map((model) => (
                                <option key={model._id} value={model._id}>{model.displayName || model.name}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={busy !== null || !sfxPrompt.trim()}
                        title={t('audio_add_at_hint', { time: time.toFixed(1) })}
                        onClick={() => void generateSfx()}
                    >
                        {busy === 'sfx' ? <LuLoaderCircle size={12} className={styles.spin} /> : <LuPlus size={12} />}
                        {t('audio_generate_sfx')}
                    </button>
                </div>
            </div>

            {/* نریشن */}
            <div className={styles.audioEditor}>
                <h5><LuAudioLines size={12} />{t('voice_title')}</h5>
                <textarea
                    value={narrationText}
                    onChange={(e) => setNarrationText(e.target.value)}
                    rows={2}
                    placeholder={t('voice_text_placeholder')}
                />
                <div className={styles.audioAddRow}>
                    <label>
                        {t('voice_select')}
                        <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                            {voices.length === 0 && <option value="">{t('voice_select')}</option>}
                            {voices.map((voice) => (
                                <option key={voice.voiceId} value={voice.voiceId}>{voice.name}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={styles.ghostBtn}
                        disabled={busy !== null}
                        title={t('voice_write_ai')}
                        onClick={() => void generateVoiceover(true)}
                    >
                        {busy === 'voiceAuto' ? <LuLoaderCircle size={12} className={styles.spin} /> : <LuWandSparkles size={12} />}
                        {t('voice_write_ai')}
                    </button>
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={busy !== null || !narrationText.trim()}
                        onClick={() => void generateVoiceover(false)}
                    >
                        {busy === 'voice' ? <LuLoaderCircle size={12} className={styles.spin} /> : null}
                        {t('voice_generate')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AudioPanel;
