'use client';

import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
    src: string;
    currentTime: number;
    isPlaying: boolean;
    onTimeUpdate: (time: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, currentTime, isPlaying, onTimeUpdate }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const animFrameRef = useRef<number | null>(null);

    // همگام‌سازی موقعیت پلیر در صورت تغییر Playhead در تایم‌لاین
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (Math.abs(video.currentTime - currentTime) > 0.15) {
            video.currentTime = currentTime;
        }
    }, [currentTime]);

    // کنترل پخش و توقف
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.play().catch(() => {});
            const updateLoop = () => {
                onTimeUpdate(video.currentTime);
                animFrameRef.current = requestAnimationFrame(updateLoop);
            };
            animFrameRef.current = requestAnimationFrame(updateLoop);
        } else {
            video.pause();
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isPlaying, onTimeUpdate]);

    return (
        <div style={{ width: '100%', maxWidth: '640px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                src={src}
                style={{ width: '100%', display: 'block' }}
                playsInline
                muted
            />
        </div>
    );
};