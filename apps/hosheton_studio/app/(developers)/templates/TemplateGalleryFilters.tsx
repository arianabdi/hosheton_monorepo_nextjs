'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type { MarketplaceExploreCategory, TemplateTagCategoryItem } from '@/app/(marketplace)/lib/types';
import type { MediaTemplateStatus, MediaWorkflowTemplate } from '@/app/(developers)/projects/types/media-api';
import { FilterMultiSelect } from './FilterMultiSelect';
import styles from './TemplateGallery.module.scss';

export type GallerySort = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'views' | 'usage';
export type PaidFilter = 'paid' | 'free';
export type KindFilter = 'workflow' | 'prompt';
export type StatusFilter = MediaTemplateStatus;
/** فقط ادمین: 'self' = حساب واقعی خودم، 'personas' = همهٔ کاربران نمایشی، وگرنه شناسهٔ یک کاربر نمایشی */
export type PublisherFilter = 'self' | 'personas' | string;

export type GalleryFilters = {
    sort: GallerySort;
    tags: string[];
    categories: string[];
    kind: KindFilter[];
    paid: PaidFilter[];
    status: StatusFilter[];
    publishers: PublisherFilter[];
};

export const DEFAULT_GALLERY_FILTERS: GalleryFilters = {
    sort: 'newest',
    tags: [],
    categories: [],
    kind: [],
    paid: [],
    status: [],
    publishers: [],
};

type Props = {
    templates: MediaWorkflowTemplate[];
    filters: GalleryFilters;
    onChange: (next: GalleryFilters) => void;
    showDraftStatus: boolean;
    /** فقط ادمین (قالب‌های من / در حال بررسی): فیلتر منتشرکننده */
    showPublisher?: boolean;
};

function statusOf(item: MediaWorkflowTemplate): MediaTemplateStatus {
    return item.status || 'approved';
}

function timeValue(item: MediaWorkflowTemplate) {
    return Date.parse(item.createdAt || item.updatedAt || '') || 0;
}

export function applyGalleryFilters(items: MediaWorkflowTemplate[], filters: GalleryFilters, search: string) {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
        if (query) {
            const haystack = [
                item.title,
                item.description,
                item.kind,
                ...(item.aiModels || []),
                ...(item.tags || []),
                // فقط ادمین: جستجو با نام کاربر نمایشی
                item.persona?.fullName,
                item.persona?.username,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        if (filters.tags.length && !filters.tags.every((tag) => (item.tags || []).includes(tag))) {
            return false;
        }
        if (filters.categories.length) {
            const ids = [
                ...(item.categoryIds || []),
                ...(item.publishedSnapshot?.categoryIds || []),
            ].map(String);
            if (!filters.categories.some((id) => ids.includes(id))) return false;
        }
        if (filters.kind.length && !filters.kind.includes((item.kind === 'prompt' ? 'prompt' : 'workflow'))) {
            return false;
        }
        const price = item.price ?? 0;
        if (filters.paid.length) {
            const matchesPaid = filters.paid.includes('paid') && price > 0;
            const matchesFree = filters.paid.includes('free') && price <= 0;
            if (!matchesPaid && !matchesFree) return false;
        }
        if (filters.status.length && !filters.status.includes(statusOf(item))) return false;
        if (filters.publishers.length) {
            const personaId = item.persona?._id;
            const matches = personaId
                ? filters.publishers.includes('personas') || filters.publishers.includes(personaId)
                : filters.publishers.includes('self');
            if (!matches) return false;
        }
        return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
        switch (filters.sort) {
            case 'oldest':
                return timeValue(a) - timeValue(b);
            case 'price_high':
                return (b.price ?? 0) - (a.price ?? 0);
            case 'price_low':
                return (a.price ?? 0) - (b.price ?? 0);
            case 'views':
                return (b.viewCount ?? 0) - (a.viewCount ?? 0);
            case 'usage':
                return (b.usageCount ?? 0) - (a.usageCount ?? 0);
            default:
                return timeValue(b) - timeValue(a);
        }
    });
    return sorted;
}

