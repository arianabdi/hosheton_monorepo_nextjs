'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { LuCat, LuClapperboard, LuFlaskConical, LuPalette, LuScanSearch, LuWrench } from 'react-icons/lu';
import { VscDeveloperTools, VscInspect } from 'react-icons/vsc';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { canUseDeveloperTools, hasRole } from '@/app/lib/user-roles';
import { useQaConsoleStore } from '@/app/zustand/store/useQaConsoleStore';
import { useDeveloperToolsStore } from '@/app/zustand/store/useDeveloperToolsStore';
import { useChatCostEstimateStore } from '@/app/zustand/store/useChatCostEstimateStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { useMaintenanceStore } from '@/app/zustand/store/useMaintenanceStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { useBannerDevStore } from '@/app/(studio)/banner/banner-dev.store';
import MiniIconLight from '@/app/assets/hooshetun/mini-icon-light.svg';
import styles from './DeveloperMenu.module.scss';

type DeveloperMenuProps = {
    /** fixed = دسکتاپ کنار سایدبار؛ inline = موبایل کنار لوگو در هدر */
    placement?: 'fixed' | 'inline';
};

type DeveloperMenuItem = {
    key: string;
    icon: IconType;
    label: string;
    title?: string;
    onClick: () => void;
    disabled?: boolean;
    /** کم‌رنگ (غیرقابل استفاده در این صفحه) — مثل تخمین هزینه بیرون از چت */
    dimmed?: boolean;
    active?: boolean;
    /** روشن بودن سوییچ — پسوند « — فعال» */
    on?: boolean;
};

function isChatPath(pathname: string | null): boolean {
    if (!pathname) return false;
    if (pathname === '/chat' || pathname.startsWith('/chat/')) return true;
    return /^\/projects\/[^/]+\/chat(?:\/|$)/.test(pathname);
}

const subscribeNoop = () => () => {};
const getHydrated = () => true;
const getNotHydrated = () => false;

/**
 * منوی شناور توسعه‌دهنده — فقط برای admin / super-admin.
 * آیتم‌ها: Developer Panel، تخمین هزینه (فقط چت)، و QA برای super-admin.
 */
