'use client';

import { useMemo } from 'react';
import {useTranslation} from 'react-i18next';
import * as LuIcons from 'react-icons/lu';
import type { NodeCatalogEntry } from '../types/node-catalog';
import { STUDIO_TOOLBOX_INPUT_GROUP_LABEL_KEY } from '../lib/studio-toolbox-config';
import { catalogDescription, catalogLabel } from '@/app/lib/i18n/catalogLabel';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from '../[projectId]/project-view.module.scss';

const INPUT_NODE_TYPES = new Set(['prompt', 'assetRef']);

function CatalogIcon({ name }: { name?: string }) {
    const Icon = (LuIcons as Record<string, React.ComponentType<{ className?: string }>>)[name || 'LuBox'] ?? LuIcons.LuBox;
    return <Icon />;
}

interface NodeToolboxProps {
    catalog: NodeCatalogEntry[];
    searchQuery: string;
    onAddNode: (type: string, defaultData?: Record<string, unknown>) => void;
}

export function NodeToolbox({ catalog, searchQuery, onAddNode }: NodeToolboxProps) {
    const {t} = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter((n) =>
            n.type.toLowerCase().includes(q)
            || catalogLabel(n, lang).toLowerCase().includes(q)
            || n.label.toLowerCase().includes(q)
            || n.labelFa.toLowerCase().includes(q)
            || catalogDescription(n, lang).toLowerCase().includes(q)
            || (n.descriptionFa ?? '').toLowerCase().includes(q)
            || (n.description ?? '').toLowerCase().includes(q),
        );
    }, [catalog, searchQuery, lang]);

    const grouped = useMemo(() => {
        const map = new Map<string, NodeCatalogEntry[]>();
        for (const entry of filtered) {
            const cat = INPUT_NODE_TYPES.has(entry.type) ? 'inputs' : (entry.category || 'other');
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(entry);
        }
        return map;
    }, [filtered]);

    if (filtered.length === 0) {
        return <div className={styles.noToolboxResults}>{t('no_nodes_found')}</div>;
    }

    return (
        <>
            {[...grouped.entries()].map(([category, entries]) => (
                <div key={category} className={styles.accordionGroup}>
                    <div className={`${styles.groupHeader} ${styles.activeHeader}`}>
                        <strong>
                            {category === 'inputs'
                                ? t(STUDIO_TOOLBOX_INPUT_GROUP_LABEL_KEY)
                                : t(`category.${category}`)}
                        </strong>
                    </div>
                    <div className={styles.groupContent}>
                        {entries.map((entry) => (
                            <div
                                key={entry.type}
                                className={styles.actionItem}
                                onClick={() => onAddNode(entry.type, entry.defaultData)}
                            >
                                <span className={styles.actionIcon}><CatalogIcon name={entry.icon} /></span>
                                <div>
                                    <h4>{catalogLabel(entry, lang)}</h4>
                                    <p>{catalogDescription(entry, lang)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}
