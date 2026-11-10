'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuGalleryHorizontal, LuSearch, LuSettings, LuX } from 'react-icons/lu';
import { RiFlowChart, RiMessage3Line, RiSpeedUpFill } from 'react-icons/ri';
import { CgEditFlipH } from 'react-icons/cg';
import ProfileMenu from '@/app/components/header/components/ProfileMenu/ProfileMenu';
import UsagePopup from '@/app/components/header/components/UsagePopup/UsagePopup';
import Image from 'next/image';
import LogoDark from '@/app/assets/hooshetun/logo-dark.svg';
import LogoLight from '@/app/assets/hooshetun/logo-light.svg';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useStudioExploreStore, writeStudioChatInject } from '@/app/zustand/store/useStudioExploreStore';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type { MediaProject, ProjectUsageSummaryResponse } from '@/app/(developers)/projects/types/media-api';
import { formatUsd, getBudgetUsage, resolveProjectSpentCost } from './project-list-utils';
import {
    GalleryModal,
    galleryItemToPreviewMedia,
    galleryItemToStudioMedia,
    type GalleryFileItem,
} from '@/app/(developers)/gallery';
import { ProjectMembersMenu } from './ProjectMembersMenu';
import styles from './ProjectWorkspaceSwitcher.module.scss';

type ProjectWorkspaceSwitcherProps = {
    projectId: string;
};

