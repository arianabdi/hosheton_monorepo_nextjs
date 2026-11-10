'use client';

import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { LuImagePlus } from 'react-icons/lu';
import { signedDegrees, type AngleCamera, type AngleLight } from '../../lib/angle-studio';
import styles from './AngleStudio.module.scss';

/**
 * پیش‌نمایش حسی (نه خروجی): عکس منبع با پرسپکتیو همان زاویه و یک لایهٔ نور رنگی
 * در جهتی که نور از دید همین دوربین می‌آید. خروجی واقعی را مدل می‌سازد.
 */
export default function AnglePreviewStage({
    imageUrl,
    camera,
    light,
}: {
    imageUrl?: string;
    camera: AngleCamera;
    light: AngleLight;
}) {
    const { t } = useTranslation('projects');
    const turn = signedDegrees(camera.azimuth);
    const frameStyle: CSSProperties = {
        transform: `perspective(1100px) rotateY(${(-Math.max(-70, Math.min(70, turn)) * 0.55).toFixed(1)}deg) rotateX(${(camera.elevation * 0.35).toFixed(1)}deg) scale(${(1 + camera.zoom * 0.035).toFixed(3)})`,
    };

    // جهت نور از دید دوربین همین نما (نور در صحنه ثابت است)
    const relative = signedDegrees(light.azimuth - camera.azimuth);
    const backlit = Math.abs(relative) > 110;
    const x = 50 + Math.sin((relative * Math.PI) / 180) * 46;
    const y = 50 - Math.max(-1, Math.min(1, light.elevation / 70)) * 42;
    const strength = light.intensity / 100;
    const spread = 30 + light.softness * 0.45;
    const glowStyle: CSSProperties = backlit
        ? {
            background: `radial-gradient(ellipse at ${x.toFixed(0)}% ${y.toFixed(0)}%, ${light.color} 0%, transparent ${spread.toFixed(0)}%), radial-gradient(ellipse at center, transparent 58%, ${light.color} 100%)`,
            opacity: 0.25 + strength * 0.45,
        }
        : {
            background: `radial-gradient(circle at ${x.toFixed(0)}% ${y.toFixed(0)}%, ${light.color} 0%, transparent ${spread.toFixed(0)}%)`,
            opacity: 0.2 + strength * 0.5,
        };
    const shadeStyle: CSSProperties = {
        background: `radial-gradient(circle at ${(100 - x).toFixed(0)}% ${(100 - y).toFixed(0)}%, rgba(0, 0, 0, ${(0.15 + strength * 0.35).toFixed(2)}) 0%, transparent ${(spread + 15).toFixed(0)}%)`,
    };

    return (
        <div className={styles.previewStage}>
            {imageUrl ? (
                <div className={styles.previewFrame} style={frameStyle}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={t('angle_preview_alt')} draggable={false} />
                    {light.enabled ? (
                        <>
                            <span className={styles.previewShade} style={shadeStyle} aria-hidden />
                            <span className={styles.previewGlow} style={glowStyle} aria-hidden />
                        </>
                    ) : null}
                </div>
            ) : (
                <div className={styles.previewEmpty}>
                    <LuImagePlus size={28} aria-hidden />
                    <span>{t('angle_preview_empty')}</span>
                </div>
            )}
            <span className={styles.previewBadge}>{t('angle_preview_badge')}</span>
        </div>
    );
}
