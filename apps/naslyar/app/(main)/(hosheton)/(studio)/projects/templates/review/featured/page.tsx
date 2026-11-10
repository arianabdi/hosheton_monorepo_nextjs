'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LuArrowDown, LuArrowUp, LuCheck, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { templateReviewApi, type MediaWorkflowTemplate } from '../../../../lib/template-review-api';
import { getCoverMedia, mediaThumbSrc } from '../../../../lib/template-media';
import styles from '../../../../projects/nodes/Providers.module.scss';
import localStyles from '../TemplateForm.module.scss';
import feat from './Featured.module.scss';

const MAX_FEATURED = 6;

function TemplateCover({ item, className }: { item: MediaWorkflowTemplate; className?: string }) {
    const cover = getCoverMedia(item.previewMedia);
    const coverSrc = cover ? mediaThumbSrc(cover) : '';
    return (
        <div className={`${localStyles.listCover} ${coverSrc ? '' : localStyles.listCoverEmpty} ${className || ''}`}>
            {coverSrc ? (
                cover?.type === 'video' ? (
                    <video src={coverSrc} muted playsInline preload="metadata" />
                ) : (
                    <img src={coverSrc} alt="" />
                )
            ) : null}
        </div>
    );
}

export default function ChatFeaturedTemplatesPage() {
    const [booting, setBooting] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [approved, setApproved] = useState<MediaWorkflowTemplate[]>([]);
    const [catalog, setCatalog] = useState<Record<string, MediaWorkflowTemplate>>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const skipNextApprovedFetch = useRef(true);

    const remember = useCallback((items: MediaWorkflowTemplate[]) => {
        setCatalog((prev) => {
            const next = { ...prev };
            for (const item of items) next[item._id] = item;
            return next;
        });
    }, []);

    const loadApproved = useCallback(async () => {
        try {
            setListLoading(true);
            const queue = await templateReviewApi.listReviewQueue({
                status: 'approved',
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            const items = queue.templates || [];
            setApproved(items);
            remember(items);
            setPagination((prev) => ({
                ...prev,
                totalItems: queue.total ?? 0,
                lastUpdateBy: 'pagination',
            }));
        } catch (error) {
            setApproved([]);
            ErrorToaster(error);
        } finally {
            setListLoading(false);
        }
    }, [pagination.currentPage, pagination.itemPerPage, remember]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [featured, queue] = await Promise.all([
                    templateReviewApi.getChatFeatured(),
                    templateReviewApi.listReviewQueue({
                        status: 'approved',
                        page: 1,
                        limit: 10,
                    }),
                ]);
                if (cancelled) return;
                setSelectedIds(featured.templateIds || []);
                remember([...(featured.templates || []), ...(queue.templates || [])]);
                setApproved(queue.templates || []);
                setPagination((prev) => ({
                    ...prev,
                    currentPage: 1,
                    itemPerPage: 10,
                    totalItems: queue.total ?? 0,
                    lastUpdateBy: 'boot',
                }));
            } catch (error) {
                ErrorToaster(error);
            } finally {
                if (!cancelled) setBooting(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [remember]);

    useEffect(() => {
        if (booting) return;
        if (skipNextApprovedFetch.current) {
            skipNextApprovedFetch.current = false;
            return;
        }
        void loadApproved();
    }, [booting, loadApproved]);

    const selected = selectedIds.map((id) => catalog[id]).filter(Boolean);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return approved;
        return approved.filter((item) => item.title.toLowerCase().includes(q));
    }, [approved, search]);

    const toggle = (item: MediaWorkflowTemplate) => {
        remember([item]);
        setSelectedIds((current) => {
            if (current.includes(item._id)) return current.filter((id) => id !== item._id);
            if (current.length >= MAX_FEATURED) {
                ErrorToaster({ message: `حداکثر ${MAX_FEATURED} قالب می‌توانید انتخاب کنید.` });
                return current;
            }
            return [...current, item._id];
        });
    };

    const move = (id: string, delta: number) => {
        setSelectedIds((current) => {
            const index = current.indexOf(id);
            const nextIndex = index + delta;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(nextIndex, 0, item);
            return next;
        });
    };

    const save = async () => {
        try {
            setSaving(true);
            const result = await templateReviewApi.saveChatFeatured(selectedIds);
            setSelectedIds(result.templateIds || []);
            remember(result.templates || []);
            SuccessToaster({ message: 'قالب‌های منتخب چت ذخیره شد.' });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>قالب‌های منتخب چت</h1>
                    <p className={styles.subtitle}>
                        تا {toFarsiNumber(MAX_FEATURED)} قالب تاییدشده را انتخاب کنید تا در صفحه چت خالی نمایش داده شوند.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link href="/projects/templates/review" className={styles.secondaryBtn}>بازگشت به فهرست</Link>
                    <button type="button" className={styles.primaryBtn} disabled={saving} onClick={() => void save()}>
                        ذخیره انتخاب
                    </button>
                </div>
            </header>

            {booting ? <LoadingState /> : (
                <div className={feat.columns}>
                    <section className={`${styles.card} ${feat.panel}`}>
                        <h3 className={`${styles.cardLabel} ${feat.panelTitle}`}>قالب‌های تاییدشده</h3>
                        <input
                            className={`form-control form-control-sm ${feat.search}`}
                            placeholder="جستجوی عنوان در این صفحه"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <div className={feat.panelBody}>
                            {listLoading ? (
                                <LoadingState />
                            ) : filtered.length === 0 ? (
                                <p className={`${styles.subtitle} ${feat.empty}`}>قالبی با این فیلتر یافت نشد.</p>
                            ) : filtered.map((item) => {
                                const active = selectedIds.includes(item._id);
                                return (
                                    <button
                                        key={item._id}
                                        type="button"
                                        onClick={() => toggle(item)}
                                        className={`${feat.row} ${active ? feat.rowActive : ''}`}
                                    >
                                        <TemplateCover item={item} className={feat.coverLg} />
                                        <span className={feat.rowTitle}>{item.title}</span>
                                        {active ? <LuCheck /> : null}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={feat.panelFooter}>
                            <Pagination
                                itemPerPage={pagination.itemPerPage}
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                rtl
                                paginate={(pageNumber) =>
                                    setPagination((prev) => ({ ...prev, currentPage: pageNumber, lastUpdateBy: 'pagination' }))
                                }
                                setRowsPerPage={(rows) =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        itemPerPage: Math.max(10, rows),
                                        currentPage: 1,
                                        lastUpdateBy: 'pagination',
                                    }))
                                }
                            />
                        </div>
                    </section>

                    <section className={`${styles.card} ${feat.panel}`}>
                        <h3 className={`${styles.cardLabel} ${feat.panelTitle}`}>
                            منتخب‌ها ({toFarsiNumber(selected.length)}/{toFarsiNumber(MAX_FEATURED)})
                        </h3>
                        <div className={feat.panelBody}>
                            {selected.length === 0 ? (
                                <p className={`${styles.subtitle} ${feat.empty}`}>هنوز قالبی انتخاب نشده است.</p>
                            ) : selected.map((item, index) => (
                                <div key={item._id} className={feat.selectedRow}>
                                    <strong className={feat.index}>{toFarsiNumber(index + 1)}</strong>
                                    <TemplateCover item={item} className={feat.coverLg} />
                                    <span className={feat.rowTitle} title={item.title}>{item.title}</span>
                                    <div className={feat.actions}>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => move(item._id, -1)} aria-label="بالا">
                                            <LuArrowUp />
                                        </button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => move(item._id, 1)} aria-label="پایین">
                                            <LuArrowDown />
                                        </button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => toggle(item)} aria-label="حذف">
                                            <LuTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
