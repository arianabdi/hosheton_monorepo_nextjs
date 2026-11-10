'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuGrid2X2, LuPlus } from 'react-icons/lu';
import { RiMessageAi3Line } from 'react-icons/ri';
import type { MarketplaceExploreCategory } from '@/app/(marketplace)/lib/types';
import type { TemplateCategoryNode } from '@/app/(marketplace)/lib/explore-taxonomy';
import { ExploreCategoryPicker } from './ExploreCategoryPicker';
import HeaderSearch from '@/app/components/header/components/HeaderSearch/HeaderSearch';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';
import styles from './ExploreCategoryRow.module.scss';

type Props = {
    categories: MarketplaceExploreCategory[];
    activeSlug: string;
    onSelect: (slug: string) => void;
    showChatToggle?: boolean;
    /** درخت دسته‌بندی سلسله‌مراتبی — چیپ انتخابگر اول ردیف موضوع‌ها */
    categoryTree?: TemplateCategoryNode[];
    activeTreeCategory?: TemplateCategoryNode | null;
    onClearTreeCategory?: () => void;
};

/** Inline SVG fallback when a category has no icon set. */
function DefaultIcon() {
    return <LuGrid2X2 size={15} aria-hidden />;
}

function CategoryIcon({ category }: { category: MarketplaceExploreCategory }) {
    if (category.icon?.trim()) {
        return <span className={styles.iconSvg} dangerouslySetInnerHTML={{ __html: category.icon }} />;
    }
    if (category.iconUrl?.trim()) {
        return <img src={category.iconUrl} alt="" className={styles.iconImg} loading="lazy" />;
    }
    return <DefaultIcon />;
}

/** فقط همین دکمه به باز/بسته بودن چت گوش می‌دهد تا کلیکش کل نوار (جستجو، چیپ‌ها) را دوباره رندر نکند */
function ChatToggleButton({ label }: { label: string }) {
    const open = useStudioPersonalChatStore((s) => s.open);
    const toggle = useStudioPersonalChatStore((s) => s.toggle);
    // مهمان هم چت کناری را باز/بسته می‌کند؛ ورود فقط موقع ارسال پیام
    return (
        <button
            type="button"
            className={`${styles.chatToggle} ${open ? styles.chatToggleActive : ''}`}
            onClick={toggle}
            title={label}
            aria-label={label}
            aria-pressed={open}
        >
            <RiMessageAi3Line size={18} />
        </button>
    );
}

export function ExploreCategoryRow({
    categories,
    activeSlug,
    onSelect,
    showChatToggle = true,
    categoryTree = [],
    activeTreeCategory = null,
    onClearTreeCategory,
}: Props) {
    const { t } = useTranslation('common');
    const { t: tm } = useTranslation('menu');
    const { t: tt } = useTranslation('templates');
    const router = useRouter();
    const token = useAuthStore((s) => s.token);

    // مستقیم به فرم ساخت قالب؛ مهمان اول پنجرهٔ ورود و بعد همان فرم
    const onCreateTemplate = () => {
        if (!token) {
            promptGuestLogin('/templates/new');
            return;
        }
        router.push('/templates/new');
    };

    return (
        <div className={styles.stickyBar}>
            <div className={styles.topRow}>
                <HeaderSearch variant="inline" />
                <button
                    type="button"
                    className={styles.chatToggle}
                    onClick={onCreateTemplate}
                    title={tt('create')}
                    aria-label={tt('create')}
                >
                    <LuPlus size={19} />
                </button>
                {showChatToggle ? <ChatToggleButton label={tm('studio_chat')} /> : null}
            </div>
            <div className={styles.filterRow}>
                <ExploreCategoryPicker
                    nodes={categoryTree}
                    active={activeTreeCategory}
                    onClear={() => onClearTreeCategory?.()}
                />
                <div className={styles.row}>
                    <button
                        type="button"
                        className={`${styles.card} ${activeSlug === '' ? styles.cardActive : ''}`}
                        onClick={() => onSelect('')}
                    >
                        <span className={styles.iconSvg}>
                            <LuGrid2X2 size={15} aria-hidden />
                        </span>
                        <span className={styles.cardText}>
                            <strong>{t('all')}</strong>
                        </span>
                    </button>

                    {categories.map((category) => (
                        <button
                            key={category._id}
                            type="button"
                            className={`${styles.card} ${activeSlug === category.slug ? styles.cardActive : ''}`}
                            onClick={() => onSelect(category.slug)}
                        >
                            <CategoryIcon category={category} />
                            <span className={styles.cardText}>
                                <strong>{category.name}</strong>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
