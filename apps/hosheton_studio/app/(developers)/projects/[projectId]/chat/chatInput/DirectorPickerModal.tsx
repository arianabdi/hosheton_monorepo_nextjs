'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { LuSparkles, LuX } from 'react-icons/lu';
import { ModeIcon, SvgMarkup, sanitizeSvg } from '../lib/modeIcon';
import styles from './DirectorPickerModal.module.scss';

export type DirectorPickerCard = {
    id: string;
    title: string;
    titleFa?: string;
    description?: string;
    icon?: string;
    iconSvg?: string;
    image?: string;
    groupKey: string;
    groupTitle: string;
    guide?: string;
    guideImages?: string[];
};

type ManifestRow = { file?: string; url?: string };

const manifestCache: { loaded: boolean; map: Record<string, string> } = { loaded: false, map: {} };

function filenameOf(src: string) {
    return src.split('/').pop()?.split('?')[0] || '';
}

function resolveGuideImage(src: string | undefined, manifest: Record<string, string>) {
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    const file = filenameOf(src);
    return manifest[file] || src;
}

function Thumb({ icon, iconSvg }: { icon?: string; iconSvg?: string }) {
    if (sanitizeSvg(iconSvg)) return <SvgMarkup svg={iconSvg} />;
    return <ModeIcon name={icon || 'LuSparkles'} size={22} />;
}

export default function DirectorPickerModal({
    open,
    title,
    noneLabel,
    noneHint,
    cards,
    selection,
    layered,
    onClose,
    onSelect,
    onClear,
}: {
    open: boolean;
    title: string;
    noneLabel?: string;
    noneHint?: string;
    cards: DirectorPickerCard[];
    /** layered: groupKey -> id ; single: { all: id } */
    selection: Record<string, string>;
    layered: boolean;
    onClose: () => void;
    onSelect: (groupKey: string, id: string) => void;
    onClear: (groupKey?: string) => void;
}) {
    const [guideId, setGuideId] = useState('');
    const [manifest, setManifest] = useState<Record<string, string>>(manifestCache.map);

    useEffect(() => {
        if (!open) {
            setGuideId('');
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open || manifestCache.loaded) return;
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
    }, [open]);

    const groups = useMemo(() => {
        const order: string[] = [];
        const map = new Map<string, { title: string; items: DirectorPickerCard[] }>();
        for (const card of cards) {
            const key = card.groupKey || 'other';
            if (!map.has(key)) {
                map.set(key, { title: card.groupTitle || key, items: [] });
                order.push(key);
            }
            map.get(key)!.items.push(card);
        }
        return order.map((key) => ({ key, ...map.get(key)! }));
    }, [cards]);

    const guideCard = cards.find((card) => card.id === guideId) || null;

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className={styles.overlay} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
                <div className={styles.mainCol}>
                <header className={styles.header}>
                    <h2>{title}</h2>
                    <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="بستن">
                        <LuX size={18} />
                    </button>
                </header>
                <div className={styles.body}>
                    {noneLabel ? (
                        <button
                            type="button"
                            className={`${styles.noneCard} ${!Object.values(selection).some(Boolean) ? styles.selected : ''}`}
                            onClick={() => onClear()}
                        >
                            <span className={styles.thumb}><LuSparkles size={20} /></span>
                            <span>
                                <strong>{noneLabel}</strong>
                                {noneHint ? <small>{noneHint}</small> : null}
                            </span>
                        </button>
                    ) : null}

                    {groups.map((group) => (
                        <section key={group.key} className={styles.group}>
                            <h3>{group.title}</h3>
                            <div className={styles.grid}>
                                {group.items.map((card) => {
                                    const selected = layered
                                        ? selection[group.key] === card.id
                                        : Object.values(selection).includes(card.id);
                                    return (
                                        <article key={card.id} className={`${styles.card} ${selected ? styles.selected : ''}`}>
                                            <button
                                                type="button"
                                                className={styles.cardMain}
                                                onClick={() => onSelect(group.key, card.id)}
                                            >
                                                <span className={styles.thumb}>
                                                    <Thumb icon={card.icon} iconSvg={card.iconSvg} />
                                                </span>
                                                <span className={styles.cardText}>
                                                    <strong>{card.titleFa || card.title}</strong>
                                                    <small>{card.description || card.title}</small>
                                                </span>
                                            </button>
                                            {card.guide || (card.guideImages || []).length ? (
                                                <button
                                                    type="button"
                                                    className={styles.guideBtn}
                                                    onClick={() => setGuideId(guideId === card.id ? '' : card.id)}
                                                >
                                                    {guideId === card.id ? 'بستن راهنما' : 'راهنما'}
                                                </button>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
                </div>

                {guideCard ? (
                    <aside className={styles.guidePanel}>
                        <div className={styles.guideHead}>
                            <h3>{guideCard.titleFa || guideCard.title}</h3>
                            <button type="button" className={styles.iconBtn} onClick={() => setGuideId('')} aria-label="بستن راهنما">
                                <LuX size={16} />
                            </button>
                        </div>
                        {(guideCard.guideImages || []).length ? (
                            <div className={styles.guideImages}>
                                {guideCard.guideImages!.slice(0, 4).map((src) => {
                                    const resolved = resolveGuideImage(src, manifest);
                                    return (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={src} src={resolved} alt="" />
                                    );
                                })}
                            </div>
                        ) : null}
                        {guideCard.guide ? (
                            <div className={styles.guideBody}>
                                <ReactMarkdown>{guideCard.guide}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className={styles.guideEmpty}>{guideCard.description || 'راهنمایی ثبت نشده است.'}</p>
                        )}
                    </aside>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
