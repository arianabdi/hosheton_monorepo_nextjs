'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Field } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, PAGE_MAINTENANCE_KEY, normalizePageMaintenanceRules } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from '../../blog/Blog.module.scss';
import formStyles from '../../blog/components/BlogForm/BlogForm.module.scss';
import maintenanceStyles from './MaintenanceSettings.module.scss';
import PageMaintenanceSettings, { PageMaintenanceRow, rowsFromRules, rulesFromRows } from './PageMaintenanceSettings';

const INFO_KEY = 'website.info';
const SOCIAL_KEY = 'website.social_links';
const BLOG_LANDING_KEY = 'blog.landing.featured_categories';

const ICON_OPTIONS = [
    { label: 'تلگرام', value: 'telegram' },
    { label: 'اینستاگرام', value: 'instagram' },
    { label: 'لینکدین', value: 'linkedin' },
    { label: 'توییتر', value: 'twitter' },
    { label: 'X', value: 'x' },
    { label: 'فیسبوک', value: 'facebook' },
    { label: 'یوتیوب', value: 'youtube' },
    { label: 'گیت‌هاب', value: 'github' },
    { label: 'دریبل', value: 'dribbble' },
    { label: 'سفارشی (URL آیکون)', value: 'custom' },
];

interface WebsiteInfo {
    siteName: string;
    tagline: string;
    footerDescription: string;
    supportEmail: string;
    defaultAuthor: string;
    maintenanceEnabled?: boolean;
    maintenanceTitle?: string;
    maintenanceContent?: string;
}

interface SocialRow {
    id: string;
    label: string;
    url: string;
    icon: string;
    customIconUrl: string;
    order: number;
}

interface CategoryOption {
    _id: string;
    name: string;
    slug: string;
}

interface FeaturedCategoryRow {
    categoryId: string;
    label: string;
    limit: number;
    order: number;
}

async function loadOrCreateSetting(
    baseUrl: string,
    token: string,
    key: string,
    defaultValue: unknown,
    meta: { group: string; label: string; description: string },
) {
    const res = await axios
        .get(`${baseUrl}/api/system-setting/${encodeURIComponent(key)}`, {
            headers: { authorization: `Bearer ${token}` },
        })
        .catch(() => null);

    if (res?.data?.statusCode === 200) {
        return { exists: true, value: res.data.data.value };
    }

    await axios.post(
        `${baseUrl}/api/system-setting`,
        { key, value: defaultValue, group: meta.group, label: meta.label, description: meta.description, type: 'json' },
        { headers: { authorization: `Bearer ${token}` } },
    );
    return { exists: true, value: defaultValue };
}

const PAGE_MAINTENANCE_META = {
    group: 'website',
    label: 'بروزرسانی صفحه‌ها',
    description: 'صفحه‌هایی که جداگانه در حالت «در حال بروزرسانی» هستند (مسیر، فعال/غیرفعال، متن سفارشی).',
};

/** PATCH؛ اگر کلید بعد از لود صفحه حذف شده باشد (404) همان مقدار را می‌سازد */
async function saveOrCreateSetting(
    baseUrl: string,
    token: string,
    key: string,
    value: unknown,
    meta: { group: string; label: string; description: string },
) {
    const headers = { authorization: `Bearer ${token}` };
    try {
        await axios.patch(`${baseUrl}/api/system-setting/${encodeURIComponent(key)}`, { value }, { headers });
    } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) throw e;
        await axios.post(
            `${baseUrl}/api/system-setting`,
            { key, value, group: meta.group, label: meta.label, description: meta.description, type: 'json' },
            { headers },
        );
    }
}

