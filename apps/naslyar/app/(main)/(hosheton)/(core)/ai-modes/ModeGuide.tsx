'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ai-modes.module.scss';

type ManifestRow = { file?: string; url?: string };

const manifestCache: { loaded: boolean; map: Record<string, string> } = { loaded: false, map: {} };

function filenameOf(src: string) {
    return src.split('/').pop()?.split('?')[0] || '';
}

function resolveGuideImage(src: string, manifest: Record<string, string>) {
    if (/^https?:\/\//i.test(src)) return src;
    const file = filenameOf(src);
    return manifest[file] || src;
}

/** نمایش راهنمای آموزشی (markdown) با تصاویر محلی /guides/ai-modes */
export default function ModeGuide({ value, images }: { value?: string; images?: string[] }) {
    const pics = (images || []).map((src) => String(src || '').trim()).filter(Boolean);
    const [manifest, setManifest] = useState<Record<string, string>>(manifestCache.map);

    useEffect(() => {
        if (manifestCache.loaded || !pics.length) return;
        fetch('/guides/ai-modes/manifest.json')
            .then((res) => (res.ok ? res.json() : []))
            .then((rows: ManifestRow[]) => {
                const map: Record<string, string> = {};
                for (const row of rows || []) {
                    if (row.file && row.url) map[row.file] = row.url;
                }
                manifestCache.loaded = true;
                manifestCache.map = map;
                setManifest(map);
            })
            .catch(() => {
                manifestCache.loaded = true;
            });
    }, [pics.length]);

    if (!value && !pics.length) return null;
    return (
        <div className={styles.guideBody}>
            {pics.length ? (
                <div className={styles.previewImages}>
                    {pics.slice(0, 6).map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={resolveGuideImage(src, manifest)} alt="" />
                    ))}
                </div>
            ) : null}
            {value ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown> : null}
        </div>
    );
}
