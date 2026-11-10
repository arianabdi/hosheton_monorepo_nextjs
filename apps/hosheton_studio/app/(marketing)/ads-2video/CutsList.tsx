'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LuAudioLines } from 'react-icons/lu';
import type { AdsPlaybackState, AdsPlayerCut } from './AdsPreviewPlayer';
import styles from './CutsList.module.scss';

interface CutsListProps {
    cuts: AdsPlayerCut[];
    activeCutId: string;
    playback: AdsPlaybackState;
    /** ref پس‌زمینه‌ی پیشرفت هر ردیف — صفحه هر فریم پخش --cut-progress را مستقیم رویش می‌نویسد */
    bindFill(cutId: string): (el: HTMLElement | null) => void;
    onSelect(cutId: string): void;
    onTogglePlay(cutId: string): void;
}

function PlayGlyph({ playing }: { playing: boolean }) {
    return playing ? (
        <svg viewBox="0 0 12 12" aria-hidden>
            <rect x="2.5" y="2" width="2.4" height="8" rx="1" />
            <rect x="7.1" y="2" width="2.4" height="8" rx="1" />
        </svg>
    ) : (
        <svg viewBox="0 0 12 12" aria-hidden>
            <path d="M3.5 2.4v7.2a.9.9 0 0 0 1.37.77l5.6-3.6a.9.9 0 0 0 0-1.54l-5.6-3.6A.9.9 0 0 0 3.5 2.4Z" />
        </svg>
    );
}

/**
 * لیست عمودی کات‌ها زیر پیش‌نمایش — هر کات یک ردیف یک‌خطی و فشرده: دکمه‌ی پخش
 * و عنوان کنار هم در شروع ردیف، اطلاعات کات (شماره، مدت، نسخه) در سمت مقابل؛
 * حین پخش، پس‌زمینه‌ی ردیفِ کات فعال به نسبت پیشرفت همان کات پر می‌شود.
 */
export default function CutsList({
    cuts,
    activeCutId,
    playback,
    bindFill,
    onSelect,
    onTogglePlay,
}: CutsListProps) {
    const { t } = useTranslation('adsVideo');
    const listRef = useRef<HTMLDivElement>(null);

    // کات فعال (انتخاب یا پخش پشت‌سرهم) همیشه داخل دید لیست بماند
    useEffect(() => {
        const list = listRef.current;
        const row = list?.querySelector<HTMLElement>('[data-active="true"]');
        if (!list || !row) return;
        const top = row.offsetTop;
        const bottom = top + row.offsetHeight;
        if (top < list.scrollTop) list.scrollTo({ top: top - 2, behavior: 'smooth' });
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTo({ top: bottom - list.clientHeight + 2, behavior: 'smooth' });
    }, [activeCutId]);

    return (
        <div ref={listRef} className={styles.list}>
            {cuts.map((cut, index) => {
                const active = cut._id === activeCutId;
                const playable = Boolean(cut.html);
                const playing = playback.playing && playback.cutId === cut._id;
                const hasSound = Boolean(cut.voiceover?.audioUrl) || Boolean(cut.soundEffects?.some((item) => item.audioUrl));
                return (
                    <div
                        key={cut._id}
                        className={`${styles.row} ${active ? styles.active : ''}`}
                        data-active={active ? 'true' : undefined}
                        onClick={() => onSelect(cut._id)}
                    >
                        <span className={styles.fill} ref={bindFill(cut._id)} aria-hidden />
                        <button
                            type="button"
                            className={`${styles.play} ${playing ? styles.playActive : ''}`}
                            disabled={!playable}
                            aria-label={playing ? t('player_pause') : t('cut_play', { defaultValue: 'پخش این کات' })}
                            title={playing ? t('player_pause') : t('cut_play', { defaultValue: 'پخش این کات' })}
                            onClick={(event) => {
                                // پخش، فقط همین کات را تا پایانش پخش می‌کند — انتخاب جداگانه انجام نمی‌شود
                                event.stopPropagation();
                                onTogglePlay(cut._id);
                            }}
                        >
                            <PlayGlyph playing={playing} />
                        </button>
                        <button type="button" className={styles.rowMain} aria-pressed={active} title={cut.title}>
                            <span className={styles.title} dir="auto">{cut.title}</span>
                            <span className={styles.meta}>
                                {hasSound ? <LuAudioLines size={11} aria-label={t('cut_has_sound', { defaultValue: 'صدادار' })} /> : null}
                                <span dir="ltr">{cut.durationSeconds}s</span>
                                {cut.currentVersion > 0 ? (
                                    <>
                                        <i aria-hidden>·</i>
                                        <span dir="ltr">v{cut.currentVersion}</span>
                                    </>
                                ) : null}
                                <i aria-hidden>·</i>
                                <span className={styles.index} dir="ltr">{index + 1}</span>
                            </span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
