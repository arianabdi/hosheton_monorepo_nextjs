'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@my-workspace/components';
import { toFarsiNumber } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { navItems, type NavItem, type NavSubItem } from '@/app/config/navigation';
import { filterNavItemsByApp } from '@/app/config/navigation-utils';
import { LuArrowLeft, LuSearch, LuX } from 'react-icons/lu';
import styles from './home.module.scss';

const APP_LABELS: Record<string, string> = {
    lingeeko: 'Lingeeko',
    hosheton: 'Hosheton',
    taskvision: 'TaskVision',
    openforex: 'OpenForex',
};

/** One-line explanation of each top-level menu, keyed by its href. */
const SECTION_SUMMARIES: Record<string, string> = {
    '/publications/review': 'بررسی ربات‌هایی که برای انتشار فرستاده شده‌اند، نظرات مارکت‌پلیس و تاریخچهٔ خریدها.',
    '/blog': 'نوشتن و انتشار مقاله و مستندات، تولید محتوا با AI و مرتب‌کردن آن‌ها در دسته و سری.',
    '/projects/nodes': 'نودها، قالب‌ها، آواتارها و دسته‌بندی‌هایی که پشت استودیو کار می‌کنند.',
    '/users': 'پیدا کردن کاربر، بررسی حساب و تعیین نقش و دسترسی‌ها.',
    '/dictionary': 'واژگان، ترجمه‌ها و گرامرهای لینگیکو و جاب‌های پردازش آن‌ها.',
    '/films': 'کتابخانهٔ فیلم، بازیگران و کارگردانان و واژگانی که از فیلم‌ها استخراج شده.',
    '/providers': 'سرویس‌های هوش مصنوعی، مدل‌ها و حساب‌های مصرف، به‌همراه هشدار شارژ.',
    '/agent-chat/settings': 'قابلیت‌ها و رفتار دستیار هوشمند تسک‌ویژن.',
    '/subscription': 'پلن‌ها، قیمت‌ها و سقف هر ویژگی؛ و اینکه هر کاربر چه اشتراکی دارد و چقدر مصرف کرده.',
    '/billing': 'درگاه پرداخت، فاکتورها، کد تخفیف و تنظیمات مالیات و مارکاپ.',
    '/marketing': 'آنالیتیکس، پیامک خودکار، بنرها و برنامهٔ همکاری و پورسانت.',
    '/marketing/automation': 'پیامک خودکار بر اساس رفتار کاربر: تریگر، پترن، سناریو و گزارش ارسال.',
    '/marketing/partnership': 'همکاران، پورسانت، تسویه و ردیابی ترافیک ارجاعی.',
    '/management/documents': 'مخزن اسناد سازمان با پوشه‌بندی، کارتابل تأیید و لینک اشتراک.',
    '/management/mettings': 'زمان‌بندی جلسه، صورتجلسه و پیگیری مصوبات با یادآور پیامکی.',
    '/support': 'تیکت‌های کاربران و درخواست‌های تأیید آواتار و قالب.',
    '/settings/website': 'اطلاعات عمومی سایت، بک‌آپ دیتابیس و گزارش نسخه‌ها.',
};

/** Long link lists are collapsed to this many rows until expanded. */
const COLLAPSED_LINKS = 5;

type HomeSection = {
    key: string;
    item: NavItem;
    summary: string;
    links: NavSubItem[];
};

function normalize(text: string) {
    return text.toLowerCase().replace(/‌/g, '').replace(/\s+/g, ' ').trim();
}

function fallbackSummary(item: NavItem) {
    const names = (item.subItems ?? []).slice(0, 3).map((s) => s.title.trim());
    if (!names.length) return 'ورود به این بخش از پنل.';
    return `شامل ${names.join('، ')}${(item.subItems?.length ?? 0) > 3 ? ' و …' : ''}`;
}

