'use client';

import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
    width: number;
    height: number;
    color?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = React.memo(function AudioWaveform({ width, height, color = '#a7f3d0' }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;

        // تولید داده نمادین برای امواج صدا (در پروژه واقعی از Web Audio API AudioBuffer استفاده می‌شود)
        const barWidth = 3;
        const gap = 1;
        const totalBars = Math.floor(width / (barWidth + gap));
        const centerY = height / 2;

        for (let i = 0; i < totalBars; i++) {
            // الگوریتم سینوسی ترکیبی برای شباهت به موزیک واقعی
            const amplitude = Math.sin(i * 0.15) * Math.cos(i * 0.05) * 0.8 + 0.2;
            const barHeight = Math.max(4, Math.abs(amplitude) * (height - 8));

            const x = i * (barWidth + gap);
            const y = centerY - barHeight / 2;

            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }, [width, height, color]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ pointerEvents: 'none' }} />;
});