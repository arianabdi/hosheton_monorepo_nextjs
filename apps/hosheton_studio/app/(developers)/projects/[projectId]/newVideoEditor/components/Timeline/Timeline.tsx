'use client';

import React, { useState, useRef } from 'react';
import { Track, Clip } from '../../types/timeline';
import { calculateSnap } from '../../utils/snapping';
import { AudioWaveform } from './AudioWaveform';
import styles from './Timeline.module.scss';

const INITIAL_TRACKS: Track[] = [
    {
        id: 't-1',
        title: 'Text Overlay',
        type: 'text',
        muted: false,
        locked: false,
        hidden: false,
        clips: [{ id: 'c-1', trackId: 't-1', title: 'Subtitle 1', startTime: 2, duration: 4, type: 'text', color: '#06b6d4' }],
    },
    {
        id: 't-2',
        title: 'Video Track 1',
        type: 'video',
        muted: false,
        locked: false,
        hidden: false,
        clips: [
            { id: 'c-2', trackId: 't-2', title: 'Runner_Start.mp4', startTime: 0, duration: 5, type: 'video', color: '#8b5cf6' },
            { id: 'c-3', trackId: 't-2', title: 'Runner_Action.mp4', startTime: 5.5, duration: 6, type: 'video', color: '#8b5cf6' },
        ],
    },
    {
        id: 't-3',
        title: 'Audio Track',
        type: 'audio',
        muted: false,
        locked: false,
        hidden: false,
        clips: [{ id: 'c-4', trackId: 't-3', title: 'Background_Music.mp3', startTime: 0, duration: 12, type: 'audio', color: '#059669' }],
    },
];

