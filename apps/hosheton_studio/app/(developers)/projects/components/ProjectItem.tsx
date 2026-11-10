'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuArrowUpRight,
    LuSettings,
    LuUsers,
} from 'react-icons/lu';
import { TbClock2, TbLine, TbTimelineEvent } from 'react-icons/tb';
import { HiOutlineArchive } from 'react-icons/hi';
import { CgTrashEmpty } from 'react-icons/cg';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './MediaProjectList.module.scss';
import type { MediaProject, ProjectUsageSummaryResponse } from '../types/media-api';
import {
    formatUsd,
    getBudgetUsage,
    getProjectIcon,
    resolveProjectSpentCost,
} from './project-list-utils';

interface ProjectItemProps {
    project: MediaProject;
    usage?: ProjectUsageSummaryResponse | 'loading' | 'error';
    onOpen: () => void;
    onSettings: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onHover: () => void;
}

export function ProjectItem({
    project,
    usage,
    onOpen,
    onSettings,
    onDelete,
    onHover,
}: ProjectItemProps) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;
    const ProjectIcon = getProjectIcon(project.icon);
    const accentColor = project.color || '#7d38ff';
    const status = project.status || 'in_progress';
    // Server decorates `budget` as 0 when unset — keep showing the «no budget» state.
    const budget = project.budget ? project.budget : null;
    const spentCost = resolveProjectSpentCost(project, usage);
    // The usage bar tracks money drawn from the project escrow; personal-wallet
    // spend (after the escrow runs dry) is reported separately by spentCost.
    const budgetDrawn = project.budgetSpent ?? spentCost;
    const budgetUsage = getBudgetUsage(budgetDrawn, budget);

    const size = 19;
    const color = 'var(--icon-color)';
    const updatedLabel = formatAppDate(project.updatedAt || project.createdAt, lang);
    const deadlineLabel = formatAppDate(project.deadline ?? undefined, lang);

    return (
        <div
            className={styles.techCard}
            onClick={onOpen}
            onMouseEnter={onHover}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
        >
            <div className={styles.colProject}>
                <div className={styles.cardHeader}>
                    <div className={styles.titleSection}>
                        <div
                            className={styles.iconCyberGlow}
                            style={{
                                background: `${accentColor}3b`,
                                boxShadow: `0 0 0 3px ${accentColor}21`,
                                color: accentColor,
                            }}
                        >
                            <ProjectIcon />
                        </div>
                        <div className={styles.titleMeta}>
                            <h3>{project.title}</h3>
                            <span className={`${styles.statusBadge} ${styles[status]}`}>
                                {status === 'completed' ? t('completed') : t('in_progress')}
                            </span>
                            {!project.isOwner && (
                                <span className={styles.sharedBadge}>
                                    <LuUsers size={11} /> {t('shared')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`${styles.actionButtons} ${styles.mobileOnlyActions}`}>
                        <button
                            type="button"
                            title={t('settings')}
                            onClick={onSettings}
                            className={styles.actionBtn}
                        >
                            <LuSettings size={size} color={color} />
                        </button>
                        {project.isOwner !== false && (
                            <button
                                type="button"
                                title={tc('delete')}
                                onClick={onDelete}
                                className={`${styles.actionBtn} ${styles.delete}`}
                            >
                                <CgTrashEmpty size={size} color={color} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.colDescription}>
                <div className={styles.innerDetailsBox}>
                    <div className={styles.descriptionWrapper}>
                        <span className={styles.verticalCyberLine} />
                        <p className={styles.cardDescription}>
                            {project.description || t('default_desc')}
                        </p>
                    </div>
                    <div className={styles.metaSpecsRow}>
                        <span>{t('last_updated_on', { date: updatedLabel })}</span>
                    </div>
                </div>
            </div>

            <div className={styles.colMetrics}>
                <div className={styles.technicalMetrics}>
                    <div className={styles.metricItem}>
                        <TbTimelineEvent size={size} color={color} />
                        <span>{formatAppNumber(project.nodes?.length ?? 0, lang)} Nodes</span>
                    </div>
                    <div className={styles.metricItem}>
                        <TbLine size={size} color={color} />
                        <span>{formatAppNumber(project.edges?.length ?? 0, lang)} Edges</span>
                    </div>
                    <div className={styles.metricItem}>
                        <HiOutlineArchive size={size} color={color} />
                        <span>{formatAppNumber(project.filesCount ?? 0, lang)} Assets</span>
                    </div>
                </div>
            </div>

            <div className={styles.colSpace}>
                <div className={styles.spaceBlock}>
                    <span className={styles.spaceLabel}>{t('workspace')}</span>
                    <span className={styles.spaceName} title={project.space?.description || undefined}>
                        {project.space?.name || t('unspecified')}
                    </span>
                    {project.space?.description ? (
                        <span className={styles.spaceDesc}>{project.space.description}</span>
                    ) : !project.space ? (
                        <span className={styles.spaceDesc}>{t('pick_in_settings')}</span>
                    ) : null}
                </div>
            </div>

            <div className={styles.colProgress}>
                <div className={styles.costProgressWrapper}>
                    <div className={styles.costHeaderRow}>
                        <span className={styles.costTitle}>
                            {budget !== null ? t('budget_usage') : t('no_budget')}
                        </span>
                        <span className={styles.liveCost}>{t('spent_label', { amount: formatUsd(spentCost) })}</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div
                            className={styles.progressBarFill}
                            style={{
                                width: `${budgetUsage.widthPercent}%`,
                                minWidth: budgetUsage.widthPercent > 0 ? '4px' : undefined,
                            }}
                        />
                    </div>
                    <div className={styles.progressLabels}>
                        <span>0%</span>
                        <span className={styles.activeZone}>
                            {budgetUsage.hasBudget
                                ? t('budget_of', { percent: budgetUsage.percentLabel, budget: formatUsd(budget) })
                                : t('no_cap')}
                        </span>
                        <span>100%</span>
                    </div>

                    <div className={styles.advancedFinancialPopup}>
                        <h5>{t('cost_breakdown')}</h5>
                        {usage === 'loading' || !usage ? (
                            <div className={styles.popupRow}><span>{tc('loading')}</span></div>
                        ) : usage === 'error' ? (
                            <div className={styles.popupRow}><span>{t('load_costs_error')}</span></div>
                        ) : usage.models.length === 0 && !usage.imageGeneration.totalCost ? (
                            <div className={styles.popupRow}><span>{t('no_cost_yet')}</span></div>
                        ) : (
                            <>
                                {usage.models.map((m, index) => (
                                    <div
                                        className={styles.popupRow}
                                        key={`${m.model}-${m.class}-${m.nodeType ?? index}`}
                                    >
                                        <span>{m.model} ({formatAppNumber(m.count, lang)}x):</span>
                                        <span>${formatUsd(m.totalCost)}</span>
                                    </div>
                                ))}
                                {usage.imageGeneration.totalCost > 0 && (
                                    <div className={styles.popupRow}>
                                        <span>{t('image_gen_est')}</span>
                                        <span>${formatUsd(usage.imageGeneration.totalCost)}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.colDeadline}>
                <div className={styles.deadlineBlock}>
                    <span className={styles.dateLabel}>
                        <TbClock2 size={size} color={color} /> {t('deadline_colon', { date: deadlineLabel })}
                    </span>
                </div>
            </div>

            <div className={styles.colActions}>
                <div className={`${styles.actionButtons} ${styles.desktopOnlyActions}`}>
                    <button
                        type="button"
                        title={t('settings')}
                        onClick={onSettings}
                        className={styles.actionBtn}
                    >
                        <LuSettings size={size} color={color} />
                    </button>
                    {project.isOwner !== false && (
                        <button
                            type="button"
                            title={tc('delete')}
                            onClick={onDelete}
                            className={`${styles.actionBtn} ${styles.delete}`}
                        >
                            <CgTrashEmpty size={size} color={color} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className={styles.cyberOpenBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                    }}
                >
                    <span>{t('editor_tab')}</span>
                    <LuArrowUpRight />
                </button>
            </div>

            <div className={`${styles.cardFooter} ${styles.mobileOnlyFooter}`}>
                <div className={styles.deadlineBlock}>
                    <span className={styles.dateLabel}>
                        <TbClock2 size={size} color={color} /> {t('deadline_colon', { date: deadlineLabel })}
                    </span>
                </div>
                <div className={styles.footerLeftControls}>
                    <button
                        type="button"
                        className={styles.cyberOpenBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen();
                        }}
                    >
                        <span>{t('editor_tab')}</span>
                        <LuArrowUpRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
