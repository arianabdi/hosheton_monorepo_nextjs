'use client';

import { useState } from 'react';
import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export interface ProjectFormState {
    name: string;
    slug: string;
    description: string;
    platform: string;
    environment: string;
    /** origin های مجاز خواندن source map — هر خط یکی */
    sourceMapOrigins: string;
}

export const EMPTY_PROJECT_FORM: ProjectFormState = {
    name: '',
    slug: '',
    description: '',
    platform: 'node',
    environment: 'production',
    sourceMapOrigins: '',
};

/** متن چندخطی فرم → آرایهٔ origin برای API */
export function parseOrigins(text: string): string[] {
    return text.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
}

interface ProjectFormProps {
    initial?: ProjectFormState;
    editMode?: boolean;
    saving?: boolean;
    onSubmit: (form: ProjectFormState) => void;
    onCancel: () => void;
    submitLabel?: string;
    /** فقط ویرایش: توکن source map پروژه برای env سرور اپ */
    sourceMapToken?: string;
}

export default function ProjectForm({
    initial,
    editMode = false,
    saving = false,
    onSubmit,
    onCancel,
    submitLabel = 'ثبت پروژه',
    sourceMapToken,
}: ProjectFormProps) {
    const [form, setForm] = useState<ProjectFormState>(initial || EMPTY_PROJECT_FORM);
    const disabled = saving || !form.name.trim();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({
                    ...form,
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    description: form.description.trim(),
                });
            }}
        >
            <h3 className={parentStyles.formSectionTitle}>هویت پروژه</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>نام پروژه *</label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="مثلاً API استودیو"
                        required
                    />
                    <p className={hrStyles.fieldHint}>نامی که در داشبورد، مشکلات و هشدارها دیده می‌شود.</p>
                </div>
                <div className={parentStyles.field}>
                    <label>شناسه (Slug)</label>
                    <input
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        placeholder="hosheton-studio"
                        dir="ltr"
                        disabled={editMode}
                    />
                    <p className={hrStyles.fieldHint}>
                        {editMode
                            ? 'بعد از ساخت قابل تغییر نیست.'
                            : 'اختیاری؛ اگر خالی باشد از نام ساخته می‌شود. حروف کوچک و خط تیره.'}
                    </p>
                </div>
            </div>
            <div className={parentStyles.field}>
                <label>توضیح داخلی</label>
                <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="خطاهای فرانت استودیو — جدا از API"
                />
                <p className={hrStyles.fieldHint}>کمک می‌کند پروژه‌های شبیه هم قاطی نشوند.</p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                پلتفرم و محیط
            </h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>پلتفرم</label>
                    <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                        <option value="node">Node.js</option>
                        <option value="browser">مرورگر</option>
                        <option value="react">React</option>
                        <option value="nextjs">Next.js</option>
                        <option value="worker">Worker / Queue</option>
                    </select>
                    <p className={hrStyles.fieldHint}>فقط برای دسته‌بندی در فهرست؛ روی دریافت رویداد اثر ندارد.</p>
                </div>
                <div className={parentStyles.field}>
                    <label>محیط پیش‌فرض</label>
                    <select
                        value={form.environment}
                        onChange={(e) => setForm({ ...form, environment: e.target.value })}
                    >
                        <option value="production">production</option>
                        <option value="staging">staging</option>
                        <option value="development">development</option>
                    </select>
                    <p className={hrStyles.fieldHint}>
                        SDK می‌تواند محیط را در هر رویداد override کند. این مقدار پیش‌فرض پنل است.
                    </p>
                </div>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                آدرس دقیق خطاهای مرورگر (Source map)
            </h3>
            <div className={parentStyles.field}>
                <label>آدرس‌های اپ (origin)</label>
                <textarea
                    rows={3}
                    dir="ltr"
                    value={form.sourceMapOrigins}
                    onChange={(e) => setForm({ ...form, sourceMapOrigins: e.target.value })}
                    placeholder={'https://studio.hosheton.com\nhttp://localhost:3000'}
                />
                <p className={hrStyles.fieldHint}>
                    هر خط یک آدرس. سرور فقط source map همین آدرس‌ها را می‌خواند و Stack Trace کد build شده
                    (مثل <code dir="ltr">_next/static/chunks/…js</code>) را به فایل، خط و کد اصلی برمی‌گرداند.
                    خالی = فقط localhost وقتی API در حالت توسعه است.
                </p>
            </div>
            {editMode && sourceMapToken ? (
                <div className={parentStyles.field}>
                    <label>توکن source map (برای env سرور اپ)</label>
                    <input
                        readOnly
                        dir="ltr"
                        value={`ETR_SOURCEMAP_TOKEN=${sourceMapToken}`}
                        onFocus={(e) => e.currentTarget.select()}
                    />
                    <p className={hrStyles.fieldHint}>
                        این خط را در env سرور اپ Next بگذارید (نه NEXT_PUBLIC) و در next.config{' '}
                        <code dir="ltr">productionBrowserSourceMaps: true</code> را روشن کنید؛ فایل‌های .map فقط به سرور
                        پایش خطا داده می‌شوند. جزئیات در <Link href="/error-tracking/integration">راهنمای اتصال</Link>.
                    </p>
                </div>
            ) : null}

            <div className={hrStyles.formNoteBox}>
                <strong>بعد از ذخیره:</strong> کلید عمومی (DSN) در فهرست پروژه ساخته می‌شود. آن را در{' '}
                <Link href="/error-tracking/integration">راهنمای اتصال</Link> داخل اپ بگذارید. اگر کلید لو رفت از
                فهرست «چرخش کلید» بزنید.
            </div>

            <div className={parentStyles.formActions}>
                <button type="submit" className={parentStyles.primaryBtn} disabled={disabled}>
                    {saving ? 'در حال ذخیره...' : submitLabel}
                </button>
                <button type="button" className={parentStyles.secondaryBtn} onClick={onCancel}>
                    انصراف
                </button>
            </div>
        </form>
    );
}
