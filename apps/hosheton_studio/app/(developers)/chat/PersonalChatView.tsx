'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuBug, LuHistory, LuImages, LuMessageSquare, LuPanelRight, LuPlus } from 'react-icons/lu';
import { ModalCloseButton, ModalHelper } from '@my-workspace/components';
import ChatInput from '@/app/(developers)/projects/[projectId]/chat/chatInput/ChatInput';
import ChatHistoryPanel from '@/app/(developers)/projects/[projectId]/chat/explore/ChatHistoryPanel';
import ChatMessages from '@/app/(developers)/projects/[projectId]/chat/v1/ChatMessages';
import ChatMessagesV2 from '@/app/(developers)/projects/[projectId]/chat/v2/ChatMessagesV2';
import { ChatTranscriptLayout } from '@/app/(developers)/projects/[projectId]/chat/v1/ChatTranscriptLayout';
import { ChatEmptyStage } from '@/app/(developers)/projects/[projectId]/chat/empty/ChatEmptyStage';
import { BannerBox, BANNER_PLACEMENTS } from '@/app/(studio)/banner';
import { useChatSession } from '@/app/(developers)/projects/[projectId]/chat/ChatSessionContext';
import { useChatViewPreference, type ChatView } from '@/app/(developers)/projects/[projectId]/chat/lib/useChatViewPreference';
import { GalleryModal, galleryItemToPreviewMedia } from '@/app/(developers)/gallery';
import { useChatCostEstimateStore } from '@/app/zustand/store/useChatCostEstimateStore';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import ChatViewSwitcher from '@/app/(developers)/projects/[projectId]/chat/ChatViewSwitcher';
import { SidebarTabBar } from '@/app/(developers)/projects/components/SidebarTabBar/SidebarTabBar';
import { ProcessLogPanel } from '@/app/(developers)/projects/[projectId]/components/ProcessLogPanel/ProcessLogPanel';
import { CommentsPanel } from '@/app/(developers)/projects/[projectId]/components/CommentsPanel/CommentsPanel';
import { TemplateBuilderTab } from './components/TemplateBuilder/TemplateBuilderTab';
import styles from './PersonalChat.module.scss';

const HISTORY_PANEL_OPEN_KEY = 'hosheton:project-chat-history-open';

/** وضعیت باز بودن پنل تاریخچه چت پروژه — راحتی همین بیننده؛ بدون storage هم درست کار می‌کند */
function readHistoryPanelOpen() {
    try {
        return window.localStorage.getItem(HISTORY_PANEL_OPEN_KEY) === '1';
    } catch {
        return false;
    }
}

function writeHistoryPanelOpen(open: boolean) {
    try {
        window.localStorage.setItem(HISTORY_PANEL_OPEN_KEY, open ? '1' : '0');
    } catch {
        // storage در دسترس نیست — فقط همین نشست
    }
}

/**
 * تاریخچهٔ چت در موبایل: پنجرهٔ تمام‌صفحه هم‌سبک گالری (هدر آیکون + عنوان + ✕)، نه BottomSheet.
 * z-index زیر ModalHelper تا منوی ⋯ و تأیید حذف آیتم‌ها رویش باز شوند.
 */
function HistoryWindow({
    open,
    onClose,
    title,
    closeLabel,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    closeLabel: string;
    children: ReactNode;
}) {
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            // مودال/منوی باز روی پنجره Escape خودش را دارد
            if (event.key !== 'Escape' || document.querySelector('[role="dialog"][aria-modal="true"]:not([data-history-window])')) return;
            onCloseRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div className={styles.historyWindow} role="dialog" aria-modal="true" aria-label={title} data-history-window>
            <header className={styles.historyWindowHeader}>
                <div className={styles.historyWindowTitle}>
                    <span className={styles.historyWindowIcon} aria-hidden><LuHistory size={18} /></span>
                    <h2>{title}</h2>
                </div>
                <ModalCloseButton placement="inline" onClick={onClose} aria-label={closeLabel} />
            </header>
            <div className={styles.historyWindowBody}>{children}</div>
        </div>,
        document.body,
    );
}

