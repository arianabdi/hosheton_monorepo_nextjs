'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MdOutlineInfo } from 'react-icons/md';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import styles from './ProjectInfo.module.scss';
import { mediaApi } from '../../../lib/media-api';
import type { MediaProject, MediaProjectStatus, MediaSpace } from '../../../types/media-api';
import { PROJECT_ICON_OPTIONS, PROJECT_COLOR_OPTIONS } from '../../../components/MediaProjectList';
import { SpaceManager } from '../../../components/SpaceManager';
import { ProjectBudgetPanel } from '../../../components/ProjectBudgetPanel';

export default function MediaProjectInfoSettings() {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const { projectId } = useParams<{ projectId: string }>();
    const router = useRouter();

    const [project, setProject] = useState<MediaProject | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [status, setStatus] = useState<MediaProjectStatus>('in_progress');
    const [icon, setIcon] = useState('');
    const [color, setColor] = useState('');
    const [spaces, setSpaces] = useState<MediaSpace[]>([]);
    const [spaceId, setSpaceId] = useState('');

    const loadSpaces = useCallback(async () => {
        try {
            const data = await mediaApi.listSpaces();
            setSpaces(data.spaces ?? []);
        } catch {
            // non-blocking
        }
    }, []);

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { project: p } = await mediaApi.getProject(projectId);
            setProject(p);
            setTitle(p.title || '');
            setDescription(p.description || '');
            setDeadline(p.deadline ? p.deadline.slice(0, 10) : '');
            setStatus(p.status || 'in_progress');
            setIcon(p.icon || '');
            setColor(p.color || PROJECT_COLOR_OPTIONS[0]);
            setSpaceId(p.spaceId || p.space?._id || '');
            setCanManage(Boolean(p.canManage ?? p.isOwner));
        } catch (err) {
            notifyError(err, { fallback: t('settings_load_error') });
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadSpaces(); }, [loadSpaces]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || saving) return;
        setSaving(true);
        setSaved(false);
        try {
            const updated = await mediaApi.updateProjectSettings(projectId, {
                title: title.trim(),
                description: description.trim(),
                deadline: deadline || null,
                status,
                icon,
                color,
                spaceId: spaceId || null,
            });
            setProject(updated);
            setSaved(true);
            SuccessToaster({ message: t('settings_saved') });
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            notifyError(err, { fallback: t('settings_save_error') });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!projectId) return;
        if (!confirm(t('delete_forever', { title: project?.title }))) return;
        try {
            await mediaApi.deleteProject(projectId);
            SuccessToaster({ message: t('deleted') });
            router.push('/studio/media');
        } catch (err) {
            notifyError(err, { fallback: t('delete_error') });
        }
    };

    if (loading) {
        return <p style={{ opacity: 0.6 }}>{tc('loading')}</p>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerIcon}>
                    <MdOutlineInfo size={28} />
                </div>
                <div className={styles.headerText}>
                    <h2>{t('info')}</h2>
                    <p>{t('info_lead')}</p>
                </div>
            </div>

            <hr className={styles.divider} />

            {!canManage && (
                <div className={styles.readonlyNotice}>
                    {t('member_readonly')}
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.group}>
                    <label>{t('name_label')}</label>
                    <input
                        className={styles.input}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!canManage}
                        required
                    />
                </div>

                <div className={styles.group}>
                    <label>{tc('description')}</label>
                    <textarea
                        className={styles.textarea}
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canManage}
                    />
                </div>

                <div className={styles.group}>
                    <label>{t('workspace')}</label>
                    {!project?.spaceId && !project?.space && (
                        <p className={styles.spaceNotice}>
                            {t('no_space_notice')}
                        </p>
                    )}
                    <div className={styles.spaceRow}>
                        <select
                            className={styles.input}
                            value={spaceId}
                            onChange={(e) => setSpaceId(e.target.value)}
                            disabled={!canManage}
                        >
                            <option value="">{t('no_space')}</option>
                            {spaces.map((space) => (
                                <option key={space._id} value={space._id}>
                                    {space.name}
                                </option>
                            ))}
                        </select>
                        {canManage && (
                            <SpaceManager spaces={spaces} onSpacesChange={loadSpaces} />
                        )}
                    </div>
                    {spaceId && spaces.find((s) => s._id === spaceId)?.description ? (
                        <span className={styles.fieldHint}>
                            {spaces.find((s) => s._id === spaceId)?.description}
                        </span>
                    ) : null}
                </div>

                <div className={styles.grid2}>
                    <div className={styles.group}>
                        <label>{t('deadline')}</label>
                        <input
                            className={styles.input}
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            disabled={!canManage}
                        />
                    </div>
                </div>

                <ProjectBudgetPanel projectId={String(projectId)} />

                <div className={styles.group}>
                    <label>{t('project_status')}</label>
                    <div className={styles.statusToggle}>
                        <button
                            type="button"
                            className={`${styles.statusOption} ${status === 'in_progress' ? styles.statusOptionActive : ''}`}
                            onClick={() => canManage && setStatus('in_progress')}
                            disabled={!canManage}
                        >
                            {t('in_progress')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.statusOption} ${status === 'completed' ? styles.statusOptionActive : ''}`}
                            onClick={() => canManage && setStatus('completed')}
                            disabled={!canManage}
                        >
                            {t('completed')}
                        </button>
                    </div>
                </div>

                <div className={styles.group}>
                    <label>{t('project_icon')}</label>
                    <div className={styles.iconPickerGrid}>
                        {PROJECT_ICON_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`${styles.iconDot} ${icon === opt.key ? styles.iconDotActive : ''}`}
                                title={t(opt.label)}
                                onClick={() => canManage && setIcon(opt.key)}
                                disabled={!canManage}
                            >
                                <opt.Icon size={18} color={icon === opt.key ? color : undefined} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.group}>
                    <label>{t('project_color')}</label>
                    <div className={styles.colorPickerGrid}>
                        {PROJECT_COLOR_OPTIONS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={`${styles.colorDot} ${color === c ? styles.colorDotActive : ''}`}
                                style={{ backgroundColor: c }}
                                title={c}
                                onClick={() => canManage && setColor(c)}
                                disabled={!canManage}
                            />
                        ))}
                    </div>
                </div>

                {canManage && (
                    <div className={styles.saveRow}>
                        <button type="submit" className={styles.submitBtn} disabled={saving}>
                            {saving ? tc('saving') : t('save_changes')}
                        </button>
                        {saved && <span className={styles.saveHint}>{t('saved_check')}</span>}
                    </div>
                )}
            </form>

            {canManage && (
                <>
                    <hr className={styles.divider} />
                    <div className={styles.dangerZone}>
                        <div>
                            <h4>{t('delete_project')}</h4>
                            <p>{t('delete_project_body')}</p>
                        </div>
                        <button type="button" className={styles.dangerBtn} onClick={handleDelete}>
                            {t('delete_project')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