export default function TemplateGalleryFilters({ templates, filters, onChange, showDraftStatus, showPublisher = false }: Props) {
    const { t } = useTranslation('templates');
    const { t: tTag } = useTranslation('templateTags');
    const [tagCatalog, setTagCatalog] = useState<TemplateTagCategoryItem[]>([]);
    const [categories, setCategories] = useState<MarketplaceExploreCategory[]>([]);

    useEffect(() => {
        marketplaceApi.listTemplateTags()
            .then((data) => setTagCatalog(data.tags || []))
            .catch(() => setTagCatalog([]));
        marketplaceApi.listCategories()
            .then((data) => setCategories(data.categories || []))
            .catch(() => setCategories([]));
    }, []);

    const tagLabel = (key: string) => tTag(key, { defaultValue: key });

    const patch = (partial: Partial<GalleryFilters>) => onChange({ ...filters, ...partial });

    const hasActive =
        filters.sort !== 'newest'
        || filters.tags.length > 0
        || filters.categories.length > 0
        || filters.kind.length > 0
        || filters.paid.length > 0
        || filters.status.length > 0
        || filters.publishers.length > 0;

    const statusOptions = [
        ...(showDraftStatus ? [{ value: 'draft' as const, label: t('draft') }] : []),
        { value: 'pending' as const, label: t('filter_pending') },
        { value: 'approved' as const, label: t('approved') },
        { value: 'rejected' as const, label: t('rejected') },
    ];

    // کاربران نمایشی‌ای که در همین فهرست قالب دارند (persona را API فقط برای ادمین می‌فرستد)
    const personaOptions = [...new Map(
        templates.flatMap((item) => (item.persona ? [[item.persona._id, item.persona.fullName || item.persona.username] as const] : [])),
    ).entries()].map(([value, label]) => ({ value, label }));
    const publisherOptions = [
        { value: 'self', label: t('publisher_self', { defaultValue: 'خودم (حساب واقعی)' }) },
        { value: 'personas', label: t('publisher_filter_all_personas', { defaultValue: 'همهٔ کاربران نمایشی' }) },
        ...personaOptions,
    ];

    return (
        <div className={styles.filterSection}>
            <div className={styles.filterHeader}>
                <span>{t('sort')}</span>
            </div>
            <select
                className={styles.filterSelect}
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as GallerySort })}
                aria-label={t('sort')}
            >
                <option value="newest">{t('sort_newest')}</option>
                <option value="oldest">{t('sort_oldest')}</option>
                <option value="price_high">{t('sort_price_high')}</option>
                <option value="price_low">{t('sort_price_low')}</option>
                <option value="views">{t('sort_views')}</option>
                <option value="usage">{t('sort_usage')}</option>
            </select>

            <div className={styles.filterHeader}>
                <span>{t('tags')}</span>
            </div>
            <FilterMultiSelect
                searchable
                values={filters.tags}
                options={tagCatalog.map((item) => ({ value: item.key, label: tagLabel(item.key) }))}
                onChange={(tags) => patch({ tags })}
                placeholder={t('tags_filter_ph')}
                emptyLabel={t('tags_no_match')}
            />

            <div className={styles.filterHeader}>
                <span>{t('filter_subject')}</span>
            </div>
            <FilterMultiSelect
                searchable
                values={filters.categories}
                options={categories.map((item) => ({ value: item._id, label: item.name }))}
                onChange={(next) => patch({ categories: next })}
                placeholder={t('all')}
                emptyLabel={t('tags_no_match')}
            />

            <div className={styles.filterHeader}>
                <span>{t('filter_kind')}</span>
            </div>
            <FilterMultiSelect
                values={filters.kind}
                options={[
                    { value: 'workflow', label: t('kind_workflow_short') },
                    { value: 'prompt', label: t('kind_prompt_short') },
                ]}
                onChange={(kind) => patch({ kind: kind as KindFilter[] })}
                placeholder={t('all')}
            />

            <div className={styles.filterHeader}>
                <span>{t('filter_paid')}</span>
            </div>
            <FilterMultiSelect
                values={filters.paid}
                options={[
                    { value: 'paid', label: t('paid') },
                    { value: 'free', label: t('free') },
                ]}
                onChange={(paid) => patch({ paid: paid as PaidFilter[] })}
                placeholder={t('all')}
            />

            <div className={styles.filterHeader}>
                <span>{t('filter_status')}</span>
            </div>
            <FilterMultiSelect
                values={filters.status}
                options={statusOptions}
                onChange={(status) => patch({ status: status as StatusFilter[] })}
                placeholder={t('all')}
            />

            {showPublisher ? (
                <>
                    <div className={styles.filterHeader}>
                        <span>
                            {t('publisher_label', { defaultValue: 'منتشرکننده' })}
                            <small> · {t('publisher_staff_only', { defaultValue: 'فقط ادمین' })}</small>
                        </span>
                    </div>
                    <FilterMultiSelect
                        searchable
                        values={filters.publishers}
                        options={publisherOptions}
                        onChange={(publishers) => patch({ publishers })}
                        placeholder={t('all')}
                        emptyLabel={t('tags_no_match')}
                    />
                </>
            ) : null}

            <button
                type="button"
                className={styles.clearBtn}
                disabled={!hasActive}
                onClick={() => onChange(DEFAULT_GALLERY_FILTERS)}
            >
                {t('clear_filters')}
            </button>
        </div>
    );
}