export default function WebsiteSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [info, setInfo] = useState<WebsiteInfo>({
        siteName: '',
        tagline: '',
        footerDescription: '',
        supportEmail: '',
        defaultAuthor: '',
    });
    const [socialRows, setSocialRows] = useState<SocialRow[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [featuredRows, setFeaturedRows] = useState<FeaturedCategoryRow[]>([]);
    const [pageMaintenanceRows, setPageMaintenanceRows] = useState<PageMaintenanceRow[]>([]);

    useEffect(() => {
        if (!token) return;

        Promise.all([
            loadOrCreateSetting(baseUrl, token, INFO_KEY, {}, {
                group: 'website',
                label: 'اطلاعات وبسایت',
                description: 'نام، توضیحات و اطلاعات عمومی لندینگ taskvision',
            }),
            loadOrCreateSetting(baseUrl, token, SOCIAL_KEY, [], {
                group: 'website',
                label: 'شبکه‌های اجتماعی',
                description: 'لینک و آیکون شبکه‌های اجتماعی footer لندینگ',
            }),
            loadOrCreateSetting(baseUrl, token, BLOG_LANDING_KEY, [], {
                group: 'blog',
                label: 'دسته‌بندی‌های منتخب لندینگ',
                description: 'دسته‌هایی که در صفحه بلاگ لندینگ taskvision به صورت سکشن جداگانه نمایش داده می‌شوند.',
            }),
            loadOrCreateSetting(baseUrl, token, PAGE_MAINTENANCE_KEY, [], PAGE_MAINTENANCE_META),
            axios.get(`${baseUrl}/api/categories/panel?section=post`, {
                headers: { authorization: `Bearer ${token}` },
            }).catch(() => null),
        ])
            .then(([infoRes, socialRes, blogRes, pageMaintenanceRes, catRes]) => {
                setPageMaintenanceRows(rowsFromRules(normalizePageMaintenanceRules(pageMaintenanceRes.value)));
                const infoVal = (infoRes.value || {}) as Partial<WebsiteInfo>;
                setInfo({
                    siteName: infoVal.siteName || '',
                    tagline: infoVal.tagline || '',
                    footerDescription: infoVal.footerDescription || '',
                    supportEmail: infoVal.supportEmail || '',
                    defaultAuthor: infoVal.defaultAuthor || '',
                    maintenanceEnabled: infoVal.maintenanceEnabled ?? false,
                    maintenanceTitle: infoVal.maintenanceTitle || '',
                    maintenanceContent: infoVal.maintenanceContent || '',
                });
                setSocialRows(
                    ((socialRes.value || []) as SocialRow[]).map((row, index) => ({
                        id: row.id || `social-${index}`,
                        label: row.label || '',
                        url: row.url || '',
                        icon: row.icon || 'telegram',
                        customIconUrl: row.customIconUrl || '',
                        order: row.order ?? index + 1,
                    })),
                );
                if (catRes?.data?.statusCode === 200) {
                    setCategories(catRes.data.data.categories || []);
                }
                if (blogRes?.value) {
                    setFeaturedRows(
                        ((blogRes.value || []) as FeaturedCategoryRow[]).map((item, index) => ({
                            categoryId: item.categoryId,
                            label: item.label || '',
                            limit: item.limit || 4,
                            order: item.order ?? index + 1,
                        })),
                    );
                }
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [token, baseUrl]);

    const addSocial = () => {
        setSocialRows((prev) => [
            ...prev,
            { id: `social-${Date.now()}`, label: '', url: '', icon: 'telegram', customIconUrl: '', order: prev.length + 1 },
        ]);
    };

    const updateSocial = (index: number, patch: Partial<SocialRow>) => {
        setSocialRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const removeSocial = (index: number) => {
        setSocialRows((prev) => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, order: i + 1 })));
    };

    const addFeaturedRow = () => {
        setFeaturedRows((prev) => [...prev, { categoryId: '', label: '', limit: 4, order: prev.length + 1 }]);
    };

    const updateFeaturedRow = (index: number, patch: Partial<FeaturedCategoryRow>) => {
        setFeaturedRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const removeFeaturedRow = (index: number) => {
        setFeaturedRows((prev) => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, order: i + 1 })));
    };

    const handleSave = async () => {
        if (!token) return;
        try {
            setSaving(true);
            const socialPayload = socialRows
                .filter((row) => row.url)
                .map((row, index) => ({
                    id: row.id,
                    label: row.label || row.icon,
                    url: row.url,
                    icon: row.icon,
                    customIconUrl: row.icon === 'custom' ? row.customIconUrl : undefined,
                    order: index + 1,
                }));

            const featuredPayload = featuredRows
                .filter((row) => row.categoryId)
                .map((row, index) => ({
                    categoryId: row.categoryId,
                    label: row.label || undefined,
                    limit: row.limit || 4,
                    order: index + 1,
                }));

            await Promise.all([
                axios.patch(
                    `${baseUrl}/api/system-setting/${encodeURIComponent(INFO_KEY)}`,
                    { value: info },
                    { headers: { authorization: `Bearer ${token}` } },
                ),
                axios.patch(
                    `${baseUrl}/api/system-setting/${encodeURIComponent(SOCIAL_KEY)}`,
                    { value: socialPayload },
                    { headers: { authorization: `Bearer ${token}` } },
                ),
                saveOrCreateSetting(baseUrl, token, PAGE_MAINTENANCE_KEY, rulesFromRows(pageMaintenanceRows), PAGE_MAINTENANCE_META),
                axios.patch(
                    `${baseUrl}/api/system-setting/${encodeURIComponent(BLOG_LANDING_KEY)}`,
                    { value: featuredPayload },
                    { headers: { authorization: `Bearer ${token}` } },
                ),
            ]);
            SuccessToaster({ message: 'تنظیمات وبسایت ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>تنظیمات وبسایت</h1>
                    <p className={styles.subtitle}>اطلاعات عمومی و شبکه‌های اجتماعی لندینگ taskvision</p>
                </div>
                <Link href="/home" className={styles.secondaryBtn}>بازگشت</Link>
            </header>

            {loading ? (
                <p>در حال بارگذاری...</p>
            ) : (
                <>
                    <div className={formStyles.section}>
                        <h3>اطلاعات سایت</h3>
                        {[
                            ['siteName', 'نام سایت'],
                            ['tagline', 'شعار'],
                            ['footerDescription', 'توضیحات footer'],
                            ['supportEmail', 'ایمیل پشتیبانی'],
                            ['defaultAuthor', 'نویسنده پیش‌فرض مقالات'],
                        ].map(([key, label]) => (
                            <label key={key} className={formStyles.field}>
                                {label}
                                <Field
                                    value={info[key as keyof WebsiteInfo]}
                                    type="text"
                                    className="form-control form-control-sm"
                                    onChange={(value) => setInfo((prev) => ({ ...prev, [key]: value }))}
                                />
                            </label>
                        ))}
                    </div>

                    <div className={formStyles.section}>
                        <h3>شبکه‌های اجتماعی</h3>
                        {socialRows.map((row, index) => (
                            <div key={row.id} className={formStyles.field} style={{ borderBottom: '1px solid var(--plan-card-border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <label>
                                    عنوان
                                    <Field value={row.label} type="text" className="form-control form-control-sm" onChange={(v) => updateSocial(index, { label: v })} />
                                </label>
                                <label>
                                    URL
                                    <Field value={row.url} type="text" className="form-control form-control-sm" onChange={(v) => updateSocial(index, { url: v })} />
                                </label>
                                <label>
                                    آیکون
                                    <Field
                                        value={row.icon}
                                        type="select"
                                        className="form-control form-control-sm"
                                        options={ICON_OPTIONS}
                                        onChange={(v) => updateSocial(index, { icon: v })}
                                    />
                                </label>
                                {row.icon === 'custom' && (
                                    <label>
                                        URL آیکون سفارشی
                                        <Field value={row.customIconUrl} type="text" className="form-control form-control-sm" onChange={(v) => updateSocial(index, { customIconUrl: v })} />
                                    </label>
                                )}
                                <button type="button" className={styles.deleteBtn} onClick={() => removeSocial(index)}>حذف</button>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="button" className={styles.secondaryBtn} onClick={addSocial}>+ افزودن شبکه اجتماعی</button>
                        </div>
                    </div>

                    <div className={formStyles.section}>
                        <h3>تنظیمات بلاگ (لندینگ)</h3>
                        <p className={formStyles.hint}>دسته‌بندی‌های منتخب در صفحه بلاگ taskvision به صورت سکشن جدا نمایش داده می‌شوند.</p>
                        {featuredRows.map((row, index) => (
                            <div key={index} className={formStyles.field} style={{ borderBottom: '1px solid var(--plan-card-border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <label>
                                    دسته‌بندی
                                    <Field
                                        value={row.categoryId}
                                        type="select"
                                        className="form-control form-control-sm"
                                        options={[
                                            { label: 'انتخاب کنید', value: '' },
                                            ...categories.map((c) => ({ label: c.name, value: c._id })),
                                        ]}
                                        onChange={(value) => updateFeaturedRow(index, { categoryId: value })}
                                    />
                                </label>
                                <label>
                                    عنوان نمایشی
                                    <Field value={row.label} type="text" className="form-control form-control-sm" onChange={(value) => updateFeaturedRow(index, { label: value })} />
                                </label>
                                <label>
                                    تعداد مقالات
                                    <Field value={String(row.limit)} type="text" className="form-control form-control-sm" onChange={(value) => updateFeaturedRow(index, { limit: Number(value) || 4 })} />
                                </label>
                                <button type="button" className={styles.deleteBtn} onClick={() => removeFeaturedRow(index)}>حذف</button>
                            </div>
                        ))}
                        <button type="button" className={styles.secondaryBtn} onClick={addFeaturedRow}>+ افزودن دسته منتخب</button>
                    </div>

                    {/* حالت نگهداری — این فرم فقط روی system-setting (website.info) می‌نویسد؛
                        نمایش/گارد در hosheton_studio از endpoint عمومی همان setting می‌خواند */}
                    <div className={maintenanceStyles.card}>
                        <div className={maintenanceStyles.cardHeader}>
                            <h3 className={maintenanceStyles.cardTitle}>حالت نگهداری</h3>
                            <span className={`${maintenanceStyles.statusBadge} ${info.maintenanceEnabled ? maintenanceStyles.enabled : maintenanceStyles.disabled}`}>
                                {info.maintenanceEnabled ? 'فعال' : 'غیرفعال'}
                            </span>
                        </div>

                        <label className={`${maintenanceStyles.switchRow} ${info.maintenanceEnabled ? maintenanceStyles.active : ''}`}>
                            <input
                                type="checkbox"
                                className={maintenanceStyles.switch}
                                checked={info.maintenanceEnabled ?? false}
                                onChange={(e) => setInfo((prev) => ({ ...prev, maintenanceEnabled: e.target.checked }))}
                            />
                            <span className={maintenanceStyles.switchText}>
                                <span className={maintenanceStyles.switchTitle}>بستن پلتفرم برای کاربران</span>
                                <span className={maintenanceStyles.switchDesc}>
                                    وقتی فعال باشد، در hosheton_studio هیچ کاربری — بدون استثنا — به هیچ صفحه‌ای
                                    دسترسی ندارد و فقط صفحه‌ی «در حال بروزرسانی هستیم» را می‌بیند
                                    (وضعیت هر ۶۰ ثانیه چک می‌شود).
                                </span>
                            </span>
                        </label>

                        <div className={maintenanceStyles.fields}>
                            <label className={maintenanceStyles.field}>
                                <span className={maintenanceStyles.fieldLabel}>عنوان صفحه</span>
                                <input
                                    type="text"
                                    value={info.maintenanceTitle || ''}
                                    placeholder="در حال بروزرسانی هستیم"
                                    onChange={(e) => setInfo((prev) => ({ ...prev, maintenanceTitle: e.target.value }))}
                                />
                                <span className={maintenanceStyles.fieldHint}>
                                    خالی بماند از عنوان پیش‌فرض استفاده می‌شود.
                                </span>
                            </label>

                            <label className={maintenanceStyles.field}>
                                <span className={maintenanceStyles.fieldLabel}>متن صفحه</span>
                                <textarea
                                    value={info.maintenanceContent || ''}
                                    placeholder="پلتفرم موقتاً در دست تعمیر و بروزرسانی است و تا ساعتی دیگر فعال می‌شود. تمام اطلاعات شما محفوظ است و به‌محض اتمام بروزرسانی، همه‌چیز مثل قبل در دسترس خواهد بود."
                                    onChange={(e) => setInfo((prev) => ({ ...prev, maintenanceContent: e.target.value }))}
                                />
                                <span className={maintenanceStyles.fieldHint}>
                                    متن اصلی صفحه‌ی نگهداری؛ خالی بماند از متن پیش‌فرض استفاده می‌شود. مثلاً می‌توانید زمان تقریبی بازگشت را بنویسید.
                                </span>
                            </label>
                        </div>
                    </div>

                    <PageMaintenanceSettings rows={pageMaintenanceRows} onChange={setPageMaintenanceRows} />

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" className={formStyles.submit} disabled={saving} onClick={handleSave}>ذخیره تنظیمات</button>
                    </div>
                </>
            )}
        </div>
    );
}
