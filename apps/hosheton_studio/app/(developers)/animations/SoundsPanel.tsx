'use client';

import { useEffect, useState } from 'react';
import { LuPlay } from 'react-icons/lu';
import { CAT_SOUND_FILES, type CatSoundName } from '../projects/[projectId]/chat/chatInput/cat/stage/CatSounds';
import { INTERACTIONS, SOUND_INFO } from './catalog';
import { useInspector } from './inspector';
import { CodeRef, SectionHead } from './ui';
import styles from './Animations.module.scss';

/* صداها (وجود فایل + پخش آزمایشی) و ورودی‌هایی که گربه به آن‌ها واکنش نشان می‌دهد */

const BASE = '/sounds/cat/';
const NAMES = Object.keys(CAT_SOUND_FILES) as CatSoundName[];

type FileState = 'checking' | 'ok' | 'missing';

export function SoundsPanel() {
    const { tx, fa, stage } = useInspector();
    const [files, setFiles] = useState<Record<CatSoundName, FileState>>(
        () => Object.fromEntries(NAMES.map((name) => [name, 'checking'])) as Record<CatSoundName, FileState>,
    );

    useEffect(() => {
        let cancelled = false;
        for (const name of NAMES) {
            fetch(`${BASE}${CAT_SOUND_FILES[name]}`, { method: 'HEAD' })
                .then((res) => res.ok && !(res.headers.get('content-type') ?? '').includes('text/html'))
                .catch(() => false)
                .then((ok) => {
                    if (!cancelled) setFiles((current) => ({ ...current, [name]: ok ? 'ok' : 'missing' }));
                });
        }
        return () => {
            cancelled = true;
        };
    }, []);

    const playFile = (name: CatSoundName) => {
        const audio = new Audio(`${BASE}${CAT_SOUND_FILES[name]}`);
        audio.volume = stage.volume;
        void audio.play().catch(() => undefined);
    };

    const stateText: Record<FileState, string> = fa
        ? { checking: 'در حال بررسی…', ok: 'موجود', missing: 'فایل نیست — بی‌صدا رد می‌شود' }
        : { checking: 'Checking…', ok: 'Present', missing: 'Missing — skipped silently' };

    return (
        <div className={styles.groups}>
            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'صداها' : 'Sounds'}
                    note={fa
                        ? 'با Web Audio و فقط بعد از اولین کلیک یا کلید کاربر (قانون autoplay). بلندی پیش‌فرض ۰.۲۵. دکمهٔ بی‌صدا کنار گربه فقط وقتی دیده می‌شود که دست‌کم یک فایل وجود داشته باشد؛ وضعیتش در localStorage می‌ماند.'
                        : 'Web Audio, only after the user\'s first click or key (autoplay rules). Default volume 0.25. The mute button next to the cat only appears when at least one file exists; its state is kept in localStorage.'}
                />
                <ul className={styles.rows}>
                    {NAMES.map((name) => (
                        <li key={name} className={styles.row}>
                            <code className={styles.rowKey} dir="ltr">{name}</code>
                            <div className={styles.rowMain}>
                                <p>{tx(SOUND_INFO[name])}</p>
                                <div className={styles.metaRow}>
                                    <code className={styles.flagId} dir="ltr">{`public${BASE}${CAT_SOUND_FILES[name]}`}</code>
                                    <span className={files[name] === 'missing' ? styles.stateOff : styles.meta}>{stateText[files[name]]}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className={styles.btn}
                                disabled={files[name] !== 'ok'}
                                onClick={() => playFile(name)}
                            >
                                <LuPlay size={13} />
                                {fa ? 'پخش' : 'Play'}
                            </button>
                        </li>
                    ))}
                </ul>
                <CodeRef code="stage/CatSounds.ts" title={fa ? 'صداهای گربه' : 'Cat sounds'} />
            </section>

            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'ورودی‌ها و واکنش‌ها' : 'Inputs and reactions'}
                    note={fa ? 'فقط خود گربه و توپ کلیک می‌گیرند؛ فوکوس ورودی چت دست نمی‌خورد.' : 'Only the cat and the ball take clicks; the chat input keeps its focus.'}
                />
                <ul className={styles.rows}>
                    {INTERACTIONS.map((item) => (
                        <li key={item.input.en} className={styles.row}>
                            <span className={styles.rowKeyText}>{tx(item.input)}</span>
                            <div className={styles.rowMain}>
                                <p>{tx(item.effect)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <CodeRef code="ChatCat.tsx › CatStage listeners · stage/CatDirector.ts › constructor" title={fa ? 'ورودی‌های گربه' : 'Cat inputs'} />
            </section>
        </div>
    );
}
