'use client';

import React, {Suspense, useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {ModalHelper, ModalBody, ModalFooter, ModalHeader, LoadingState} from '@my-workspace/components';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {Container, Wrapper} from '@/app/(main)/layout';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import parentStyles from '../../marketing/Marketing.module.scss';
import tabStyles from '../../marketing/automation/Automation.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './backgrounds.module.scss';
import WallpapersGuide from './WallpapersGuide';
import {
    BoardWallpaper,
    deleteWallpaper,
    deleteWallpaperCategory,
    fetchWallpaperCategories,
    saveWallpaper,
    saveWallpaperCategory,
    WallpaperCategory,
} from '../lib/boardBackgroundsApi';

type PendingDelete = {kind: 'category'; item: WallpaperCategory} | {kind: 'wallpaper'; item: BoardWallpaper};

/** useSearchParams داخل Suspense (مثل zernio-keys) تا build ثابت بماند */
export default function BoardWallpapersPage() {
    return (
        <Suspense fallback={null}>
            <BoardWallpapersContent/>
        </Suspense>
    );
}

function BoardWallpapersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {appName} = useAppStore();

    const [categories, setCategories] = useState<WallpaperCategory[] | null>(null);
    const [reloading, setReloading] = useState(false);
    const [activeId, setActiveId] = useState<string>(searchParams.get('category') || '');
    const [categoryModal, setCategoryModal] = useState<{open: boolean; item: WallpaperCategory | null}>({open: false, item: null});
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (appName && appName !== 'taskvision') router.replace('/home');
    }, [appName, router]);

    const load = useCallback(async () => {
        setReloading(true);
        try {
            setCategories(await fetchWallpaperCategories());
        } catch (e) {
            ErrorToaster(e);
            setCategories(prev => prev || []);
        } finally {
            setReloading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // دسته‌ی فعال: از URL یا اولین دسته
    const active = useMemo(() => {
        if (!categories?.length) return null;
        return categories.find(c => c._id === activeId) || categories[0];
    }, [categories, activeId]);

    const selectCategory = (id: string) => {
        setActiveId(id);
        router.replace(`/backgrounds?category=${id}`, {scroll: false});
    };

    const toggleCategory = async (category: WallpaperCategory) => {
        try {
            await saveWallpaperCategory(category._id, {isActive: !category.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const toggleWallpaper = async (wallpaper: BoardWallpaper) => {
        try {
            await saveWallpaper(wallpaper._id, {isActive: !wallpaper.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setBusy(true);
        try {
            if (pendingDelete.kind === 'category') await deleteWallpaperCategory(pendingDelete.item._id);
            else await deleteWallpaper(pendingDelete.item._id);
            SuccessToaster({message: pendingDelete.kind === 'category' ? 'دسته حذف شد' : 'والپیپر حذف شد'});
            setPendingDelete(null);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const tabs = (categories || []).map(c => ({
        id: c._id,
        label: `${c.title} (${toFarsiNumber(c.wallpapers.length)})${c.isActive ? '' : ' — غیرفعال'}`,
    }));

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>والپیپرهای بورد TaskVision</h1>
                            <p className={parentStyles.subtitle}>
                                دسته بسازید و برای هر دسته تصویر ثابت یا متحرک آپلود کنید؛ کاربران آن‌ها را در پنجره «پس‌زمینه بورد» می‌بینند.
                            </p>
                        </div>
                        <div className={tabStyles.inlineActions}>
                            <button type="button" className={tabStyles.smallBtn} onClick={() => setCategoryModal({open: true, item: null})}>
                                افزودن دسته
                            </button>
                            {active && (
                                <Link href={`/backgrounds/new?category=${active._id}`} className={parentStyles.primaryBtn}>
                                    افزودن والپیپر
                                </Link>
                            )}
                        </div>
                    </header>

                    <WallpapersGuide/>

                    {categories === null ? (
                        <LoadingState/>
                    ) : categories.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>هنوز دسته‌ای ساخته نشده. اول یک دسته (مثلاً «طبیعت» یا «متحرک») بسازید، بعد والپیپرهایش را اضافه کنید.</p>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => setCategoryModal({open: true, item: null})}>
                                ساخت اولین دسته
                            </button>
                        </div>
                    ) : (
                        <section className={styles.categorySection}>
                            <SimpleLineTabs tabs={tabs} activeTab={active?._id || ''} onChange={selectCategory}/>

                            {active && (
                                <>
                                    <div className={styles.categoryBar}>
                                        <div className={styles.categoryInfo}>
                                            <strong>{active.title}</strong>
                                            <span className={`${parentStyles.badge} ${active.isActive ? parentStyles.badgeActive : parentStyles.badgeInactive}`}>
                                                {active.isActive ? 'فعال — کاربران می‌بینند' : 'غیرفعال — پنهان از کاربران'}
                                            </span>
                                        </div>
                                        <HrRowActionMenu
                                            rowId={active._id}
                                            ariaLabel={`عملیات دسته ${active.title}`}
                                            items={[
                                                {label: 'ویرایش دسته', onClick: () => setCategoryModal({open: true, item: active})},
                                                {label: active.isActive ? 'غیرفعال کردن دسته' : 'فعال کردن دسته', onClick: () => toggleCategory(active)},
                                                {label: 'حذف دسته', danger: true, onClick: () => setPendingDelete({kind: 'category', item: active})},
                                            ]}
                                        />
                                    </div>

                                    <div className={`${tabStyles.tableWrap} ${reloading ? styles.reloading : ''}`}>
                                        <table className={tabStyles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th>پیش‌نمایش</th>
                                                    <th>عنوان</th>
                                                    <th>نوع</th>
                                                    <th>ترتیب</th>
                                                    <th>وضعیت</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {active.wallpapers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className={tabStyles.emptyCell} data-label="">
                                                            این دسته هنوز والپیپر ندارد.{' '}
                                                            <Link href={`/backgrounds/new?category=${active._id}`}>افزودن اولین والپیپر</Link>
                                                        </td>
                                                    </tr>
                                                ) : active.wallpapers.map(w => (
                                                    <tr key={w._id}>
                                                        <td data-label="پیش‌نمایش">
                                                            <span className={styles.thumb} style={{backgroundImage: `url("${w.imageUrl}")`}}/>
                                                        </td>
                                                        <td data-label="عنوان" className={tabStyles.cellPrimary}>{w.title}</td>
                                                        <td data-label="نوع">
                                                            <span className={parentStyles.badge}>{w.isAnimated ? 'متحرک' : 'ثابت'}</span>
                                                            {w.darkImageUrl && <span className={`${parentStyles.badge} ${styles.badgeGap}`}>نسخه تیره</span>}
                                                        </td>
                                                        <td data-label="ترتیب">{toFarsiNumber(String(w.order ?? 0))}</td>
                                                        <td data-label="وضعیت">
                                                            <span className={`${parentStyles.badge} ${w.isActive ? parentStyles.badgeActive : parentStyles.badgeInactive}`}>
                                                                {w.isActive ? 'فعال' : 'غیرفعال'}
                                                            </span>
                                                        </td>
                                                        <td data-label="عملیات">
                                                            <HrRowActionMenu
                                                                rowId={w._id}
                                                                ariaLabel={`عملیات ${w.title}`}
                                                                items={[
                                                                    {label: 'ویرایش', onClick: () => router.push(`/backgrounds/${w._id}`)},
                                                                    {label: w.isActive ? 'غیرفعال کردن' : 'فعال کردن', onClick: () => toggleWallpaper(w)},
                                                                    {label: 'حذف', danger: true, onClick: () => setPendingDelete({kind: 'wallpaper', item: w})},
                                                                ]}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </section>
                    )}
                </div>

                <ModalHelper
                    open={categoryModal.open}
                    onClose={() => setCategoryModal({open: false, item: null})}
                    size="sm"
                    sheetTitle={categoryModal.item ? 'ویرایش دسته' : 'افزودن دسته'}
                    component={categoryModal.open ? (
                        <CategoryForm
                            item={categoryModal.item}
                            onDone={async (savedId) => {
                                setCategoryModal({open: false, item: null});
                                await load();
                                if (savedId) selectCategory(savedId);
                            }}
                        />
                    ) : null}
                />

                <ConfirmDialog
                    open={!!pendingDelete}
                    title={pendingDelete?.kind === 'category' ? 'حذف دسته' : 'حذف والپیپر'}
                    confirmLabel="حذف"
                    tone="danger"
                    busy={busy}
                    onConfirm={confirmDelete}
                    onClose={() => setPendingDelete(null)}
                >
                    {pendingDelete?.kind === 'category'
                        ? `دسته «${pendingDelete.item.title}» و ${toFarsiNumber(pendingDelete.item.wallpapers.length)} والپیپرش از پنجره انتخاب کاربران حذف می‌شوند. بوردهایی که یکی از آن‌ها را گذاشته‌اند تصویرشان را نگه می‌دارند.`
                        : `والپیپر «${pendingDelete?.item.title}» از پنجره انتخاب کاربران حذف می‌شود. بوردهایی که آن را گذاشته‌اند تصویرشان را نگه می‌دارند.`}
                </ConfirmDialog>
            </Wrapper>
        </Container>
    );
}

/** فرم کوچک دسته — عنوان + ترتیب (مودال، با hint زیر هر فیلد) */
function CategoryForm({item, onDone}: {item: WallpaperCategory | null; onDone: (savedId?: string) => void}) {
    const [title, setTitle] = useState(item?.title || '');
    const [order, setOrder] = useState(item?.order ?? 0);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!title.trim() || saving) return;
        setSaving(true);
        try {
            const saved = await saveWallpaperCategory(item?._id || null, {title: title.trim(), order: Number(order) || 0});
            SuccessToaster({message: item ? 'دسته ذخیره شد' : 'دسته ساخته شد'});
            onDone((saved as {_id?: string})?._id);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div dir="rtl">
            <ModalHeader>{item ? 'ویرایش دسته' : 'افزودن دسته'}</ModalHeader>
            <ModalBody>
                <div className={parentStyles.field}>
                    <label htmlFor="wp-cat-title">عنوان دسته *</label>
                    <input id="wp-cat-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً طبیعت، شهر، متحرک" autoFocus/>
                    <p className={hrStyles.fieldHint}>همین عنوان بالای والپیپرهای دسته در پنجره انتخاب پس‌زمینه دیده می‌شود.</p>
                </div>
                <div className={parentStyles.field}>
                    <label htmlFor="wp-cat-order">ترتیب نمایش</label>
                    <input id="wp-cat-order" type="number" dir="ltr" value={order} onChange={e => setOrder(Number(e.target.value))}/>
                    <p className={hrStyles.fieldHint}>عدد کمتر = بالاتر. دسته‌ها با این عدد مرتب می‌شوند.</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <button type="button" className={parentStyles.primaryBtn} onClick={submit} disabled={!title.trim() || saving}>
                    {saving ? 'در حال ذخیره…' : 'ذخیره'}
                </button>
            </ModalFooter>
        </div>
    );
}
