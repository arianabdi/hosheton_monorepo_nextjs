'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuSearch, LuX, LuDownload, LuLoader } from 'react-icons/lu';
import type { FlowTemplate } from '../[projectId]/types/studio';
import { mediaApi } from '../lib/media-api';
import { getApiErrorMessage } from '../lib/api-client';
import type { MediaWorkflowTemplate } from '../types/media-api';
import { catalogLabel } from '@/app/lib/i18n/catalogLabel';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './TemplatesModal.module.scss';

interface TemplatesModalProps {
    open: boolean;
    onClose: () => void;
    templates: FlowTemplate[];
    activeTemplateId: string | null;
    templateIcons: Record<string, ReactNode>;
    onSelect: (templateId: string) => void;
    /** Imports a marketplace/community workflow template into the current canvas (merge, not replace) */
    onImportTemplate?: (templateId: string) => Promise<void> | void;
}

export function TemplatesModal({
    open,
    onClose,
    templates,
    activeTemplateId,
    templateIcons,
    onSelect,
    onImportTemplate,
}: TemplatesModalProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    const [searchQuery, setSearchQuery] = useState('');
    const [tab, setTab] = useState<'presets' | 'marketplace'>('presets');
    const [marketplace, setMarketplace] = useState<MediaWorkflowTemplate[]>([]);
    const [loadingMarketplace, setLoadingMarketplace] = useState(false);
    const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
    const [importingId, setImportingId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) { setSearchQuery(''); setTab('presets'); }
    }, [open]);

    useEffect(() => {
        if (!open || tab !== 'marketplace' || !onImportTemplate) return;
        setLoadingMarketplace(true);
        setMarketplaceError(null);
        mediaApi.listMarketplaceTemplates()
            .then((res) => setMarketplace(res.templates ?? []))
            .catch((err) => setMarketplaceError(getApiErrorMessage(err, t('load_public_templates_error'))))
            .finally(() => setLoadingMarketplace(false));
    }, [open, tab, onImportTemplate, t]);

    const filteredTemplates = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return templates;
        return templates.filter((tpl) =>
            catalogLabel({ label: tpl.name, labelFa: tpl.nameFa }, lang).toLowerCase().includes(q)
            || tpl.nameFa.toLowerCase().includes(q)
            || tpl.description.toLowerCase().includes(q)
            || tpl.id.toLowerCase().includes(q)
            || tpl.name.toLowerCase().includes(q),
        );
    }, [templates, searchQuery, lang]);

    const filteredMarketplace = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return marketplace;
        return marketplace.filter((tpl) =>
            tpl.title.toLowerCase().includes(q) || (tpl.description || '').toLowerCase().includes(q),
        );
    }, [marketplace, searchQuery]);

    const handleImport = async (templateId: string) => {
        if (!onImportTemplate || importingId) return;
        setImportingId(templateId);
        try {
            await onImportTemplate(templateId);
            onClose();
        } catch (err) {
            setMarketplaceError(getApiErrorMessage(err, t('load_template_error')));
        } finally {
            setImportingId(null);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{tab === 'presets' ? t('ready_templates') : t('community_templates')}</h2>
                    <button type="button" onClick={onClose} aria-label={tc('close')}><LuX /></button>
                </div>

                {onImportTemplate && (
                    <div className={styles.tabRow}>
                        <button
                            type="button"
                            className={tab === 'presets' ? styles.tabActive : ''}
                            onClick={() => setTab('presets')}
                        >
                            {t('ready_templates')}
                        </button>
                        <button
                            type="button"
                            className={tab === 'marketplace' ? styles.tabActive : ''}
                            onClick={() => setTab('marketplace')}
                        >
                            {t('public_templates')}
                        </button>
                    </div>
                )}

                <div className={styles.searchRow}>
                    <LuSearch />
                    <input
                        type="search"
                        placeholder={t('search_template')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {tab === 'presets' ? (
                    <div className={styles.modalBody}>
                        {filteredTemplates.length === 0 && (
                            <p className={styles.emptySearch}>{t('no_template_match')}</p>
                        )}
                        {filteredTemplates.map((tpl) => (
                            <div
                                key={tpl.id}
                                className={`${styles.templateCard} ${activeTemplateId === tpl.id ? styles.active : ''}`}
                                onClick={() => {
                                    onSelect(tpl.id);
                                    onClose();
                                }}
                            >
                                <span className={styles.icon}>{templateIcons[tpl.id]}</span>
                                <div>
                                    <h4>{catalogLabel({ label: tpl.name, labelFa: tpl.nameFa }, lang)}</h4>
                                    <p>{tpl.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.modalBody}>
                        {marketplaceError && <p className={styles.emptySearch}>{marketplaceError}</p>}
                        {loadingMarketplace && <p className={styles.emptySearch}>{tc('loading')}</p>}
                        {!loadingMarketplace && filteredMarketplace.length === 0 && !marketplaceError && (
                            <p className={styles.emptySearch}>{t('no_public_templates')}</p>
                        )}
                        {filteredMarketplace.map((tpl) => (
                            <div key={tpl._id} className={styles.templateCard}>
                                <span className={styles.icon}><LuDownload /></span>
                                <div style={{ flex: 1 }}>
                                    <h4>{tpl.title}</h4>
                                    <p>{tpl.description || t('no_desc')}</p>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                        {t('used_n', { count: tpl.usageCount ?? 0 })}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleImport(tpl._id); }}
                                    disabled={importingId === tpl._id}
                                    className={styles.importBtn}
                                >
                                    {importingId === tpl._id ? <LuLoader className={styles.spinIcon} /> : <LuDownload />}
                                    {t('import_template')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
