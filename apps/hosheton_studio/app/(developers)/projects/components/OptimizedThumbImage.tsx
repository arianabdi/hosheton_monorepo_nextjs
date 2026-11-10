'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import styles from './OptimizedThumbImage.module.scss';

type Props = {
    src: string;
    alt?: string;
    className?: string;
    delayMs?: number;
    lazy?: boolean;
};

/** Small optimized thumb with ghost shimmer; handles cached/broken images. */
export function OptimizedThumbImage({
    src,
    alt = '',
    className,
    delayMs = 0,
    lazy = true,
}: Props) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useLayoutEffect(() => {
        setLoaded(false);
        setErrored(false);
        const img = imgRef.current;
        if (!img?.complete) return;
        if (img.naturalWidth > 0) {
            setLoaded(true);
            return;
        }
        setErrored(true);
    }, [src]);

    return (
        <span className={`${styles.root} ${className || ''}`.trim()}>
            {!loaded && !errored ? (
                <span
                    className={styles.ghost}
                    style={{ ['--ghost-delay' as string]: `${delayMs}ms` }}
                    aria-hidden
                />
            ) : null}
            {!errored ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={imgRef}
                    className={loaded ? styles.ready : styles.pending}
                    src={src}
                    alt={alt}
                    loading={lazy ? 'lazy' : 'eager'}
                    decoding="async"
                    onLoad={() => setLoaded(true)}
                    onError={() => setErrored(true)}
                />
            ) : null}
        </span>
    );
}