export default function PersonalChatView({
    layout,
    showGallery = true,
    historyVariant = 'docked',
}: {
    layout: 'page' | 'slide';
    showGallery?: boolean;
    /**
     * docked = سایدبار کشویی چت عادی.
     * panel = چت پروژه: باکس هم‌سبک سایدبار ورک‌فلو که با باز شدن کنار چت می‌نشیند
     * (چت در فضای باقی‌مانده وسط می‌شود) و تا بستن دستی باز می‌ماند.
     */
    historyVariant?: 'docked' | 'panel';
}) {
    const {
        hasTranscript,
        loading,
        chat,
        newChat,
        connectionOk,
        projectId,
        liveLogs,
        addAttachments,
    } = useChatSession();
    // تب فعال پنل چت پروژه (مثل activeRightPanel ورک‌فلو)
    const [panelTab, setPanelTab] = useState<'history' | 'logs' | 'comments'>('history');
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const contentDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    const isNarrow = useMobileViewport('(max-width: 900px)');
    // همان مرز موبایل سایدبار ورک‌فلو (۷۶۸px)
    const isPhone = useMobileViewport();
    const historyAsPanel = historyVariant === 'panel';
    // پنل چت پروژه مثل سایدبار ورک‌فلو: دسکتاپ کنار چت ثابت؛ موبایل از کنار کشویی روی چت
    const historyPanelDocked = historyAsPanel && !isPhone;
    const historyPanelOverlay = historyAsPanel && isPhone;
    const historyNeedsClose = historyAsPanel ? historyPanelOverlay : isNarrow || layout === 'slide';
    const closeHistoryOnSelect = historyNeedsClose;
    const [historyOpen, setHistoryOpen] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const { view: chatView, setView: setChatView } = useChatViewPreference();
    const desktopPage = layout === 'page' && !isNarrow;

    useEffect(() => {
        // پنل چت پروژه: آخرین وضعیت باز/بسته همین بیننده (فقط دسکتاپ؛ موبایل بسته شروع می‌شود)
        if (historyAsPanel) {
            setHistoryOpen(historyPanelDocked && readHistoryPanelOpen());
            return;
        }
        if (desktopPage) setHistoryOpen(true);
        else setHistoryOpen(false);
    }, [desktopPage, historyAsPanel, historyPanelDocked]);

    const toggleHistory = () => {
        setHistoryOpen((open) => {
            const next = !open;
            if (historyPanelDocked) writeHistoryPanelOpen(next);
            return next;
        });
    };

    // با روشن شدن آیکون تخمین هزینه، اگر history روی چت را پوشانده ببندش تا آیکون دیده شود
    useEffect(() => {
        if (!historyNeedsClose) return;
        return useChatCostEstimateStore.subscribe((state, prev) => {
            if (state.buttonEnabled && !prev.buttonEnabled) setHistoryOpen(false);
        });
    }, [historyNeedsClose]);

    const closeHistory = () => {
        setHistoryOpen(false);
        if (historyPanelDocked) writeHistoryPanelOpen(false);
    };

    const onNewChat = async () => {
        if (!connectionOk) return;
        // Always lands on the latest draft — composer content is never discarded here.
        await newChat();
        if (closeHistoryOnSelect) closeHistory();
    };

    const historyPanel = (
        <ChatHistoryPanel
            onClose={historyNeedsClose || historyAsPanel ? closeHistory : undefined}
            closeOnSelect={closeHistoryOnSelect}
            // پنل چت پروژه دکمه بستن را در نوار تب دارد و جستجو ندارد (چت اصلی همان قبلی)
            // موبایل: ✕ در هدر پنجرهٔ تمام‌صفحه است
            showClose={historyNeedsClose && !historyAsPanel && !isPhone}
            showSearch={!historyAsPanel}
        />
    );

    // بنر زیر چت‌باکس فقط برای new chat خالی — در چت بازشده با خروجی تولیدشده نشان داده نمی‌شود
    const showChatBanner = layout === 'page' && !hasTranscript;
    const composerWithBanner = (
        <div className={styles.composerStack}>
            <ChatInput />
            {showChatBanner && (
                <BannerBox
                    placementKey={BANNER_PLACEMENTS.CHAT_INPUT_BELOW}
                    variant="wide"
                    fallbackRatio="8 / 1"
                />
            )}
        </div>
    );

    return (
        <>
            <div
                className={`${styles.shell} ${layout === 'slide' ? styles.slide : styles.page} ${historyAsPanel ? styles.projectSurface : ''} ${historyPanelDocked && historyOpen ? styles.historyDockedOpen : ''}`}
                dir={contentDir}
            >
                <main className={styles.main} data-chat-column>
                    <div className={styles.toolbar}>
                        {/* انتخاب نما یک سمت، سه دکمه سمت مقابل (در RTL: نما راست، دکمه‌ها چپ) */}
                        <ChatViewSwitcher view={chatView} onChange={setChatView} />
                        <div className={styles.toolbarActions}>
                            <button
                                type="button"
                                className={styles.historyBtn}
                                disabled={!connectionOk}
                                onClick={() => {
                                    void onNewChat();
                                }}
                                title={t('new_chat')}
                                aria-label={t('new_chat')}
                            >
                                <LuPlus size={18} />
                            </button>
                            {showGallery && (
                                <button
                                    type="button"
                                    className={styles.historyBtn}
                                    onClick={() => setGalleryOpen(true)}
                                    title={t('gallery_personal')}
                                    aria-label={t('gallery_personal')}
                                >
                                    <LuImages size={18} />
                                </button>
                            )}
                            <button
                                type="button"
                                className={`${styles.historyBtn} ${historyOpen ? styles.historyBtnActive : ''}`}
                                onClick={toggleHistory}
                                // چت پروژه: پنل تب‌دار (تاریخچه/پردازش/چت تیم) — مثل سایدبار ورک‌فلو
                                title={historyAsPanel ? t('sidebar_right') : t('chat_history')}
                                aria-label={historyAsPanel ? t('sidebar_right') : t('chat_history')}
                                aria-expanded={historyOpen}
                            >
                                {historyAsPanel ? <LuPanelRight size={18} /> : <LuHistory size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className={styles.body}>
                        {hasTranscript ? (
                            <ChatTranscriptLayout
                                composer={composerWithBanner}
                                pinEdge={chatView === 'v2' ? 'top' : 'bottom'}
                            >
                                {chatView === 'v2' ? <ChatMessagesV2 /> : <ChatMessages />}
                            </ChatTranscriptLayout>
                        ) : (
                            <ChatEmptyStage
                                title={t('personal_chat_title')}
                                body={t('personal_chat_body')}
                                ready={!loading}
                                showFeatured={layout === 'page'}
                                composer={composerWithBanner}
                            />
                        )}
                    </div>
                    {/* برچسب «قالب» روی لبه‌ی ستون چت — پنل ساخت قالب (جدا از خود چت، همان state صفحه‌ی ساخت قالب) */}
                    <TemplateBuilderTab sheet={isNarrow} placementKey={hasTranscript ? 'toolbar' : 'stage'} />
                    {layout === 'slide' && !isNarrow && (
                        <div
                            className={`${styles.historyOverlay} ${historyOpen ? styles.historyOverlayOpen : ''}`}
                            aria-hidden={!historyOpen}
                        >
                            {historyPanel}
                        </div>
                    )}
                </main>
                {/* چت پروژه: هم‌جا و هم‌رفتار سایدبار ورک‌فلو — دسکتاپ بالا/راست ۲۵px و چت در فضای
                    باقی‌مانده وسط؛ موبایل از کنار کشویی با پس‌زمینه تیره که با لمسش بسته می‌شود */}
                {historyPanelOverlay && historyOpen ? (
                    <button
                        type="button"
                        className={styles.historyBackdrop}
                        aria-label={tc('close')}
                        onClick={closeHistory}
                    />
                ) : null}
                {historyAsPanel && (
                    <aside
                        className={`${styles.historyPanelArea} ${historyOpen ? styles.historyPanelAreaOpen : ''}`}
                        aria-hidden={!historyOpen}
                    >
                        <div className={styles.historyPanel}>
                            {/* همان تب‌های سایدبار ورک‌فلو (پردازش‌ها با آیکون باگ)؛ به‌جای تنظیمات نود، تاریخچه چت */}
                            <SidebarTabBar
                                tabs={[
                                    { id: 'history', icon: <LuHistory />, title: t('chat_history') },
                                    ...(projectId ? [
                                        { id: 'logs' as const, icon: <LuBug />, title: t('logs') },
                                        { id: 'comments' as const, icon: <LuMessageSquare />, title: t('comments') },
                                    ] : []),
                                ]}
                                active={panelTab}
                                onSelect={setPanelTab}
                                onClose={closeHistory}
                                closeLabel={tc('close')}
                                ariaLabel={t('sidebar_right')}
                            />
                            <div className={styles.historyPanelBody}>
                                {panelTab === 'history' ? historyPanel : null}
                                {panelTab === 'logs' && projectId ? (
                                    <ProcessLogPanel projectId={projectId} focusNodeId={null} liveLogs={liveLogs} />
                                ) : null}
                                {panelTab === 'comments' && projectId ? <CommentsPanel projectId={projectId} /> : null}
                            </div>
                        </div>
                    </aside>
                )}
                {!historyAsPanel && desktopPage && (
                    <aside
                        className={`${styles.history} ${historyOpen ? styles.historyVisible : ''}`}
                        aria-hidden={!historyOpen}
                    >
                        <div className={styles.historyInner}>{historyPanel}</div>
                    </aside>
                )}
                {/* موبایل: پنجرهٔ تمام‌صفحه مثل گالری؛ عرض بین موبایل و ۹۰۰px همان BottomSheet */}
                {isPhone && !historyAsPanel && (
                    <HistoryWindow
                        open={historyOpen}
                        onClose={closeHistory}
                        title={t('chat_history')}
                        closeLabel={tc('close')}
                    >
                        {historyPanel}
                    </HistoryWindow>
                )}
                {isNarrow && !isPhone && !historyAsPanel && (
                    <ModalHelper
                        open={historyOpen}
                        onClose={closeHistory}
                        hideCloseBtn
                        forceSheet
                        sheetTitle={t('chat_history')}
                        sheetClassName={styles.historySheet}
                        component={<div className={styles.sheetBody}>{historyPanel}</div>}
                    />
                )}
                {showGallery && (
                    <GalleryModal
                        open={galleryOpen}
                        onClose={() => setGalleryOpen(false)}
                        scope="personal"
                        chatId={chat?._id}
                        onQuickAdd={(item) => addAttachments([galleryItemToPreviewMedia(item)])}
                    />
                )}
            </div>
        </>
    );
}