export default function HomePage() {
    const { appName, appVariant, baseUrl, name } = useAppStore();
    const userName = useAuthStore((s) => s.user?.name);
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState<string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    // «/» jumps to the search box, like most admin tools.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (e.key !== '/' || target?.closest('input, textarea, [contenteditable="true"]')) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const sections = useMemo<HomeSection[]>(() => {
        if (!appName) return [];
        return filterNavItemsByApp(navItems, appName, appVariant, baseUrl)
            // «کتاب ها» points to the films section, so it would only repeat it here.
            .filter((item) => item.href !== '/home' && item.title !== 'کتاب ها')
            .map((item) => ({
                key: `${item.href}-${item.title}`,
                item,
                summary: SECTION_SUMMARIES[item.href] || fallbackSummary(item),
                links: item.subItems?.length ? item.subItems : [{ title: `ورود به ${item.title.trim()}`, href: item.href }],
            }));
    }, [appName, appVariant, baseUrl]);

    const q = normalize(query);
    const visibleSections = useMemo(() => {
        if (!q) return sections;
        return sections
            .map((section) => {
                // Matching page names win; a match on the section title or summary alone shows all its pages.
                const linkMatches = section.links.filter((link) => normalize(link.title).includes(q));
                const sectionMatch = normalize(`${section.item.title} ${section.summary}`).includes(q);
                const links = linkMatches.length ? linkMatches : sectionMatch ? section.links : [];
                return links.length ? { ...section, links } : null;
            })
            .filter((s): s is HomeSection => s !== null);
    }, [sections, q]);

    if (!appName) {
        return <LoadingState />;
    }

    const appLabel = name?.trim() || APP_LABELS[appName] || appName;
    const pageCount = sections.reduce((sum, s) => sum + s.links.length, 0);
    const firstName = userName?.trim().split(' ')[0];

    const toggle = (key: string) =>
        setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <span className={styles.appBadge}>{appLabel}</span>
                    <h1 className={styles.title}>{firstName ? `سلام ${firstName}، خوش آمدید` : 'خوش آمدید'}</h1>
                    <p className={styles.lead}>
                        همهٔ بخش‌های پنل {appLabel} اینجا یک‌جا جمع شده‌اند. بخش مورد نظر را جستجو کنید یا از
                        فهرست زیر مستقیم وارد صفحه‌اش شوید.
                    </p>
                </div>
                <dl className={styles.stats}>
                    <div>
                        <dt>بخش</dt>
                        <dd>{toFarsiNumber(sections.length)}</dd>
                    </div>
                    <div>
                        <dt>صفحه</dt>
                        <dd>{toFarsiNumber(pageCount)}</dd>
                    </div>
                </dl>
            </header>

            <label className={styles.search}>
                <LuSearch size={18} aria-hidden />
                <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    placeholder="دنبال چه صفحه‌ای هستید؟ مثلاً «کد تخفیف» یا «کاربران»"
                    aria-label="جستجوی بخش‌های پنل"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setQuery('');
                    }}
                />
                {query ? (
                    <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="پاک کردن جستجو">
                        <LuX size={16} />
                    </button>
                ) : (
                    <kbd className={styles.kbd} aria-hidden>/</kbd>
                )}
            </label>

            {q ? (
                <p className={styles.resultLine}>
                    {visibleSections.length
                        ? `${toFarsiNumber(visibleSections.reduce((n, s) => n + s.links.length, 0))} صفحه برای «${query.trim()}» پیدا شد`
                        : null}
                </p>
            ) : null}

            {visibleSections.length ? (
                <div className={styles.grid}>
                    {visibleSections.map((section) => {
                        const Icon = section.item.icon;
                        const isOpen = Boolean(q) || expanded.includes(section.key);
                        const canCollapse = section.links.length > COLLAPSED_LINKS + 1;
                        const links = canCollapse && !isOpen ? section.links.slice(0, COLLAPSED_LINKS) : section.links;

                        return (
                            <section key={section.key} className={styles.section}>
                                <Link href={section.item.href} className={styles.sectionHead}>
                                    {Icon ? (
                                        <span className={styles.icon} aria-hidden>
                                            <Icon size={18} strokeWidth={1.75} />
                                        </span>
                                    ) : null}
                                    <span className={styles.sectionTitle}>{section.item.title.trim()}</span>
                                    <span className={styles.sectionCount}>{toFarsiNumber(section.links.length)}</span>
                                </Link>
                                <p className={styles.summary}>{section.summary}</p>

                                <ul className={styles.links}>
                                    {links.map((link) => (
                                        <li key={link.href}>
                                            <Link href={link.href} className={styles.link}>
                                                <span>{link.title.trim()}</span>
                                                <LuArrowLeft size={14} aria-hidden />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                {canCollapse && !q ? (
                                    <button type="button" className={styles.more} onClick={() => toggle(section.key)}>
                                        {isOpen
                                            ? 'نمایش کمتر'
                                            : `${toFarsiNumber(section.links.length - COLLAPSED_LINKS)} صفحهٔ دیگر`}
                                    </button>
                                ) : null}
                            </section>
                        );
                    })}
                </div>
            ) : (
                <div className={styles.empty}>
                    <p>صفحه‌ای با «{query.trim()}» پیدا نشد.</p>
                    <span>کلمهٔ کوتاه‌تری امتحان کنید یا از منوی کناری بخش را پیدا کنید.</span>
                    <button type="button" className={styles.more} onClick={() => setQuery('')}>
                        پاک کردن جستجو
                    </button>
                </div>
            )}
        </div>
    );
}