export default function Timeline() {
    const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [zoomLevel, setZoomLevel] = useState<number>(30);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeSnapLine, setActiveSnapLine] = useState<number | null>(null);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const draggingClip = useRef<{ clipId: string; trackId: string; startX: number; originalStart: number; duration: number } | null>(null);

    const totalDuration = 30;
    const timelineWidth = totalDuration * zoomLevel;

    // استخراج تمام نقاط حساس تایم‌لاین برای Snapping
    const getSnapPoints = (excludeClipId?: string): number[] => {
        const points: number[] = [currentTime, 0]; // Playhead و زمان صفر
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.id !== excludeClipId) {
                    points.push(clip.startTime);
                    points.push(clip.startTime + clip.duration);
                }
            });
        });
        return points;
    };

    // قابلیت برش کلیپ انتخاب‌شده در موقعیت Playhead (Split Clip)
    const handleSplitClip = () => {
        if (!selectedClipId) return;

        setTracks(prevTracks => prevTracks.map(track => {
            const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
            if (clipIndex === -1) return track;

            const clip = track.clips[clipIndex];
            // شرط قرار داشتن Playhead درون محدوده کلیپ
            if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) {
                return track;
            }

            const firstPartDuration = currentTime - clip.startTime;
            const secondPartDuration = clip.duration - firstPartDuration;

            const clipA: Clip = { ...clip, duration: firstPartDuration };
            const clipB: Clip = {
                ...clip,
                id: `c-${Date.now()}`,
                startTime: currentTime,
                duration: secondPartDuration,
                title: `${clip.title} (Part 2)`
            };

            const updatedClips = [...track.clips];
            updatedClips.splice(clipIndex, 1, clipA, clipB);

            return { ...track, clips: updatedClips };
        }));
    };

    // جابه‌جایی کلیپ با پپشتیبانی از Snapping
    const handleClipMouseDown = (e: React.MouseEvent, trackId: string, clip: Clip) => {
        e.stopPropagation();
        setSelectedClipId(clip.id);

        draggingClip.current = {
            clipId: clip.id,
            trackId,
            startX: e.clientX,
            originalStart: clip.startTime,
            duration: clip.duration
        };

        const snapPoints = getSnapPoints(clip.id);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!draggingClip.current) return;
            const deltaX = moveEvent.clientX - draggingClip.current.startX;
            const rawStart = Math.max(0, draggingClip.current.originalStart + deltaX / zoomLevel);

            // بررسی Snap برای لبه چپ کلیپ
            const snapLeft = calculateSnap(rawStart, snapPoints, zoomLevel);
            // بررسی Snap برای لبه راست کلیپ
            const snapRight = calculateSnap(rawStart + draggingClip.current.duration, snapPoints, zoomLevel);

            let finalStart = rawStart;
            if (snapLeft.isSnapped) {
                finalStart = snapLeft.snappedTime;
                setActiveSnapLine(snapLeft.snapPoint!);
            } else if (snapRight.isSnapped) {
                finalStart = snapRight.snappedTime - draggingClip.current.duration;
                setActiveSnapLine(snapRight.snapPoint!);
            } else {
                setActiveSnapLine(null);
            }

            setTracks(prev => prev.map(t => {
                if (t.id !== trackId) return t;
                return {
                    ...t,
                    clips: t.clips.map(c => c.id === clip.id ? { ...c, startTime: finalStart } : c)
                };
            }));
        };

        const handleMouseUp = () => {
            draggingClip.current = null;
            setActiveSnapLine(null);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className={styles.timelineContainer}>
            <div className={styles.toolbar}>
                <div className={styles.controls}>
                    <button onClick={handleSplitClip} className={styles.splitBtn} disabled={!selectedClipId}>
                        ✂️ Split Clip
                    </button>
                </div>
                <div className={styles.zoomControls}>
                    <button onClick={() => setZoomLevel(prev => Math.max(10, prev - 5))}>Zoom -</button>
                    <button onClick={() => setZoomLevel(prev => Math.min(100, prev + 5))}>Zoom +</button>
                </div>
            </div>

            <div className={styles.viewport}>
                <div className={styles.trackHeaders}>
                    <div className={styles.headerSpacer} />
                    {tracks.map(track => (
                        <div key={track.id} className={styles.trackHeaderItem}>
                            <span>{track.title}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.scrollArea} ref={scrollAreaRef}>
                    <div className={styles.tracksContent} style={{ width: `${timelineWidth}px` }}>

                        {/* Playhead */}
                        <div className={styles.playhead} style={{ left: `${currentTime * zoomLevel}px` }}>
                            <div className={styles.playheadHead} />
                        </div>

                        {/* خط راهنمای Snapping */}
                        {activeSnapLine !== null && (
                            <div className={styles.snapGuide} style={{ left: `${activeSnapLine * zoomLevel}px` }} />
                        )}

                        {/* Ruler */}
                        <div className={styles.ruler} onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setCurrentTime(Math.max(0, (e.clientX - rect.left) / zoomLevel));
                        }}>
                            {Array.from({ length: totalDuration + 1 }).map((_, i) => (
                                <div key={i} className={styles.timeMarker} style={{ left: `${i * zoomLevel}px` }}>
                                    {i}s
                                </div>
                            ))}
                        </div>

                        {/* لایه‌ها */}
                        {tracks.map(track => (
                            <div key={track.id} className={styles.trackRow}>
                                {track.clips.map(clip => {
                                    const clipWidth = clip.duration * zoomLevel;
                                    return (
                                        <div
                                            key={clip.id}
                                            className={`${styles.clip} ${selectedClipId === clip.id ? styles.selected : ''} ${clip.type === 'audio' ? styles.audioClip : ''}`}
                                            style={{
                                                left: `${clip.startTime * zoomLevel}px`,
                                                width: `${clipWidth}px`,
                                                backgroundColor: clip.color || '#3b82f6'
                                            }}
                                            onMouseDown={(e) => handleClipMouseDown(e, track.id, clip)}
                                        >
                                            <span className={styles.clipTitle}>{clip.title}</span>

                                            {/* رندر اختصاصی Waveform برای فایل صوتی */}
                                            {clip.type === 'audio' && (
                                                <AudioWaveform width={clipWidth} height={42} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
}