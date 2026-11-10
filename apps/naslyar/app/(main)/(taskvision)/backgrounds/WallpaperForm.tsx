'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {LoadingState} from '@my-workspace/components';
import {ErrorToaster, SuccessToaster} from '@my-workspace/utils';
import {Container, Wrapper} from '@/app/(main)/layout';
import ImageUpload from '@/app/(main)/components/ImageUpload/ImageUpload';
import parentStyles from '../../marketing/Marketing.module.scss';
import tabStyles from '../../marketing/automation/Automation.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './backgrounds.module.scss';
import {
    ANIMATED_EXTENSIONS,
    BoardWallpaper,
    fetchWallpaperCategories,
    saveWallpaper,
    WALLPAPER_ACCEPT,
    WallpaperCategory,
} from '../lib/boardBackgroundsApi';

type UploadResult = {original?: {path?: string}} | null;

const extensionOf = (url: string) => (url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
/** ImageUpload پیش‌نمایش را از path می‌خواند */
const asUpload = (url?: string) => (url ? {original: {path: url}, thumbnail: {path: url}} : undefined);

/** فرم افزودن/ویرایش والپیپر — صفحه‌ی جدا با هدر، راهنمای قبل از ثبت و hint زیر هر فیلد */
export default function WallpaperForm({wallpaperId, initialCategoryId}: {wallpaperId?: string; initialCategoryId?: string}) {
    const router = useRouter();
    const isEdit = !!wallpaperId;

    const [categories, setCategories] = useState<WallpaperCategory[] | null>(null);
    const [categoryId, setCategoryId] = useState(initialCategoryId || '');
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [darkImageUrl, setDarkImageUrl] = useState('');
    const [isAnimated, setIsAnimated] = useState(false);
    const [order, setOrder] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const list = await fetchWallpaperCategories();
                setCategories(list);
                if (wallpaperId) {
                    const existing: BoardWallpaper | undefined = list.flatMap(c => c.wallpapers).find(w => w._id === wallpaperId);
                    if (existing) {
                        setCategoryId(existing.categoryId);
                        setTitle(existing.title);
                        setImageUrl(existing.imageUrl);
                        setDarkImageUrl(existing.darkImageUrl || '');
                        setIsAnimated(!!existing.isAnimated);
                        setOrder(existing.order ?? 0);
                    }
                } else if (!initialCategoryId && list[0]) {
                    setCategoryId(list[0]._id);
                }
            } catch (e) {
                ErrorToaster(e);
                setCategories([]);
            }
        })();
    }, [wallpaperId, initialCategoryId]);

    const onImage = (upload: UploadResult) => {
        const path = upload?.original?.path || '';
        setImageUrl(path);
        // gif / apng همیشه متحرک‌اند؛ webp متحرک را خود ادمین تیک می‌زند
        if (path && ANIMATED_EXTENSIONS.includes(extensionOf(path))) setIsAnimated(true);
    };

    const backHref = categoryId ? `/backgrounds?category=${categoryId}` : '/backgrounds';
    const isValid = !!(categoryId && title.trim() && imageUrl);

    const submit = async () => {
        if (!isValid || saving) return;
        setSaving(true);
        try {
            await saveWallpaper(wallpaperId || null, {
                categoryId,
                title: title.trim(),
                imageUrl,
                darkImageUrl,
                isAnimated,
                order: Number(order) || 0,
            });
            SuccessToaster({message: isEdit ? 'والپیپر ذخیره شد' : 'والپیپر اضافه شد'});
            router.push(backHref);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>{isEdit ? 'ویرایش والپیپر' : 'افزودن والپیپر'}</h1>
                            <p className={parentStyles.subtitle}>تصویر ثابت یا متحرک برای پس‌زمینه‌ی بورد TaskVision.</p>
                        </div>
                        <Link href={backHref} className={tabStyles.smallBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <p>
                            تصویر افقی (۱۶:۹، حدود ۱۹۲۰×۱۰۸۰) و آرام انتخاب کنید تا کارت‌ها رویش خوانا بمانند. فرمت سبک بگذارید:
                            ثابت <strong>webp/png/avif/jpg</strong> زیر ۵۰۰KB، متحرک <strong>webp متحرک/gif/apng</strong> زیر ۲MB.
                            اگر دسته‌ی مناسب نیست، اول در <Link href="/backgrounds">فهرست والپیپرها</Link> «افزودن دسته» بزنید.
                        </p>
                    </section>

                    {categories === null ? (
                        <LoadingState/>
                    ) : (
                        <div className={parentStyles.formCard}>
                            <h3 className={parentStyles.formSectionTitle}>مشخصات</h3>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label htmlFor="wp-title">عنوان *</label>
                                    <input id="wp-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً کوهستان مه‌آلود"/>
                                    <p className={hrStyles.fieldHint}>نام والپیپر؛ کاربر آن را با نگه‌داشتن ماوس روی کاشی می‌بیند.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label htmlFor="wp-category">دسته *</label>
                                    <select id="wp-category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                        <option value="" disabled>انتخاب دسته</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.title}{c.isActive ? '' : ' (غیرفعال)'}</option>
                                        ))}
                                    </select>
                                    <p className={hrStyles.fieldHint}>والپیپر زیر عنوان همین دسته در پنجره‌ی انتخاب نشان داده می‌شود.</p>
                                </div>
                            </div>

                            <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>تصویر</h3>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <ImageUpload
                                        label="تصویر اصلی (تم روشن) *"
                                        accept={WALLPAPER_ACCEPT}
                                        currentImage={asUpload(imageUrl)}
                                        onUpload={onImage}
                                    />
                                    <p className={hrStyles.fieldHint}>png، webp، avif، jpg یا متحرک gif / apng / webp.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <ImageUpload
                                        label="نسخه‌ی تیره (اختیاری)"
                                        accept={WALLPAPER_ACCEPT}
                                        currentImage={asUpload(darkImageUrl)}
                                        onUpload={(upload: UploadResult) => setDarkImageUrl(upload?.original?.path || '')}
                                    />
                                    <p className={hrStyles.fieldHint}>در تم تاریک به‌جای تصویر اصلی نشان داده می‌شود؛ خالی = همان تصویر اصلی.</p>
                                </div>
                            </div>

                            <label className={styles.checkRow}>
                                <input type="checkbox" checked={isAnimated} onChange={e => setIsAnimated(e.target.checked)}/>
                                <span>تصویر متحرک است</span>
                            </label>
                            <p className={hrStyles.fieldHint}>
                                gif و apng خودکار تیک می‌خورند؛ برای webp متحرک خودتان تیک بزنید تا کاربر نشان «متحرک» را ببیند.
                            </p>

                            <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>نمایش</h3>
                            <div className={parentStyles.field}>
                                <label htmlFor="wp-order">ترتیب نمایش</label>
                                <input id="wp-order" type="number" dir="ltr" value={order} onChange={e => setOrder(Number(e.target.value))}/>
                                <p className={hrStyles.fieldHint}>عدد کمتر = جلوتر در دسته.</p>
                            </div>

                            <div className={hrStyles.formNoteBox}>
                                بعد از ذخیره، والپیپر (اگر دسته و خودش فعال باشند) حداکثر تا یک دقیقه بعد در پنجره‌ی انتخاب کاربران دیده می‌شود.
                            </div>

                            <div className={`${tabStyles.inlineActions} ${styles.sectionGap}`}>
                                <button type="button" className={parentStyles.primaryBtn} onClick={submit} disabled={!isValid || saving}>
                                    {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : 'افزودن والپیپر'}
                                </button>
                                <Link href={backHref} className={tabStyles.smallBtn}>انصراف</Link>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