export function ProjectWorkspaceSwitcher({ projectId }: ProjectWorkspaceSwitcherProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useTranslation('projects');
    const { t: tm } = useTranslation('menu');
    const { t: tc } = useTranslation('common');
    const { i18n } = useTranslation();
    const theme = useAppStore((s) => s.theme);
    const root = `/projects/${projectId}`;
    const exploreOpen = useStudioExploreStore((s) => s.open);
    const toggleExplore = useStudioExploreStore((s) => s.toggle);
    const contentDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    const [project, setProject] = useState<MediaProject | null>(null);
    const [usage, setUsage] = useState<ProjectUsageSummaryResponse | 'loading' | 'error'>('loading');
    const [titleDraft, setTitleDraft] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [savingTitle, setSavingTitle] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);
    const queueCanvasInsert = useStudioExploreStore((s) => s.queueCanvasInsert);
    // گالری هدر: در ورک‌فلو فایل‌های انتخابی به نود reference و در چت به پیوست‌های کادر اضافه می‌شوند
    const galleryTarget: 'workflow' | 'chat' | null = pathname === root
        ? 'workflow'
        : pathname === `${root}/chat` || Boolean(pathname?.startsWith(`${root}/chat/`))
            ? 'chat'
            : null;
    const addFromGallery = (items: GalleryFileItem[]) => {
        if (!items.length) return;
        if (galleryTarget === 'workflow') {
            queueCanvasInsert({ kind: 'assetRefs', items: items.map(galleryItemToStudioMedia) });
        } else if (galleryTarget === 'chat') {
            writeStudioChatInject(projectId, { attachments: items.map(galleryItemToPreviewMedia) });
        }
    };

    useEffect(() => {
        let cancelled = false;
        setUsage('loading');
        mediaApi.getProject(projectId)
            .then((res) => {
                if (cancelled) return;
                setProject(res.project);
                setTitleDraft(res.project?.title?.trim() || '');
            })
            .catch(() => {
                if (!cancelled) {
                    setProject(null);
                    setTitleDraft('');
                }
            });
        mediaApi.getProjectUsageSummary(projectId)
            .then((summary) => {
                if (!cancelled) setUsage(summary);
            })
            .catch(() => {
                if (!cancelled) setUsage('error');
            });
        return () => { cancelled = true; };
    }, [projectId]);

    useEffect(() => {
        if (!editingTitle) return;
        titleRef.current?.focus();
        titleRef.current?.select();
    }, [editingTitle]);

    if (pathname.startsWith(`${root}/settings`)) return null;

    const editorComingSoon = process.env.NODE_ENV === 'production';
    const items = [
        { label: t('chat'), href: `${root}/chat`, icon: RiMessage3Line },
        { label: t('workflow'), href: root, icon: RiFlowChart },
        {
            label: t('editor_tab'),
            href: `${root}/editor`,
            icon: CgEditFlipH,
            comingSoon: editorComingSoon,
        },
    ];

    const canRename = Boolean(project?.canManage ?? project?.isOwner);
    const projectTitle = project?.title?.trim() || '';
    const budget = project?.budget ? project.budget : null;
    const spentCost = project ? resolveProjectSpentCost(project, usage) : 0;
    const budgetUsage = getBudgetUsage(project?.budgetSpent ?? spentCost, budget);

    const startEditing = () => {
        if (!canRename) return;
        setTitleDraft(projectTitle);
        setEditingTitle(true);
    };

    const cancelEditing = () => {
        setTitleDraft(projectTitle);
        setEditingTitle(false);
    };

    const saveTitle = async () => {
        const next = titleDraft.trim();
        if (!canRename || savingTitle) return;
        if (!next || next === projectTitle) {
            cancelEditing();
            return;
        }
        setSavingTitle(true);
        try {
            const updated = await mediaApi.updateProjectSettings(projectId, { title: next });
            setProject(updated);
            setTitleDraft(updated.title || next);
            setEditingTitle(false);
        } catch {
            setTitleDraft(projectTitle);
        } finally {
            setSavingTitle(false);
        }
    };

    const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void saveTitle();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditing();
        }
    };

    return (
        <header className={styles.header} dir="ltr">
            <div className={styles.start}>
                <Link
                    href="/explore"
                    className={`${styles.logoLink} ${styles.hideOnMobile}`}
                    aria-label={tm('explore')}
                    title={tm('explore')}
                >
                    <Image src={theme === 'dark' ? LogoLight : LogoDark} alt={tm('explore')} className={styles.brandLogo} />
                </Link>
                <span className={`${styles.divider} ${styles.hideOnMobile}`} aria-hidden>|</span>
                <button
                    type="button"
                    className={`${styles.iconBtn} ${exploreOpen ? styles.iconBtnActive : ''}`}
                    onClick={toggleExplore}
                    aria-pressed={exploreOpen}
                    aria-label={tc('search')}
                    title={tc('search')}
                >
                    <LuSearch size={18} />
                </button>
                <span className={styles.hideOnMobile}>
                    <ProfileMenu
                        iconSize={18}
                        triggerClassName={styles.iconBtn}
                    />
                </span>
                <span className={styles.hideOnMobile}>
                    <UsagePopup
                        trigger={<RiSpeedUpFill size={18} />}
                        triggerClassName={styles.iconBtn}
                    />
                </span>
                <span className={styles.divider} aria-hidden>|</span>
                <ProjectMembersMenu projectId={projectId} />
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setGalleryOpen(true)}
                    aria-label={t('gallery')}
                    title={t('gallery')}
                >
                    <LuGalleryHorizontal size={18} />
                </button>
                <Link
                    href={`${root}/settings/info`}
                    className={styles.iconBtn}
                    aria-label={t('settings')}
                    title={t('settings')}
                >
                    <LuSettings size={18} />
                </Link>
            </div>

            {/* گالری همین پروژه: فایل‌های workflow + چت اصلی و چت‌های همین پروژه (نه پروژه‌های دیگر) */}
            <GalleryModal
                open={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                scope="project"
                projectId={projectId}
                mode="view"
                onAdd={galleryTarget ? addFromGallery : undefined}
                onQuickAdd={galleryTarget === 'chat' ? (item) => addFromGallery([item]) : undefined}
                addLabel={galleryTarget === 'chat' ? t('gallery_add_to_chat') : t('gallery_add_to_workflow')}
            />

            <div className={`${styles.titleBlock} ${styles.hideOnMobile}`}>
                {editingTitle ? (
                    <>
                        <input
                            ref={titleRef}
                            className={styles.titleInput}
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onKeyDown={onTitleKeyDown}
                            aria-label={t('workspace_aria')}
                            dir={contentDir}
                            size={Math.max(8, (titleDraft || projectTitle).length + 1)}
                        />
                        <button
                            type="button"
                            className={styles.checkBtn}
                            onClick={() => void saveTitle()}
                            disabled={savingTitle}
                            aria-label={tc('confirm')}
                        >
                            <LuCheck size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className={`${styles.projectName} ${canRename ? styles.projectNameAction : ''}`}
                        dir={contentDir}
                        title={canRename ? t('workspace_aria') : projectTitle}
                        onDoubleClick={startEditing}
                    >
                        {projectTitle}
                    </button>
                )}
            </div>

            <div className={styles.end}>
                {project ? (
                    <>
                        <div
                            className={`${styles.budget} ${styles.hideOnMobile}`}
                            title={budget !== null ? t('budget_usage') : t('no_budget')}
                        >
                            <div className={styles.budgetTop}>
                                <span className={styles.budgetSpent}>
                                    {t('spent_label', { amount: formatUsd(spentCost) })}
                                </span>
                                <span className={styles.budgetMeta}>
                                    {budgetUsage.hasBudget
                                        ? t('budget_of', { percent: budgetUsage.percentLabel, budget: formatUsd(budget) })
                                        : t('no_cap')}
                                </span>
                            </div>
                            <div className={styles.budgetBar}>
                                <div
                                    className={styles.budgetFill}
                                    style={{
                                        width: `${budgetUsage.widthPercent}%`,
                                        minWidth: budgetUsage.widthPercent > 0 ? '3px' : undefined,
                                    }}
                                />
                            </div>
                            <div className={styles.budgetPopup}>
                                <h5>{t('cost_breakdown')}</h5>
                                {usage === 'loading' ? (
                                    <div className={styles.budgetRow}><span>{tc('loading')}</span></div>
                                ) : usage === 'error' ? (
                                    <div className={styles.budgetRow}><span>{t('load_costs_error')}</span></div>
                                ) : usage.models.length === 0 && !usage.imageGeneration.totalCost ? (
                                    <div className={styles.budgetRow}><span>{t('no_cost_yet')}</span></div>
                                ) : (
                                    <>
                                        {usage.models.map((model, index) => (
                                            <div
                                                className={styles.budgetRow}
                                                key={`${model.model}-${model.class}-${model.nodeType ?? index}`}
                                            >
                                                <span>{model.model} ({formatAppNumber(model.count, i18n.language)}x):</span>
                                                <span>${formatUsd(model.totalCost)}</span>
                                            </div>
                                        ))}
                                        {usage.imageGeneration.totalCost > 0 && (
                                            <div className={styles.budgetRow}>
                                                <span>{t('image_gen_est')}</span>
                                                <span>${formatUsd(usage.imageGeneration.totalCost)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <span className={`${styles.divider} ${styles.hideOnMobile}`} aria-hidden>|</span>
                    </>
                ) : null}
                <nav className={styles.switcher} aria-label={t('workspace_aria')}>
                    {items.map(({ label, href, icon: Icon, comingSoon }) => {
                        const active = pathname === href;
                        if (comingSoon) {
                            return (
                                <button
                                    key={href}
                                    type="button"
                                    className={styles.item}
                                    title={label}
                                    aria-label={label}
                                    onClick={() => notifyError({ message: t('editor_coming_soon') })}
                                >
                                    <Icon aria-hidden size={18} />
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`${styles.item} ${active ? styles.active : ''}`}
                                aria-current={active ? 'page' : undefined}
                                title={label}
                                aria-label={label}
                            >
                                <Icon aria-hidden size={18} />
                            </Link>
                        );
                    })}
                </nav>
                <span className={styles.divider} aria-hidden>|</span>
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => router.push('/projects')}
                    aria-label={tc('close')}
                    title={tc('close')}
                >
                    <LuX size={15} />
                </button>
            </div>
        </header>
    );
}