export default function DeveloperMenu({ placement = 'fixed' }: DeveloperMenuProps) {
    const { t } = useTranslation('common');
    const { t: tMenu } = useTranslation('menu');
    const pathname = usePathname();
    const router = useRouter();
    const roles = useAppStore((state) => state.roles);
    const canUseDevTools = canUseDeveloperTools(roles);
    const isSuperAdmin = hasRole(roles, 'super-admin');
    const personalChatOpen = useStudioPersonalChatStore((state) => state.open);
    const chatActive = isChatPath(pathname) || (Boolean(pathname?.startsWith('/explore')) && personalChatOpen);
    const openQaConsole = useQaConsoleStore((state) => state.openQaConsole);
    const openDeveloperTools = useDeveloperToolsStore((state) => state.openDeveloperTools);
    const toggleChatCostEstimate = useChatCostEstimateStore((state) => state.toggleChatCostEstimate);
    const costButtonEnabled = useChatCostEstimateStore((state) => state.buttonEnabled);
    const bannerHighlight = useBannerDevStore((state) => state.enabled);
    const toggleBannerHighlight = useBannerDevStore((state) => state.toggle);
    // حالت نگهداری — خواندن وضعیت + سوییچ از طریق system-setting
    const maintenanceEnabled = useMaintenanceStore((state) => state.enabled);
    const fetchMaintenanceStatus = useMaintenanceStore((state) => state.fetchStatus);
    const maintenanceToken = useAuthStore((state) => state.token);
    const [maintenanceBusy, setMaintenanceBusy] = useState(false);
    const lang = useAppStore((state) => state.lang);
    const isFa = lang !== 'en';
    const [menuOpen, setMenuOpen] = useState(false);
    /* بعد از hydration true می‌شود — جای setState داخل effect (قانون react-hooks/set-state-in-effect) */
    const mounted = useSyncExternalStore(subscribeNoop, getHydrated, getNotHydrated);
    const rootRef = useRef<HTMLDivElement>(null);
    // منوی موبایل به body پورتال می‌شود و داخل rootRef نیست
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target || rootRef.current?.contains(target) || mobileMenuRef.current?.contains(target)) return;
            setMenuOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        // دکمه inline بالای ۷۶۸px مخفی است؛ پنجره پورتال‌شده‌اش هم نباید باز بماند
        const desktop = window.matchMedia('(min-width: 769px)');
        const onViewportChange = () => {
            if (placement === 'inline' && desktop.matches) setMenuOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        desktop.addEventListener('change', onViewportChange);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            desktop.removeEventListener('change', onViewportChange);
        };
    }, [menuOpen, placement]);

    if (!canUseDevTools) return null;

    const openDeveloperPanel = () => {
        setMenuOpen(false);
        openDeveloperTools();
    };

    const openSystemDesign = () => {
        setMenuOpen(false);
        router.push('/system-design');
    };

    const openAnimations = () => {
        setMenuOpen(false);
        router.push('/animations');
    };

    const openAdsVideo = () => {
        setMenuOpen(false);
        router.push('/ads-video');
    };

    const openAds2Video = () => {
        setMenuOpen(false);
        router.push('/ads-2video');
    };

    const openCostEstimate = () => {
        if (!chatActive) return;
        setMenuOpen(false);
        toggleChatCostEstimate();
    };

    const openQa = () => {
        setMenuOpen(false);
        openQaConsole();
    };

    const toggleBannerLocations = () => {
        setMenuOpen(false);
        toggleBannerHighlight();
    };

    /** سوییچ حالت نگهداری — website.info را می‌خواند، maintenanceEnabled را معکوس و ذخیره می‌کند */
    const toggleMaintenance = async () => {
        if (maintenanceBusy) return;
        setMaintenanceBusy(true);
        try {
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
            const headers = { authorization: `Bearer ${maintenanceToken}` };
            const res = await axios.get(`${apiUrl}/api/system-setting/public/website`);
            const info = res.data?.data?.info || {};
            await axios.patch(
                `${apiUrl}/api/system-setting/${encodeURIComponent('website.info')}`,
                { value: { ...info, maintenanceEnabled: !maintenanceEnabled } },
                { headers },
            );
            SuccessToaster({
                message: isFa
                    ? (maintenanceEnabled ? 'حالت نگهداری خاموش شد' : 'حالت نگهداری فعال شد — همه‌ی کاربران صفحه‌ی بروزرسانی می‌بینند')
                    : (maintenanceEnabled ? 'Maintenance mode disabled' : 'Maintenance mode enabled — all users now see the update screen'),
            });
            await fetchMaintenanceStatus();
        } catch (err) {
            notifyError(err);
        } finally {
            setMaintenanceBusy(false);
        }
    };

    const items: DeveloperMenuItem[] = [
        {
            key: 'developer-panel',
            icon: VscDeveloperTools,
            label: t('developers_panel'),
            onClick: openDeveloperPanel,
        },
        {
            key: 'system-design',
            icon: LuPalette,
            label: isFa ? 'سیستم دیزاین' : 'System Design',
            title: isFa ? 'رفتن به صفحهٔ سیستم دیزاین' : 'Open the system design page',
            onClick: openSystemDesign,
        },
        {
            key: 'animations',
            icon: LuCat,
            label: isFa ? 'انیمیشن‌ها' : 'Animations',
            title: isFa ? 'جزئیات، کلیدها و آزمایش انیمیشن‌های گربهٔ چت' : 'Inspect, toggle and test the chat cat animations',
            onClick: openAnimations,
            active: Boolean(pathname?.startsWith('/animations')),
        },
        {
            key: 'ads-video',
            icon: LuClapperboard,
            label: tMenu('ads_video'),
            title: isFa ? 'استودیو تولید ویدیو تبلیغاتی' : 'Ads video studio',
            onClick: openAdsVideo,
        },
        {
            key: 'ads-2video',
            icon: LuClapperboard,
            label: tMenu('ads_2video'),
            title: isFa ? 'پخش و مدیریت کات‌های تبلیغاتی' : 'Ads cuts preview',
            onClick: openAds2Video,
        },
        {
            key: 'cost-estimate',
            icon: VscInspect,
            label: t('cost_estimate'),
            title: chatActive ? t('cost_estimate') : t('cost_estimate_chat_only'),
            onClick: openCostEstimate,
            disabled: !chatActive,
            dimmed: !chatActive,
            active: costButtonEnabled,
            on: costButtonEnabled,
        },
        {
            key: 'banner-locations',
            icon: LuScanSearch,
            label: bannerHighlight
                ? isFa
                    ? 'پنهان‌کردن لوکیشن بنرها'
                    : 'Hide banner placements'
                : isFa
                    ? 'نمایش لوکیشن بنرها'
                    : 'Show banner placements',
            title: isFa ? 'نمایش/پنهان‌کردن لوکیشن بنرها روی صفحات' : 'Show/hide banner placements on pages',
            onClick: toggleBannerLocations,
            active: bannerHighlight,
        },
        {
            key: 'maintenance',
            icon: LuWrench,
            label: t('developer_maintenance'),
            title: isFa ? 'بستن کل پلتفرم با صفحه‌ی بروزرسانی' : 'Close the whole platform with the update screen',
            onClick: toggleMaintenance,
            disabled: maintenanceBusy,
            active: maintenanceEnabled,
            on: maintenanceEnabled,
        },
        ...(isSuperAdmin
            ? [{
                key: 'qa',
                icon: LuFlaskConical,
                label: t('qa_trigger'),
                onClick: openQa,
            }]
            : []),
    ];

    const menuItems = items.map((item) => (
        <button
            key={item.key}
            type="button"
            className={`${styles.menuItem} ${item.dimmed ? styles.menuItemDisabled : ''} ${item.active ? styles.menuItemActive : ''}`}
            role="menuitem"
            disabled={item.disabled}
            aria-disabled={item.dimmed || undefined}
            title={item.title}
            onClick={item.onClick}
        >
            <span className={styles.menuIcon}>
                <item.icon size={16} />
            </span>
            <span>
                {item.label}
                {item.on ? (isFa ? ' — فعال' : ' — on') : ''}
            </span>
        </button>
    ));

    /** موبایل: همان منو، فقط در جای پنجره پروفایل (تمام‌عرض زیر هدر، با پس‌زمینه تیره) */
    const mobileMenu = (
        <>
            <button
                type="button"
                className={styles.mobileBackdrop}
                aria-label={t('developer_menu')}
                onClick={() => setMenuOpen(false)}
            />
            <div ref={mobileMenuRef} className={`${styles.menu} ${styles.menuMobile}`} role="menu">
                {menuItems}
            </div>
        </>
    );

    const ui = (
        <div
            className={`${styles.anchor} ${placement === 'fixed' ? styles.fixed : styles.inline}`}
            ref={rootRef}
            aria-label={t('developer_menu')}
        >
            <button
                type="button"
                className={styles.trigger}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title={t('developer_menu')}
                aria-label={t('developer_menu')}
                onClick={() => setMenuOpen((open) => !open)}
            >
                <Image
                    src={MiniIconLight}
                    alt=""
                    className={styles.triggerIcon}
                    width={20}
                    height={20}
                />
            </button>

            {menuOpen && placement === 'fixed' && (
                <div className={styles.menu} role="menu">
                    {menuItems}
                </div>
            )}
            {menuOpen && placement === 'inline' && mounted && createPortal(mobileMenu, document.body)}
        </div>
    );

    if (placement === 'inline') return ui;
    if (!mounted) return null;
    return createPortal(ui, document.body);
}
