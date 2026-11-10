'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    LuCheck,
    LuChevronsUpDown,
    LuClapperboard,
    LuDownload,
    LuFolderPlus,
    LuLayoutTemplate,
    LuPlus,
    LuTrash2,
} from 'react-icons/lu';
import type { AdsProject } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import styles from './ProjectBar.module.scss';

interface ProjectBarProps {
    project: AdsProject | null;
    projects: AdsProject[];
    cutsCount: number;
    totalSeconds: number;
    demoMode: boolean;
    busy?: boolean;
    onSelectProject(projectId: string): void;
    onCreateProject(title: string, aspectRatio: string): void | Promise<void>;
    onDeleteProject(): void | Promise<void>;
    onOpenTemplates(): void;
    onOpenExport(): void;
}

const ASPECT_OPTIONS = ['16:9', '9:16', '1:1'];
const MENU_WIDTH = 288;

function formatClock(seconds: number) {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * نوار پروژه بالای چت — جایگزین جعبه‌ابزار بالای پیش‌نمایش: انتخاب‌گر پروژه
 * (لیست، ساخت و حذف داخل منو) + دو اکشن آیکنی قالب‌ها و خروجی ویدیو.
 */
export default function ProjectBar({
    project,
    projects,
    cutsCount,
    totalSeconds,
    demoMode,
    busy = false,
    onSelectProject,
    onCreateProject,
    onDeleteProject,
    onOpenTemplates,
    onOpenExport,
}: ProjectBarProps) {
    const { t } = useTranslation('adsVideo');
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [aspect, setAspect] = useState('16:9');
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const close = () => {
        setOpen(false);
        setCreating(false);
        setTitle('');
    };

    // منو زیر دکمه، هم‌تراز لبه‌ی شروع آن (در RTL لبه‌ی راست) — اندازه‌گیری لحظه‌ی باز شدن
    const openMenu = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const rtl = getComputedStyle(trigger).direction === 'rtl';
        const width = Math.min(Math.max(rect.width, MENU_WIDTH), window.innerWidth - 16);
        const style: CSSProperties = {
            position: 'fixed',
            top: rect.bottom + 6,
            width,
            maxHeight: Math.max(200, window.innerHeight - rect.bottom - 24),
            zIndex: 10050,
        };
        if (rtl) style.right = Math.max(8, window.innerWidth - rect.right);
        else style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        setMenuStyle(style);
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        // جابه‌جایی چیدمان (resize) جای دکمه را عوض می‌کند — منو بسته شود
        const onResize = () => {
            setOpen(false);
            setCreating(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
            setCreating(false);
            setTitle('');
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            setCreating(false);
            setTitle('');
            triggerRef.current?.focus();
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        void onCreateProject(title.trim() || t('new_project_default_title', { defaultValue: 'پروژه جدید' }), aspect);
        close();
    };

    const projectTitle = project?.title
        || (demoMode ? t('project_demo_title', { defaultValue: 'پروژه‌ی نمونه' }) : t('no_projects'));
    const aspectRatio = project?.aspectRatio || '16:9';

    return (
        <div className={styles.bar}>
            <button
                ref={triggerRef}
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={busy && !projects.length}
                onClick={() => (open ? close() : openMenu())}
            >
                <span className={styles.avatar} aria-hidden>
                    <LuClapperboard size={14} />
                </span>
                <span className={styles.triggerText}>
                    <strong dir="auto">{projectTitle}</strong>
                    <small>
                        <span dir="ltr">{aspectRatio}</span>
                        <i aria-hidden>·</i>
                        {t('cuts_count', { n: cutsCount })}
                        <i aria-hidden>·</i>
                        <span dir="ltr">{formatClock(totalSeconds)}</span>
                    </small>
                </span>
                <LuChevronsUpDown size={14} className={styles.triggerChevron} aria-hidden />
            </button>

            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={onOpenTemplates}
                    aria-label={t('templates_title', { defaultValue: 'قالب‌های آماده' })}
                    title={t('templates_title', { defaultValue: 'قالب‌های آماده' })}
                >
                    <LuLayoutTemplate size={15} />
                </button>
                <button
                    type="button"
                    className={styles.iconBtn}
                    disabled={!project}
                    onClick={onOpenExport}
                    aria-label={t('export_title', { defaultValue: 'خروجی ویدیو' })}
                    title={t('export_title', { defaultValue: 'خروجی ویدیو' })}
                >
                    <LuDownload size={15} />
                </button>
            </div>

            {open && menuStyle && createPortal(
                <div ref={menuRef} className={styles.menu} style={menuStyle} role="menu">
                    <p className={styles.menuLabel}>{t('projects_menu_title', { defaultValue: 'پروژه‌ها' })}</p>
                    <div className={styles.menuList}>
                        {projects.map((item) => {
                            const active = item._id === project?._id;
                            return (
                                <button
                                    key={item._id}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    className={`${styles.menuItem} ${active ? styles.menuItemActive : ''}`}
                                    onClick={() => {
                                        close();
                                        if (!active) onSelectProject(item._id);
                                    }}
                                >
                                    <span className={styles.menuItemText}>
                                        <strong dir="auto">{item.title}</strong>
                                        <small>
                                            <span dir="ltr">{item.aspectRatio || '16:9'}</span>
                                            <i aria-hidden>·</i>
                                            {t('cuts_count', { n: item.cutCount ?? 0 })}
                                        </small>
                                    </span>
                                    {active ? <LuCheck size={14} aria-hidden /> : null}
                                </button>
                            );
                        })}
                        {!projects.length ? <p className={styles.menuEmpty}>{t('no_projects')}</p> : null}
                    </div>

                    <div className={styles.menuDivider} />

                    {creating ? (
                        <form className={styles.createForm} onSubmit={submitCreate}>
                            <input
                                autoFocus
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder={t('project_name_placeholder')}
                                dir="auto"
                            />
                            <div className={styles.aspects} role="radiogroup" aria-label={t('aspect_ratio_title', { defaultValue: 'نسبت تصویر' })}>
                                {ASPECT_OPTIONS.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        role="radio"
                                        aria-checked={aspect === option}
                                        className={aspect === option ? styles.aspectActive : ''}
                                        onClick={() => setAspect(option)}
                                    >
                                        <i className={styles.aspectGlyph} style={{ aspectRatio: option.replace(':', ' / ') }} aria-hidden />
                                        <span dir="ltr">{option}</span>
                                    </button>
                                ))}
                            </div>
                            <button type="submit" className={styles.createBtn}>
                                <LuPlus size={13} />
                                {t('create_project')}
                            </button>
                        </form>
                    ) : (
                        <button type="button" className={styles.menuAction} onClick={() => setCreating(true)}>
                            <LuFolderPlus size={14} />
                            {t('new_project')}
                        </button>
                    )}
                    {project && !creating ? (
                        <button
                            type="button"
                            className={`${styles.menuAction} ${styles.menuDanger}`}
                            onClick={() => {
                                close();
                                void onDeleteProject();
                            }}
                        >
                            <LuTrash2 size={14} />
                            {t('delete_project')}
                        </button>
                    ) : null}
                </div>,
                document.body,
            )}
        </div>
    );
}
