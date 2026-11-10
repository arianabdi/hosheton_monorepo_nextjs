'use client';

import { useTranslation } from 'react-i18next';
import { LuSettings, LuTrash2 } from 'react-icons/lu';
import RowActionMenu from '@/app/components/common/RowActionMenu/RowActionMenu';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import type { MediaProject, MediaProjectPerson, ProjectUsageSummaryResponse } from '../types/media-api';
import { formatUsd, getBudgetUsage, getProjectIcon, resolveProjectSpentCost } from './project-list-utils';
import styles from './ProjectMobileItem.module.scss';

type Props = {
    project: MediaProject;
    usage?: ProjectUsageSummaryResponse | 'loading' | 'error';
    onOpen: () => void;
    onSettings: () => void;
    onDelete: () => void;
};

function PersonAvatar({ person }: { person: MediaProjectPerson }) {
    return person.avatar ? (
        <img src={person.avatar} alt="" className={styles.avatar} loading="lazy" />
    ) : (
        <span className={`${styles.avatar} ${styles.avatarFallback}`} aria-hidden>
            {person.initials || person.fullName.charAt(0)}
        </span>
    );
}

/** مبلغ دلاری همیشه چپ‌به‌راست ($7.5) تا در متن فارسی «7.5$» نشود */
function Usd({ value }: { value?: number | null }) {
    return <bdi dir="ltr">${formatUsd(value)}</bdi>;
}

/**
 * کارت پروژه در موبایل — هر عدد برچسب خودش را دارد تا معلوم باشد چیست:
 * سر کارت (نام، وضعیت، فضا، ⋯) / بودجه (مصرف از بودجه، مانده، نوار) /
 * خروجی‌های ساخته‌شده و گراف پروژه / مالک، اعضا و ددلاین.
 */
export function ProjectMobileItem({ project, usage, onOpen, onSettings, onDelete }: Props) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;
    const num = (value: number) => formatAppNumber(value, lang);

    const ProjectIcon = getProjectIcon(project.icon);
    const accent = project.color || '#7d38ff';
    const status = project.status || 'in_progress';
    const budget = project.budget ? project.budget : null;
    const totalCost = resolveProjectSpentCost(project, usage);
    // بودجه فقط برداشت از بودجهٔ خود پروژه را می‌شمارد؛ هزینهٔ کل جدا (پایین کارت) نشان داده می‌شود
    const budgetDrawn = project.budgetSpent ?? 0;
    const budgetUsage = getBudgetUsage(budgetDrawn, budget);
    const remaining = project.budgetRemaining ?? Math.max(0, (budget || 0) - budgetDrawn);
    const counts = project.generatedCounts || { image: 0, video: 0, audio: 0 };
    const members = project.members || [];
    const membersCount = project.membersCount ?? members.length;
    const deadline = project.deadline ? new Date(project.deadline) : null;
    const overdue = Boolean(deadline && status !== 'completed' && deadline.getTime() < Date.now());

    const actions = [
        { label: t('settings'), icon: <LuSettings size={15} />, onClick: onSettings },
        ...(project.isOwner !== false
            ? [{ label: tc('delete'), icon: <LuTrash2 size={15} />, onClick: onDelete, danger: true }]
            : []),
    ];

    return (
        <article
            className={styles.card}
            onClick={onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
        >
            <header className={styles.head}>
                <span className={styles.icon} style={{ color: accent, background: `${accent}24` }}>
                    <ProjectIcon size={18} />
                </span>
                <div className={styles.titleBlock}>
                    <h3 className={styles.title} dir="auto">{project.title}</h3>
                    <p className={styles.subline}>
                        <span className={`${styles.status} ${status === 'completed' ? styles.statusDone : ''}`}>
                            {status === 'completed' ? t('completed') : t('in_progress')}
                        </span>
                        <span className={styles.space}>{project.space?.name || t('unspecified')}</span>
                    </p>
                </div>
                <span onClick={(e) => e.stopPropagation()} className={styles.menu}>
                    <RowActionMenu items={actions} ariaLabel={t('card_actions', { title: project.title })} />
                </span>
            </header>

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <span className={styles.label}>{t('card_budget')}</span>
                    {budgetUsage.hasBudget ? (
                        <span className={styles.budgetTotal}><Usd value={budget} /></span>
                    ) : (
                        <span className={styles.muted}>{t('no_budget')}</span>
                    )}
                </div>
                {budgetUsage.hasBudget ? (
                    <>
                        <div className={styles.track} aria-hidden>
                            <span
                                className={`${styles.fill} ${budgetUsage.percent >= 90 ? styles.fillHigh : ''}`}
                                style={{ width: `${budgetUsage.widthPercent}%` }}
                            />
                        </div>
                        <div className={styles.budgetSplit}>
                            <span>
                                {t('card_spent')} <strong><Usd value={budgetDrawn} /></strong>
                            </span>
                            <span>
                                {t('card_left')}{' '}
                                <strong className={remaining <= 0 ? styles.out : styles.left}><Usd value={remaining} /></strong>
                            </span>
                        </div>
                    </>
                ) : null}
            </section>

            {/* اعداد پروژه — هر خانه: مقدار + برچسب */}
            <section className={styles.stats}>
                <div className={styles.stat}>
                    <strong>{num(counts.image)}</strong>
                    <span>{t('image')}</span>
                </div>
                <div className={styles.stat}>
                    <strong>{num(counts.video)}</strong>
                    <span>{t('video')}</span>
                </div>
                <div className={styles.stat}>
                    <strong>{num(counts.audio)}</strong>
                    <span>{t('audio')}</span>
                </div>
                <div className={styles.stat}>
                    <strong>{num(project.nodes?.length ?? 0)}</strong>
                    <span>{t('card_nodes')}</span>
                </div>
                <div className={styles.stat}>
                    <strong>{num(project.edges?.length ?? 0)}</strong>
                    <span>{t('card_edges')}</span>
                </div>
                <div className={styles.stat}>
                    <strong><Usd value={totalCost} /></strong>
                    <span>{t('card_total_cost')}</span>
                </div>
            </section>

            <dl className={styles.facts}>
                <div className={styles.fact}>
                    <dt>{t('card_owner')}</dt>
                    <dd>
                        {project.owner ? (
                            <span className={styles.person}>
                                <PersonAvatar person={project.owner} />
                                <span>{project.isOwner ? t('card_you') : project.owner.fullName}</span>
                            </span>
                        ) : '—'}
                    </dd>
                </div>
                <div className={styles.fact}>
                    <dt>{t('card_members')}</dt>
                    <dd>
                        {membersCount ? (
                            <span className={styles.person}>
                                <span className={styles.avatarStack}>
                                    {members.slice(0, 4).map((person) => (
                                        <PersonAvatar key={person._id} person={person} />
                                    ))}
                                </span>
                                <span>{t('card_members_n', { count: num(membersCount) })}</span>
                            </span>
                        ) : (
                            <span className={styles.muted}>{t('card_solo')}</span>
                        )}
                    </dd>
                </div>
                <div className={styles.fact}>
                    <dt>{t('card_deadline')}</dt>
                    <dd className={overdue ? styles.out : deadline ? '' : styles.muted}>
                        {deadline ? formatAppDate(project.deadline ?? undefined, lang) : t('card_no_deadline')}
                        {overdue ? ` · ${t('card_overdue')}` : ''}
                    </dd>
                </div>
            </dl>
        </article>
    );
}
