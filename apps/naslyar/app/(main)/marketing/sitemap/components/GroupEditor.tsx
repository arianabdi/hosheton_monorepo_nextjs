'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { ErrorToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useSitemap } from '../lib/SitemapProvider';
import { sitemapHref } from '../lib/sections';
import GroupForm from './GroupForm';
import type { SitemapGroupForm } from '../lib/sitemap.types';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

/**
 * پوسته مشترک صفحات افزودن/ویرایش گروه (طبق قرارداد فرم‌های پنل: هدر + راهنمای قبل از ثبت +
 * کارت فرم بخش‌بندی‌شده + اکشن‌ها، بدون تب‌های ماژول).
 */
export default function GroupEditor({
    title,
    subtitle,
    guide,
    initial,
    editMode,
    submitLabel,
    onSubmit,
    headerAction,
}: {
    title: string;
    subtitle: ReactNode;
    guide: ReactNode;
    initial: SitemapGroupForm;
    editMode: boolean;
    submitLabel: string;
    /** true = موفق؛ بعد از آن به فهرست گروه‌ها برمی‌گردد */
    onSubmit: (form: SitemapGroupForm) => Promise<boolean>;
    headerAction?: ReactNode;
}) {
    const router = useRouter();
    const { invalidate } = useSitemap();
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!form.title.trim() || !form.name.trim()) {
            ErrorToaster(new Error('عنوان و شناسه گروه الزامی است.'));
            return;
        }
        if (!form.urlPattern.startsWith('/') && form.source !== 'static') {
            ErrorToaster(new Error('الگوی URL باید با «/» شروع شود.'));
            return;
        }
        setSaving(true);
        const ok = await onSubmit({ ...form, title: form.title.trim() });
        setSaving(false);
        if (ok) {
            invalidate();
            router.push(sitemapHref.groups);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <Link href={sitemapHref.groups} className={parentStyles.backLink}>
                                <LuArrowRight /> بازگشت به گروه‌ها
                            </Link>
                            <h1 className={parentStyles.mainTitle}>{title}</h1>
                            <p className={parentStyles.subtitle}>{subtitle}</p>
                        </div>
                        {headerAction}
                    </header>

                    <div className={hrStyles.formGuideCard}>
                        <h3>قبل از ثبت</h3>
                        <p>{guide}</p>
                    </div>

                    <form className={parentStyles.formCard} onSubmit={submit}>
                        <GroupForm form={form} onChange={setForm} editMode={editMode} />
                        <div className={parentStyles.formActions}>
                            <button type="submit" className={parentStyles.primaryBtn} disabled={saving}>
                                {saving ? 'در حال ذخیره…' : submitLabel}
                            </button>
                            <Link href={sitemapHref.groups} className={parentStyles.secondaryBtn}>
                                انصراف
                            </Link>
                        </div>
                    </form>
                </div>
            </Wrapper>
        </Container>
    );
}
