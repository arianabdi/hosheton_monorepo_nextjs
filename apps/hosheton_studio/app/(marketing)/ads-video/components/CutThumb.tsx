'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { aspectCss, stageSize } from '../lib/cut-runtime';
import styles from '../AdsVideo.module.scss';

export interface CutThumbProps {
    html: string;
    aspectRatio?: string;
    title?: string;
}

/** سقف ارتفاع پیش‌نمایش استوری‌بورد — حتی یک کات تنها هم بیش از این جا نمی‌گیرد */
const THUMB_MAX_HEIGHT = 170;

/**
 * پیش‌نمایش استوری‌بورد — ویدیو دقیقاً با سایز/نسبت اصلی‌اش (مثلاً 16:9 پهن یا
 * 9:16 موبایلی) وسط کادر هم‌تمِ آیتم می‌نشیند و ارتفاعش به سقف محدود است؛
 * iframe با سایز واقعی استیج رندر و با ResizeObserver مقیاس می‌شود.
 */
function CutThumbBase({ html, aspectRatio = '16:9', title }: CutThumbProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState({ width: 0, height: 0 });
    const size = useMemo(() => stageSize(aspectRatio), [aspectRatio]);

    useEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const update = () => {
            const availWidth = box.clientWidth - 12;
            const availHeight = THUMB_MAX_HEIGHT;
            if (availWidth <= 0) return;
            const scale = Math.min(availWidth / size.width, availHeight / size.height);
            const next = {
                width: Math.floor(size.width * scale),
                height: Math.floor(size.height * scale),
            };
            setFit((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(box);
        return () => observer.disconnect();
    }, [size.width, size.height]);

    return (
        <div
            ref={boxRef}
            className={styles.cutThumbFull}
            style={{ height: fit.height || THUMB_MAX_HEIGHT }}
            title={title}
        >
            <div
                className={styles.cutThumbBox}
                style={fit.width ? { width: fit.width, height: fit.height, aspectRatio: aspectCss(aspectRatio) } : { aspectRatio: aspectCss(aspectRatio) }}
            >
                {html ? (
                    <iframe
                        title={title ? `thumb-${title}` : 'ads-cut-thumb'}
                        srcDoc={html}
                        sandbox="allow-scripts"
                        scrolling="no"
                        loading="lazy"
                        tabIndex={-1}
                        style={{
                            width: size.width,
                            height: size.height,
                            transform: `scale(${fit.width ? fit.width / size.width : 0.1})`,
                            transformOrigin: 'top left',
                        }}
                    />
                ) : (
                    <span className={styles.cutThumbEmpty}>{'—'}</span>
                )}
            </div>
        </div>
    );
}

export const CutThumb = memo(CutThumbBase);
export default CutThumb;
