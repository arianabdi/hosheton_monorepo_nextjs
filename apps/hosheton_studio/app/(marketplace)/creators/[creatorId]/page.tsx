'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
    LuArrowLeft,
    LuArrowRight,
    LuEye,
    LuHeart,
    LuLayoutTemplate,
    LuMessageSquare,
    LuPlus,
} from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { mediaThumbLargeSrc } from '@/app/(marketplace)/lib/template-media';
import {
    isMarketplaceTemplateLocked,
    type MarketplacePreviewMedia,
    type MarketplaceTemplateItem,
    type CreatorProfile as CreatorProfileType,
} from '@/app/(marketplace)/lib/types';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import {
    PERSONAL_CHAT_INJECT_KEY,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { previewToChatAttachment } from '@/app/(developers)/projects/[projectId]/chat/explore/StudioExploreGrid';
import { ExploreTemplateCard } from '@/app/(marketplace)/explore/components/ExploreTemplateCard';
import CreatorSalePanel from './CreatorSalePanel';
import CreatorReferralPanel from './CreatorReferralPanel';
import ReferralCardContainer from '@/app/(marketplace)/lib/ReferralCardNew/ReferralCardContainer';
import ProfileSettingsPanel from '@/app/(nosidebar)/settings/profile/ProfileSettingsPanel';
import SecuritySettingsPanel from '@/app/(nosidebar)/settings/security/SecuritySettingsPanel';
import { ExploreDetailModal } from '@/app/(marketplace)/explore/components/ExploreDetailModal';
import { CreatorEmptyState } from './CreatorEmptyState';
import styles from './CreatorProfile.module.scss';

const OWNER_TABS = ['sale', 'referral', 'profile', 'security'] as const;
type CreatorTab = 'work' | (typeof OWNER_TABS)[number];
// «اطلاعات حساب» اول — آیتم پروفایل نوار پایین موبایل مستقیم همین تب را باز می‌کند
const CREATOR_TABS: CreatorTab[] = ['profile', 'work', 'sale', 'referral', 'security'];

export default function CreatorProfilePage() {
    const { t, i18n } = useTranslation('marketplace');
    const { t: tc } = useTranslation('common');
    const { t: ts } = useTranslation('settings');
    const { t: tt } = useTranslation('templates');
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, user } = useAuthStore();
    const appUserId = useAppStore((s) => s.userId);
    const setPersonalChatOpen = useStudioPersonalChatStore((s) => s.setOpen);
    const creatorId = params.creatorId as string;
    const lang = i18n.language;
    const templateQueryId = searchParams.get('template');

    const [profile, setProfile] = useState<CreatorProfileType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<MarketplaceTemplateItem | null>(null);

    const currentUserId = appUserId || user?.id || '';
    // userId در app-storage بعد از خروج می‌ماند — پنل صاحب حساب فقط با توکن
    const isOwnProfile = !!token && !!currentUserId && String(currentUserId) === String(creatorId);
    const tabParam = searchParams.get('tab') === 'verification' ? 'profile' : (searchParams.get('tab') || '');
    const activeTab: CreatorTab = isOwnProfile && OWNER_TABS.includes(tabParam as (typeof OWNER_TABS)[number])
        ? tabParam as CreatorTab
        : 'work';

    const tabRowRef = useRef<HTMLElement>(null);
    const [tabFade, setTabFade] = useState({ start: false, end: false });

    const updateTabFade = useCallback(() => {
        const el = tabRowRef.current;
        const first = el?.firstElementChild as HTMLElement | undefined;
        const last = el?.lastElementChild as HTMLElement | undefined;
        if (!el || !first || !last) {
            setTabFade({ start: false, end: false });
            return;
        }
        const box = el.getBoundingClientRect();
        const firstBox = first.getBoundingClientRect();
        const lastBox = last.getBoundingClientRect();
        const pad = 3;
        const rtl = getComputedStyle(el).direction === 'rtl';
        const start = rtl ? firstBox.right > box.right + pad : firstBox.left < box.left - pad;
        const end = rtl ? lastBox.left < box.left - pad : lastBox.right > box.right + pad;
        setTabFade((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    }, []);

    useLayoutEffect(() => {
        const el = tabRowRef.current;
        if (!el) return;
        updateTabFade();
        const observer = new ResizeObserver(() => updateTabFade());
        observer.observe(el);
        window.addEventListener('resize', updateTabFade);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateTabFade);
        };
    }, [updateTabFade, isOwnProfile, loading]);

    // تب فعال همیشه در دید ردیف تب (مثلاً «امنیت» که در موبایل بیرون از لبه است)
    useEffect(() => {
        const row = tabRowRef.current;
        const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!row || !current) return;
        const rowBox = row.getBoundingClientRect();
        const box = current.getBoundingClientRect();
        if (box.left < rowBox.left) row.scrollBy({ left: box.left - rowBox.left - 12 });
        else if (box.right > rowBox.right) row.scrollBy({ left: box.right - rowBox.right + 12 });
        updateTabFade();
    }, [activeTab, loading, updateTabFade]);

    useEffect(() => {
        marketplaceApi.getCreatorProfile(creatorId)
            .then((data) => {
                setProfile(data);
                setLikedIds(data.templates.filter((item) => item.isLiked).map((item) => item._id));
                setSavedIds(data.templates.filter((item) => item.isBookmarked).map((item) => item._id));
            })
            .catch((err) => setError(getApiErrorMessage(err, t('load_profile_error'))))
            .finally(() => setLoading(false));
    }, [creatorId, t]);

    const templates = useMemo(() => {
        if (!profile) return [];
        const creator = {
            _id: profile.creator._id,
            fullName: profile.creator.fullName,
            avatar: profile.creator.avatar,
            bio: profile.creator.bio,
        };
        return profile.templates.map((item) => ({ ...item, creator: item.creator || creator }));
    }, [profile]);

    const featured = templates.find((item) => item.primaryPreview || item.previewMedia?.length);

    const replaceQuery = useCallback((templateId: string | null) => {
        const next = new URLSearchParams(searchParams.toString());
        if (templateId) next.set('template', templateId);
        else next.delete('template');
        const qs = next.toString();
        router.replace(qs ? `/creators/${creatorId}?${qs}` : `/creators/${creatorId}`, { scroll: false });
    }, [creatorId, router, searchParams]);

    const closeModal = useCallback(() => {
        setSelectedItem(null);
        if (templateQueryId) replaceQuery(null);
    }, [replaceQuery, templateQueryId]);

    const openDetail = (item: MarketplaceTemplateItem) => {
        setSelectedItem(item);
        replaceQuery(item._id);
    };

    useEffect(() => {
        if (!templateQueryId || !templates.length) return;
        const match = templates.find((item) => item._id === templateQueryId);
        if (match) {
            setSelectedItem((current) => (current?._id === match._id ? current : match));
        }
    }, [templateQueryId, templates]);

    const applyItemPatch = (id: string, patch: Partial<MarketplaceTemplateItem>) => {
        setProfile((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                templates: prev.templates.map((item) => (item._id === id ? { ...item, ...patch } : item)),
            };
        });
        setSelectedItem((current) => (current && current._id === id ? { ...current, ...patch } : current));
    };

    const toggleLike = async (id: string) => {
        if (!token) { useLoginModalStore.getState().openLoginModal(); return; }
        const wasLiked = likedIds.includes(id);
        const current = templates.find((item) => item._id === id) || selectedItem;
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        setLikedIds((prev) => (wasLiked ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isLiked: !wasLiked, likeCount: nextCount });
        setProfile((prev) => prev ? {
            ...prev,
            stats: {
                ...prev.stats,
                totalLikes: Math.max((prev.stats.totalLikes || 0) + (wasLiked ? -1 : 1), 0),
            },
        } : prev);
        try {
            const res = await marketplaceApi.toggleLike(id);
            setLikedIds((prev) => (res.liked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isLiked: res.liked, likeCount: res.likeCount });
        } catch (err) {
            setLikedIds((prev) => (wasLiked ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isLiked: wasLiked, likeCount: current?.likeCount || 0 });
            setProfile((prev) => prev ? {
                ...prev,
                stats: {
                    ...prev.stats,
                    totalLikes: Math.max((prev.stats.totalLikes || 0) + (wasLiked ? 1 : -1), 0),
                },
            } : prev);
            setError(getApiErrorMessage(err, t('like_error')));
        }
    };

    const toggleSave = async (id: string) => {
        if (!token) { useLoginModalStore.getState().openLoginModal(); return; }
        const wasSaved = savedIds.includes(id);
        setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isBookmarked: !wasSaved });
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            setSavedIds((prev) => (res.bookmarked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isBookmarked: res.bookmarked });
        } catch (err) {
            setSavedIds((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isBookmarked: wasSaved });
            setError(getApiErrorMessage(err, t('save_error')));
        }
    };

    const handleUseTemplate = async (item: MarketplaceTemplateItem) => {
        if (isMarketplaceTemplateLocked(item)) {
            openDetail(item);
            return;
        }
        if (!token) { useLoginModalStore.getState().openLoginModal(); return; }
        try {
            const { spaces } = await mediaApi.listSpaces();
            const spaceId = spaces[0]?._id;
            if (!spaceId) {
                router.push('/projects/new');
                return;
            }
            const project = await mediaApi.createProject({
                title: t('from_template'),
                templateId: item._id,
                spaceId,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('from_template_error')));
        }
    };

    const handlePurchase = (item: MarketplaceTemplateItem) => {
        if (!token) { useLoginModalStore.getState().openLoginModal(); return; }
        router.push(`/explore/buy/${item._id}`);
    };

    const injectToPersonalChat = (payload: {
        prompt?: string;
        attachments?: ReturnType<typeof previewToChatAttachment>[];
    }) => {
        // مهمان هم می‌تواند به چت ببرد؛ ورود فقط موقع ارسال
        writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, payload);
        setPersonalChatOpen(true);
        closeModal();
    };

    const handleGetInTouch = () => {
        if (!token) { useLoginModalStore.getState().openLoginModal(); return; }
        router.push(`/messages?to=${creatorId}`);
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingDots}>
                        <span className={styles.loadingDot} />
                        <span className={styles.loadingDot} />
                        <span className={styles.loadingDot} />
                    </div>
                    <p className={styles.loadingText}>{tc('loading')}</p>
                </div>
            </div>
        );
    }
    if (error && !profile) {
        return <div className={styles.page}><p className={styles.error}>{error || t('not_found')}</p></div>;
    }
    if (!profile) return null;

    const { creator, stats } = profile;
    const featuredPreview = featured?.previewMedia?.find((media) => media.isCover)
        || featured?.primaryPreview
        || featured?.previewMedia?.[0]
        || null;
    const BackIcon = i18n.dir(lang) === 'rtl' ? LuArrowRight : LuArrowLeft;

    const tabLabel = (id: CreatorTab) => ({
        work: t('work_my'),
        sale: t('sale'),
        referral: t('referral_tab'),
        profile: ts('account_info'),
        security: ts('security'),
    })[id];

    const tabDescription = (id: CreatorTab) => ({
        work: t('creator_hub_work'),
        sale: t('creator_hub_sale'),
        referral: t('creator_hub_referral'),
        profile: ts('account_desc'),
        security: ts('security_desc'),
    })[id];

    const statsRow = (
        <div className={styles.stats}>
            <span className={styles.stat}>
                <LuLayoutTemplate size={15} aria-hidden />
                {t('templates_n', { count: formatAppNumber(stats.templateCount, lang) })}
            </span>
            <span className={styles.stat}>
                <LuEye size={15} aria-hidden />
                {t('views_n', { count: formatAppNumber(stats.totalViews, lang) })}
            </span>
            <span className={styles.stat}>
                <LuHeart size={15} aria-hidden />
                {t('likes_n', { count: formatAppNumber(stats.totalLikes || 0, lang) })}
            </span>
        </div>
    );

    const hero = (
        <header className={styles.hero}>
            <div className={styles.heroCopy}>
                <div className={styles.identity}>
                    {creator.avatar ? (
                        <img src={creator.avatar} alt={creator.fullName} className={styles.avatar} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>{creator.fullName.charAt(0)}</div>
                    )}
                    <div className={styles.identityText}>
                        <h2 className={styles.name}>{creator.fullName}</h2>
                        {statsRow}
                    </div>
                </div>
                <p className={styles.bio}>
                    {creator.bio || t('creator_templates', { name: creator.fullName })}
                </p>
                {!isOwnProfile && (
                    <div className={styles.actions}>
                        <button type="button" className={styles.primaryBtn} onClick={handleGetInTouch}>
                            <LuMessageSquare size={16} aria-hidden />
                            {token ? t('get_in_touch') : t('login_to_message')}
                        </button>
                    </div>
                )}
            </div>
            {isOwnProfile ? (
                // کارت دعوت کاربر (کد + مجموع پاداش) — جایگزین پیش‌نمایش featured در پنل کاربری
                <div className={styles.heroAside}>
                    <ReferralCardContainer reportHref={`/creators/${creatorId}?tab=referral`} />
                </div>
            ) : (
                featuredPreview && (
                    <button
                        type="button"
                        className={styles.featured}
                        onClick={() => featured && openDetail(featured)}
                    >
                        <img src={mediaThumbLargeSrc(featuredPreview)} alt={featured?.title || creator.fullName} />
                    </button>
                )
            )}
        </header>
    );

    const workGrid = templates.length === 0 ? (
        <CreatorEmptyState
            name={creator.fullName}
            isOwnProfile={isOwnProfile}
            onCreate={() => router.push('/templates/new')}
        />
    ) : (
        <div className={styles.squareGrid}>
            {templates.map((item) => (
                <ExploreTemplateCard
                    key={item._id}
                    item={item}
                    square
                    isLiked={likedIds.includes(item._id)}
                    isSaved={savedIds.includes(item._id)}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleSave}
                    onOpenDetail={openDetail}
                />
            ))}
        </div>
    );

    return (
        <div className={`${styles.page} ${isOwnProfile ? styles.pageHub : ''}`}>
            {isOwnProfile ? (
                // پنل کاربری مثل هاب قالب‌ها: اول عنوان + تب‌ها، بعد محتوای همان تب
                <>
                    <header className={styles.hubHeader}>
                        <div className={styles.hubTop}>
                            <div>
                                <h1 className={styles.hubTitle}>{t('creator_hub_title')}</h1>
                                <p className={styles.hubSubtitle}>{tabDescription(activeTab)}</p>
                            </div>
                            <Link href="/templates/new" className={styles.createBtn}>
                                <LuPlus size={18} aria-hidden />
                                {tt('create_new')}
                            </Link>
                        </div>

                        <div
                            className={`${styles.tabScroller} ${tabFade.start ? styles.fadeStart : ''} ${tabFade.end ? styles.fadeEnd : ''}`}
                        >
                            <nav
                                className={styles.tabRow}
                                ref={tabRowRef}
                                onScroll={updateTabFade}
                                aria-label={t('creator_hub_nav_aria')}
                            >
                                {CREATOR_TABS.map((id) => {
                                    const isActive = activeTab === id;
                                    return (
                                        <Link
                                            key={id}
                                            href={id === 'work' ? `/creators/${creatorId}` : `/creators/${creatorId}?tab=${id}`}
                                            replace
                                            scroll={false}
                                            className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {tabLabel(id)}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </header>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.tabContent}>
                        {activeTab === 'sale' ? (
                            <CreatorSalePanel />
                        ) : activeTab === 'referral' ? (
                            <CreatorReferralPanel />
                        ) : activeTab === 'profile' ? (
                            <div className={styles.settingsEmbed}><ProfileSettingsPanel /></div>
                        ) : activeTab === 'security' ? (
                            <div className={styles.settingsEmbed}><SecuritySettingsPanel /></div>
                        ) : (
                            <>
                                {hero}
                                {workGrid}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <Link href="/explore" className={styles.backLink}>
                        <BackIcon size={18} aria-hidden /> {tc('back')}
                    </Link>

                    {error && <p className={styles.error}>{error}</p>}

                    {hero}

                    <section>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>{t('work_other')}</h2>
                            <span className={styles.sectionCount}>
                                {formatAppNumber(templates.length, lang)}
                            </span>
                        </div>
                        {workGrid}
                    </section>
                </>
            )}

            <ExploreDetailModal
                item={selectedItem}
                isLiked={selectedItem ? likedIds.includes(selectedItem._id) : false}
                isSaved={selectedItem ? savedIds.includes(selectedItem._id) : false}
                isLoggedIn={!!token}
                onClose={closeModal}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onUseProject={handleUseTemplate}
                onUsePrompt={(prompt) => injectToPersonalChat({ prompt })}
                onUseAsTemplate={(media: MarketplacePreviewMedia) => injectToPersonalChat({
                    attachments: [previewToChatAttachment(media)],
                })}
                onPurchase={handlePurchase}
                onOpenItem={(detail) => {
                    setSelectedItem((current) => {
                        if (!current || current._id === detail._id) return { ...(current || {}), ...detail };
                        replaceQuery(detail._id);
                        return detail;
                    });
                    applyItemPatch(detail._id, detail);
                    setLikedIds((prev) => detail.isLiked
                        ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                        : prev.filter((id) => id !== detail._id));
                    setSavedIds((prev) => detail.isBookmarked
                        ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                        : prev.filter((id) => id !== detail._id));
                }}
            />
        </div>
    );
}
