'use client';

import { useTranslation } from 'react-i18next';
import {
    LuClapperboard,
    LuCode,
    LuSave,
    LuSettings2,
    LuSlidersHorizontal,
    LuWandSparkles,
} from 'react-icons/lu';
import type { AdsCutFull, AdsProject } from '../lib/ads-video-api';
import { stageSizeLabel } from '../lib/cut-runtime';
import styles from '../AdsVideo.module.scss';

const ASPECT_OPTIONS = ['16:9', '9:16', '1:1'];

export interface ClipSettingsPanelProps {
    project: AdsProject;
    cut: AdsCutFull | null;
    busyCut: boolean;
    generating: boolean;
    codeDraft: string;
    editPrompt: string;
    previewVersion: number | null;
    onCodeDraftChange(value: string): void;
    onEditPromptChange(value: string): void;
    onPreviewVersionChange(version: number): void;
    onActivateVersion(): void;
    onPatchCutMeta(patch: { title?: string; durationSeconds?: number }): void;
    onPatchProject(patch: { title?: string; aspectRatio?: string; fps?: number }): void;
    onApplyAiEdit(): void;
    onSaveCode(): void;
    onOpenSaveTemplate(): void;
}

/**
 * تب «تنظیمات» — همان تنظیماتی که قبل از این زیر ویدیو بود (عنوان/طول کات،
 * نسخه‌ها، ویرایش AI، کد، صداگذاری) به‌علاوه‌ی تنظیمات کلی پروژه (نسبت تصویر، fps).
 */
export function ClipSettingsPanel({
    project,
    cut,
    busyCut,
    generating,
    codeDraft,
    editPrompt,
    previewVersion,
    onCodeDraftChange,
    onEditPromptChange,
    onPreviewVersionChange,
    onActivateVersion,
    onPatchCutMeta,
    onPatchProject,
    onApplyAiEdit,
    onSaveCode,
    onOpenSaveTemplate,
}: ClipSettingsPanelProps) {
    const { t } = useTranslation('adsVideo');
    const activeVersion = previewVersion ?? cut?.currentVersion ?? 1;
    const totalVersions = cut?.versions?.length || 0;

    return (
        <div className={styles.clipSettings}>
            <section className={styles.clipSection}>
                <h4><LuSettings2 size={13} />{t('settings_project_title')}</h4>
                <label className={styles.field}>
                    {t('settings_project_name')}
                    <input
                        defaultValue={project.title}
                        key={`p-title-${project._id}-${project.title}`}
                        onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && value !== project.title) onPatchProject({ title: value });
                        }}
                    />
                </label>
                <div className={styles.fieldRow}>
                    <label className={styles.field}>
                        {t('settings_aspect')}
                        <select
                            value={project.aspectRatio || '16:9'}
                            onChange={(e) => onPatchProject({ aspectRatio: e.target.value })}
                        >
                            {ASPECT_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option} — {stageSizeLabel(option)}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        {t('settings_fps')}
                        <input
                            type="number"
                            min={10}
                            max={60}
                            defaultValue={project.fps || 30}
                            key={`p-fps-${project._id}-${project.fps}`}
                            onBlur={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 10 && value <= 60 && value !== (project.fps || 30)) onPatchProject({ fps: value });
                            }}
                        />
                    </label>
                </div>
            </section>

            {cut ? (
                <>
                    <section className={styles.clipSection}>
                        <h4><LuClapperboard size={13} />{t('settings_cut_title')}</h4>
                        <label className={styles.field}>
                            {t('cut_name_label')}
                            <input
                                defaultValue={cut.title}
                                key={`c-title-${cut._id}-${cut.title}`}
                                onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    if (value && value !== cut.title) onPatchCutMeta({ title: value });
                                }}
                            />
                        </label>
                        <label className={styles.field}>
                            {t('duration_label')}
                            <input
                                type="number"
                                min={1}
                                max={120}
                                defaultValue={cut.durationSeconds}
                                key={`c-dur-${cut._id}-${cut.durationSeconds}`}
                                onBlur={(e) => {
                                    const value = Number(e.target.value);
                                    if (value >= 1 && value <= 120 && value !== cut.durationSeconds) {
                                        onPatchCutMeta({ durationSeconds: value });
                                    }
                                }}
                            />
                        </label>
                        <button type="button" className={styles.ghostBtn} onClick={onOpenSaveTemplate}>
                            <LuSave size={12} />
                            {t('save_as_template')}
                        </button>
                    </section>

                    <section className={styles.clipSection}>
                        <h4><LuSlidersHorizontal size={13} />{t('settings_versions')}</h4>
                        <div className={styles.versionNav}>
                            <select
                                value={activeVersion}
                                onChange={(e) => onPreviewVersionChange(Number(e.target.value))}
                                aria-label={t('version_of', { current: activeVersion, total: totalVersions })}
                            >
                                {(cut.versions || []).map((version) => (
                                    <option key={version.version} value={version.version}>
                                        v{version.version}{version.version === cut.currentVersion ? t('version_current') : ''} — {(version.prompt || '').slice(0, 40) || t('version_no_desc')}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                disabled={previewVersion === cut.currentVersion || busyCut}
                                onClick={onActivateVersion}
                            >
                                {t('activate_version')}
                            </button>
                        </div>
                        {previewVersion != null && previewVersion !== cut.currentVersion && (
                            <em className={styles.versionPreviewNote}>{t('version_preview_note')}</em>
                        )}
                    </section>

                    <section className={styles.clipSection}>
                        <h4><LuWandSparkles size={13} />{t('tab_ai')}</h4>
                        <textarea
                            className={styles.sectionTextarea}
                            value={editPrompt}
                            onChange={(e) => onEditPromptChange(e.target.value)}
                            rows={3}
                            placeholder={t('ai_edit_placeholder')}
                        />
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={generating || !editPrompt.trim()}
                            onClick={onApplyAiEdit}
                        >
                            {generating ? <LuWandSparkles size={13} className={styles.spin} /> : <LuWandSparkles size={13} />}
                            {t('apply_ai')}
                        </button>
                    </section>

                    <section className={styles.clipSection}>
                        <h4><LuCode size={13} />{t('tab_code')}</h4>
                        <textarea
                            className={styles.codeBoxInline}
                            value={codeDraft}
                            onChange={(e) => onCodeDraftChange(e.target.value)}
                            spellCheck={false}
                            dir="ltr"
                        />
                        <div className={styles.codeActions}>
                            <span>{t('code_hint')}</span>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={busyCut || !codeDraft.trim()}
                                onClick={onSaveCode}
                            >
                                <LuSave size={12} />
                                {t('save_version')}
                            </button>
                        </div>
                    </section>
                </>
            ) : (
                <div className={styles.panelEmpty}>{t('stage_empty')}</div>
            )}
        </div>
    );
}

export default ClipSettingsPanel;
