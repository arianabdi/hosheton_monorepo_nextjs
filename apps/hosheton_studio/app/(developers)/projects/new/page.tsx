'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
    LuArrowRight,
    LuCalendarDays,
    LuDollarSign,
    LuFileText,
    LuFolderOpen,
    LuLayers,
    LuSparkles,
} from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import type { MediaSpace, MediaWorkflowTemplate } from '../types/media-api';
import { SpaceManager } from '../components/SpaceManager';
import styles from './CreateProjectPage.module.scss';
import pageStyles from '../ProjectsPage.module.scss';

export default function CreateProjectPage() {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const lang = i18n.language;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableTemplates, setAvailableTemplates] = useState<MediaWorkflowTemplate[]>([]);
    const [spaces, setSpaces] = useState<MediaSpace[]>([]);

    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newSpaceId, setNewSpaceId] = useState('');
    const [newBudget, setNewBudget] = useState('');
    const [newDeadline, setNewDeadline] = useState('');
    const [startFromTemplateId, setStartFromTemplateId] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [mine, marketplace, spacesRes] = await Promise.all([
                    mediaApi.listMyTemplates(),
                    mediaApi.listMarketplaceTemplates(),
                    mediaApi.listSpaces(),
                ]);
                const merged = [...(mine.templates ?? [])];
                for (const tpl of marketplace.templates ?? []) {
                    if (!merged.some((item) => item._id === tpl._id)) merged.push(tpl);
                }
                setAvailableTemplates(merged);

                const loadedSpaces = spacesRes.spaces ?? [];
                setSpaces(loadedSpaces);
                if (loadedSpaces.length === 1) {
                    setNewSpaceId(loadedSpaces[0]._id);
                }
            } catch {
                // Non-critical — user can still create blank project
            }
        })();
    }, []);

    const fetchSpaces = async () => {
        try {
            const data = await mediaApi.listSpaces();
            const loadedSpaces = data.spaces ?? [];
            setSpaces(loadedSpaces);
            setNewSpaceId((prev) => prev || (loadedSpaces.length === 1 ? loadedSpaces[0]._id : ''));
        } catch {
            // ignore
        }
    };

    const templateOptions = useMemo(
        () => availableTemplates.map((tpl) => ({
            id: tpl._id,
            label: `${tpl.title}${tpl.visibility === 'public' ? t('public_suffix') : ''}`,
            nodes: tpl.nodes?.length ?? 0,
            edges: tpl.edges?.length ?? 0,
        })),
        [availableTemplates, t],
    );

    const selectedTemplate = templateOptions.find((tpl) => tpl.id === startFromTemplateId);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newSpaceId || submitting) return;

        setSubmitting(true);
        setError(null);
        try {
            const project = await mediaApi.createProject({
                title: newName.trim(),
                description: newDesc.trim(),
                spaceId: newSpaceId,
                ...(newBudget.trim() ? { budget: Number(newBudget) } : {}),
                ...(newDeadline ? { deadline: newDeadline } : {}),
                ...(startFromTemplateId
                    ? { templateId: startFromTemplateId }
                    : { nodes: [], edges: [] }),
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('create_error')));
            setSubmitting(false);
        }
    };

    return (
        <div className={`${pageStyles.container} ${pageStyles.rtl} ${iransansxvf.className}`}>
            <Link href="/projects" className={styles.backLink}>
                <LuArrowRight size={18} />
                {t('back_to_list')}
            </Link>

            <header className={pageStyles.header}>
                <h1 className={pageStyles.mainTitle}>{t('create_title')}</h1>
                <p className={pageStyles.subtitle}>
                    {t('create_lead')}
                </p>
            </header>

            {error && <div className={pageStyles.errorBanner}>{error}</div>}

            <form onSubmit={handleCreateProject} className={styles.form}>
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}><LuFileText size={20} /></div>
                        <div>
                            <h2>{t('basics')}</h2>
                            <p>{t('basics_desc')}</p>
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="project-name">{t('name_label')} <span className={styles.required}>*</span></label>
                        <input
                            id="project-name"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t('name_placeholder')}
                            required
                            disabled={submitting}
                        />
                        <span className={styles.fieldHint}>
                            {t('name_hint')}
                        </span>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="project-desc">{t('goals')}</label>
                        <textarea
                            id="project-desc"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            rows={4}
                            placeholder={t('goals_placeholder')}
                            disabled={submitting}
                        />
                        <span className={styles.fieldHint}>
                            {t('goals_hint')}
                        </span>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}><LuFolderOpen size={20} /></div>
                        <div>
                            <h2>{t('workspace')}</h2>
                            <p>{t('workspace_desc')}</p>
                        </div>
                    </div>

                    <div className={styles.spaceToolbar}>
                        <SpaceManager spaces={spaces} onSpacesChange={fetchSpaces} />
                    </div>

                    {spaces.length === 0 ? (
                        <div className={styles.infoCard}>
                            <strong>{t('need_space')}</strong>
                            <p>
                                {t('need_space_body')}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.fieldGroup}>
                            <label htmlFor="project-space">
                                {t('project_space')} <span className={styles.required}>*</span>
                            </label>
                            <select
                                id="project-space"
                                value={newSpaceId}
                                onChange={(e) => setNewSpaceId(e.target.value)}
                                disabled={submitting}
                                required
                            >
                                <option value="">{t('select_space')}</option>
                                {spaces.map((space) => (
                                    <option key={space._id} value={space._id}>
                                        {space.name}
                                        {space.description ? ` — ${space.description}` : ''}
                                    </option>
                                ))}
                            </select>
                            <span className={styles.fieldHint}>
                                {t('space_hint')}
                            </span>
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}><LuDollarSign size={20} /></div>
                        <div>
                            <h2>{t('finance')}</h2>
                            <p>{t('finance_desc')}</p>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <strong>{t('why_budget')}</strong>
                        <p>
                            {t('why_budget_body')}
                        </p>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="project-budget">{t('budget_usd')}</label>
                        <input
                            id="project-budget"
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={t('budget_placeholder')}
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                            disabled={submitting}
                        />
                        <span className={styles.fieldHint}>
                            {t('budget_hint')}
                        </span>
                        {Number(newBudget) > 0 && (
                            <span className={`${styles.fieldHint} ${styles.walletNote}`}>
                                {t('budget_wallet_note')}
                            </span>
                        )}
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}><LuCalendarDays size={20} /></div>
                        <div>
                            <h2>{t('schedule')}</h2>
                            <p>{t('schedule_desc')}</p>
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="project-deadline">{t('deadline')}</label>
                        <input
                            id="project-deadline"
                            type="date"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            disabled={submitting}
                        />
                        <span className={styles.fieldHint}>
                            {t('deadline_hint')}
                        </span>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}><LuLayers size={20} /></div>
                        <div>
                            <h2>{t('start_point')}</h2>
                            <p>{t('start_point_desc')}</p>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <strong>{t('start_diff')}</strong>
                        <ul>
                            <li><strong>{t('start_blank')}</strong>{t('start_blank_body')}</li>
                            <li><strong>{t('start_tpl')}</strong>{t('start_tpl_body')}</li>
                        </ul>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="project-template">{t('start_template')}</label>
                        <select
                            id="project-template"
                            value={startFromTemplateId}
                            onChange={(e) => setStartFromTemplateId(e.target.value)}
                            disabled={submitting}
                        >
                            <option value="">{t('blank_option')}</option>
                            {templateOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {t('template_meta', {
                                        label: opt.label,
                                        nodes: formatAppNumber(opt.nodes, lang),
                                        edges: formatAppNumber(opt.edges, lang),
                                    })}
                                </option>
                            ))}
                        </select>
                        {selectedTemplate && (
                            <span className={styles.templatePreview}>
                                <LuSparkles size={14} />
                                {t('template_preview', {
                                    nodes: formatAppNumber(selectedTemplate.nodes, lang),
                                    edges: formatAppNumber(selectedTemplate.edges, lang),
                                })}
                            </span>
                        )}
                        <span className={styles.fieldHint}>
                            {t('template_hint')}
                        </span>
                    </div>
                </section>

                <div className={styles.formActions}>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={submitting || !newName.trim() || !newSpaceId}
                    >
                        {submitting ? t('creating_project') : t('create_and_open')}
                    </button>
                    <Link href="/projects" className={styles.cancelBtn}>
                        {tc('cancel')}
                    </Link>
                </div>
            </form>
        </div>
    );
}
