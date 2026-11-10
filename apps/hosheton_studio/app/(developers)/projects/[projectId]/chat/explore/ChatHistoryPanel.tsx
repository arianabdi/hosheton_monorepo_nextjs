'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { LuEllipsis, LuMusic, LuSearch, LuX } from 'react-icons/lu';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type { StudioChat, StudioChatListItem } from '@/app/(developers)/projects/types/media-api';
import { OptimizedThumbImage } from '@/app/(developers)/projects/components/OptimizedThumbImage';
import { fixHoshetonMediaUrl, mediaOptimizedListThumbSrc } from '@/app/(marketplace)/lib/template-media';
import { BadgedImage } from '@/app/(developers)/chat/components/BadgedImage/BadgedImage';
import { useChatSession } from '../ChatSessionContext';
import { sanitizeSvg, SvgMarkup } from '../lib/modeIcon';
import { loadChatModelIcons } from '../lib/model-icons';
import { ChatHistoryEmptyHint } from './ChatHistoryEmptyHint';
import styles from './ChatHistoryPanel.module.scss';
import { useAuthStore } from '@/app/zustand/store/authStore';

type HistoryThumb = NonNullable<StudioChatListItem['previewMedia']>[number];

/** تایل‌های فولدری هر درخواست — هم‌راستا با HISTORY_FOLDER_THUMBS در API */
const FOLDER_THUMBS = 3;
const HISTORY_TURNS = 12;

/**
 * تامبنیل هر خروجی: پیش‌نمایش بهینه؛ اگر نبود (ویدیوی بی‌پوستر، تصویر بی‌تامبنیل)
 * فریم اول همان ویدیو / خود تصویر — هیچ خروجی‌ای از تاریخچه حذف نمی‌شود.
 */
function historyThumbs(item: StudioChatListItem) {
    return (item.previewMedia || [])
        .map((media) => {
            const src = mediaOptimizedListThumbSrc(media);
            const kind = media.type === 'video' ? 'video' : media.type === 'audio' ? 'audio' : 'image';
            return {
                media,
                src: src || (kind === 'image' ? fixHoshetonMediaUrl(media.url || '') : ''),
                videoSrc: !src && kind === 'video' ? fixHoshetonMediaUrl(media.url || '') : '',
                kind,
            };
        })
        .filter((entry) => Boolean(entry.src || entry.videoSrc || entry.kind === 'audio'));
}

type HistoryEntry = ReturnType<typeof historyThumbs>[number];

/** تامبنیل یک خروجی: عکس، فریم اول ویدیو (بدون پوستر) یا آیکون صدا */
function HistoryEntryThumb({ entry, delayMs }: { entry: HistoryEntry; delayMs: number }) {
    if (entry.src) return <OptimizedThumbImage src={entry.src} alt="" delayMs={delayMs} />;
    if (entry.videoSrc) {
        return (
            <video
                className={styles.videoFrame}
                src={`${entry.videoSrc}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                aria-hidden
            />
        );
    }
    return (
        <span className={styles.audioTile} aria-hidden>
            <LuMusic size={18} />
        </span>
    );
}

type HistoryTile = {
    key: string;
    entries: ReturnType<typeof historyThumbs>;
    /** تعداد کل خروجی‌های همان درخواست (ممکن است بیشتر از تامبنیل‌های ارسالی باشد) */
    size: number;
};

/**
 * یک تایل برای هر درخواست: خروجی‌های پشت‌سرهم با یک turnId کنار هم جمع می‌شوند (فولدر به سبک
 * آیفون). پیش‌نمایش قدیمی بدون turnId همان تایل تکی هر تصویر می‌ماند.
 */
function historyTiles(item: StudioChatListItem): HistoryTile[] {
    const tiles: HistoryTile[] = [];
    historyThumbs(item).forEach((entry, index) => {
        const turnId = String(entry.media.turnId || '');
        const last = tiles[tiles.length - 1];
        if (turnId && last && last.key === turnId) {
            last.entries.push(entry);
            last.size = Math.max(last.size, last.entries.length);
            return;
        }
        tiles.push({
            key: turnId || `${entry.media.url}-${index}`,
            entries: [entry],
            size: Math.max(1, Number(entry.media.turnSize) || 1),
        });
    });
    return tiles;
}

function resolveModelIcon(
    icons: Map<string, string>,
    modelId?: string,
    modelName?: string,
    fallbackSvg?: string,
) {
    const existing = sanitizeSvg(fallbackSvg);
    if (existing) return existing;
    const byId = String(modelId || '').trim();
    if (byId && icons.get(`id:${byId}`)) return icons.get(`id:${byId}`) || '';
    const byName = String(modelName || '').trim().toLowerCase();
    if (byName && icons.get(`name:${byName}`)) return icons.get(`name:${byName}`) || '';
    return '';
}

/** آپدیت سوکت listItem را بدون SVG می‌فرستد — آیکون‌های قبلی را نگه دار */
function mergeHistoryItem(
    prev: StudioChatListItem | undefined,
    next: StudioChatListItem,
): StudioChatListItem {
    const prevByUrl = new Map(
        (prev?.previewMedia || []).map((media) => [String(media.url || ''), media]),
    );
    return {
        ...next,
        modelId: next.modelId || prev?.modelId,
        modelName: next.modelName || prev?.modelName,
        modelIconSvg: next.modelIconSvg || prev?.modelIconSvg || '',
        previewMedia: (next.previewMedia?.length ? next.previewMedia : prev?.previewMedia || []).map((media) => {
            const older = prevByUrl.get(String(media.url || ''));
            return {
                ...older,
                ...media,
                modelId: media.modelId || older?.modelId,
                modelName: media.modelName || older?.modelName,
                modelIconSvg: media.modelIconSvg || older?.modelIconSvg || next.modelIconSvg || prev?.modelIconSvg || '',
            };
        }),
    };
}

/** همان lastAssistantMedia سمت API: ۱۲ درخواست آخر، هر کدام حداکثر ۳ تامبنیل + تعداد کل */
function previewFromOpenChat(chat: StudioChat): HistoryThumb[] {
    const turns: HistoryThumb[][] = [];
    const messages = chat.messages || [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if (message.role !== 'assistant' || message.status !== 'complete') continue;
        const user = messages[index - 1]?.role === 'user' ? messages[index - 1] : undefined;
        const settings = user?.requestSnapshot?.settings || chat.settings;
        const modelId = String(settings?.modelId || '').trim();
        const modelName = String(settings?.modelName || settings?.model || '').trim();
        const turnId = String(message.messageId || message.runId || `turn-${index}`);
        const media = (message.attachments || []).filter((entry) => entry.type !== 'audio');
        if (!media.length) continue;
        turns.push(media.slice(0, FOLDER_THUMBS).map((entry) => ({
            url: String(entry.url || ''),
            thumbnailUrl: entry.thumbnailUrl,
            thumbnailUrlLarge: entry.thumbnailUrlLarge,
            type: entry.type,
            width: entry.width,
            height: entry.height,
            aspectRatio: entry.aspectRatio,
            modelId,
            modelName,
            turnId,
            turnSize: media.length,
        })));
    }
    return turns.slice(-HISTORY_TURNS).flat();
}

function withLiveCurrentChat(
    item: StudioChatListItem,
    chat: StudioChat | null | undefined,
    icons: Map<string, string>,
): StudioChatListItem {
    if (!chat || item._id !== chat._id) {
        return {
            ...item,
            modelIconSvg: resolveModelIcon(icons, item.modelId, item.modelName, item.modelIconSvg),
            previewMedia: (item.previewMedia || []).map((media) => ({
                ...media,
                modelIconSvg: resolveModelIcon(
                    icons,
                    media.modelId || item.modelId,
                    media.modelName || item.modelName,
                    media.modelIconSvg || item.modelIconSvg,
                ),
            })),
        };
    }
    const modelId = item.modelId || chat.settings?.modelId || '';
    const modelName = item.modelName || chat.settings?.modelName || chat.settings?.model || '';
    const preview = item.previewMedia?.length ? item.previewMedia : previewFromOpenChat(chat);
    return {
        ...item,
        modelId,
        modelName,
        modelIconSvg: resolveModelIcon(icons, modelId, modelName, item.modelIconSvg),
        previewMedia: preview.map((media) => ({
            ...media,
            modelId: media.modelId || modelId,
            modelName: media.modelName || modelName,
            modelIconSvg: resolveModelIcon(
                icons,
                media.modelId || modelId,
                media.modelName || modelName,
                media.modelIconSvg || item.modelIconSvg,
            ),
        })),
    };
}

const GHOST_ITEMS = [
    { meta: '84px', thumbs: 4 },
    { meta: '68px', thumbs: 4 },
    { meta: '92px', thumbs: 4 },
    { meta: '74px', thumbs: 4 },
    { meta: '88px', thumbs: 4 },
    { meta: '70px', thumbs: 4 },
];

function HistoryGhostList() {
    return (
        <div className={styles.ghostList} aria-hidden>
            {GHOST_ITEMS.map((row, index) => (
                <div key={index} className={styles.ghostItem} style={{ '--ghost-delay': `${index * 70}ms` } as CSSProperties}>
                    <span className={styles.ghostDivider}>
                        <span className={styles.ghostMeta} style={{ width: row.meta }} />
                        <span className={styles.dividerLine} />
                        <span className={styles.ghostDot} />
                    </span>
                    <span className={styles.ghostThumbs}>
                        {Array.from({ length: row.thumbs }, (_, thumb) => (
                            <span key={thumb} className={styles.ghostThumb} />
                        ))}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function ChatHistoryPanel({
    onClose,
    closeOnSelect = false,
    showClose = false,
    showSearch = true,
}: {
    onClose?: () => void;
    closeOnSelect?: boolean;
    showClose?: boolean;
    /** جستجوی بالای لیست — پنل تب‌دار چت پروژه بدون آن */
    showSearch?: boolean;
}) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const {
        scope,
        chat,
        selectChat,
        deleteChat,
        connectionOk,
        historyRevision,
        registerHistoryListener,
    } = useChatSession();
    const [items, setItems] = useState<StudioChatListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState('');
    const [menuId, setMenuId] = useState('');
    const [modelIcons, setModelIcons] = useState<Map<string, string>>(() => new Map());
    const hasLoadedOnce = useRef(false);
    const isPersonal = scope.kind === 'personal';
    const projectId = scope.kind === 'project' ? scope.projectId : '';
    const isGuest = !useAuthStore((state) => state.token);

    const load = useCallback(async (options?: { silent?: boolean }) => {
        if (!isPersonal && !projectId) return;
        // مهمان تاریخچه‌ای ندارد: همان حالت خالی، بدون درخواست
        if (isGuest) {
            setItems([]);
            setLoadError(false);
            setLoading(false);
            return;
        }
        if (!connectionOk && hasLoadedOnce.current) {
            setLoadError(true);
            setLoading(false);
            return;
        }
        if (!options?.silent) setLoading(!hasLoadedOnce.current);
        try {
            const data = isPersonal
                ? await mediaApi.listPersonalChats()
                : await mediaApi.listChats(projectId);
            setItems(data.chats || []);
            setLoadError(false);
            hasLoadedOnce.current = true;
        } catch {
            // Keep the last known list; never pretend history is empty when the API is down.
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [connectionOk, isGuest, isPersonal, projectId]);

    useEffect(() => {
        void load();
    }, [load, historyRevision]);

    useEffect(() => {
        let cancelled = false;
        loadChatModelIcons()
            .then((map) => {
                if (!cancelled) setModelIcons(map);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    // بروزرسانی realtime لیست تاریخچه از طریق سوکت چت (بدون refetch)
    useEffect(() => {
        registerHistoryListener((event) => {
            if (event.type === 'updated') {
                setItems((prev) => {
                    const existing = prev.find((item) => item._id === event.chat._id);
                    return [
                        mergeHistoryItem(existing, event.chat),
                        ...prev.filter((item) => item._id !== event.chat._id),
                    ];
                });
            } else {
                setItems((prev) => prev.filter((item) => item._id !== event.chatId));
            }
        });
        return () => registerHistoryListener(null);
    }, [registerHistoryListener]);

    useEffect(() => {
        if (connectionOk && loadError) void load({ silent: true });
    }, [connectionOk, loadError, load]);

    useEffect(() => {
        if (!menuId) return;
        const onDoc = (event: MouseEvent) => {
            const node = event.target as HTMLElement | null;
            if (node?.closest('[data-history-menu]')) return;
            setMenuId('');
        };
        const timer = window.setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [menuId]);

    const visibleItems = useMemo(() => {
        const decorated = items.map((item) => withLiveCurrentChat(item, chat, modelIcons));
        if (chat?._id && !decorated.some((item) => item._id === chat._id) && (chat.messages || []).length) {
            decorated.unshift(withLiveCurrentChat({
                _id: chat._id,
                projectId: chat.projectId,
                status: chat.status,
                mediaKind: chat.mediaKind,
                title: chat.title,
                modelId: chat.settings?.modelId,
                modelName: chat.settings?.modelName || chat.settings?.model,
                previewMedia: [],
                updatedAt: chat.updatedAt,
                createdAt: chat.createdAt,
            }, chat, modelIcons));
        }
        const query = search.trim().toLowerCase();
        if (!query) return decorated;
        return decorated.filter((item) => [
            item.title,
            item.modelName,
        ].some((value) => String(value || '').toLowerCase().includes(query)));
    }, [items, search, chat, modelIcons]);

    const onDelete = async (chatId: string) => {
        if (!connectionOk) return;
        setMenuId('');
        if (!window.confirm(t('delete_chat_confirm'))) return;
        setItems((prev) => prev.filter((item) => item._id !== chatId));
        try {
            await deleteChat(chatId);
        } catch {
            await load({ silent: true });
        }
    };

    return (
        <div className={`${styles.panel} ${!connectionOk ? styles.panelOffline : ''}`}>
            {!connectionOk && (
                <p className={styles.connectionBanner} role="status">
                    {t('chat_connection_lost')}
                </p>
            )}
            {showSearch || (showClose && onClose) ? (
            <div className={styles.searchRow}>
                {showSearch ? (
                    <label className={styles.search}>
                        <LuSearch />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('search_chats')}
                            disabled={!connectionOk && !items.length}
                        />
                    </label>
                ) : null}
                {showClose && onClose ? (
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label={tc('close')}
                    >
                        <LuX size={18} />
                    </button>
                ) : null}
            </div>
            ) : null}
            <div className={styles.list}>
                {loading ? (
                    <HistoryGhostList />
                ) : loadError && !visibleItems.length ? (
                    <p className={styles.empty}>{t('chat_connection_lost')}</p>
                ) : !visibleItems.length ? (
                    // موشن فقط وقتی واقعاً تاریخچه‌ای نیست؛ برای جستجوی بی‌نتیجه همان متن ساده
                    search.trim() ? (
                        <p className={styles.empty}>{t('empty_chat_history')}</p>
                    ) : (
                        <ChatHistoryEmptyHint />
                    )
                ) : visibleItems.map((item) => {
                    const isTextChat = item.mediaKind === 'text';
                    const tiles = isTextChat ? [] : historyTiles(item);
                    // چت متنی، پیش‌نویس، یا چتی که هنوز خروجی ندارد (در حال ساخت/ناموفق):
                    // به‌جای ردیف خالیِ فقط-تاریخ، عنوان (پرامپت) و مدل نمایش داده می‌شود
                    const showSummary = isTextChat || tiles.length === 0;
                    const isDraft = item.status === 'draft';
                    const summary = String(item.title || '').trim();
                    const metaDate = item.updatedAt
                        ? formatAppDate(item.updatedAt, i18n.language)
                        : '';
                    // تاریخ و دکمه more روی خط جداکننده بالای هر آیتم می‌نشینند؛
                    // آیکون و نام مدل روی خود تصاویر (badge) و زیر عنوان چت‌های متنی.
                    const hasTextMeta = Boolean(item.modelIconSvg || item.modelName || isDraft);
                    const textMeta = (
                        <span className={styles.meta}>
                            {isDraft ? (
                                <span className={styles.draftBadge}>{t('chat_history_draft', { defaultValue: 'پیش‌نویس' })}</span>
                            ) : null}
                            {item.modelIconSvg ? (
                                <SvgMarkup svg={item.modelIconSvg} className={styles.modelIcon} />
                            ) : null}
                            {item.modelName ? (
                                <span className={styles.modelName}>{item.modelName}</span>
                            ) : null}
                        </span>
                    );
                    return (
                        <div
                            key={item._id}
                            className={`${styles.item} ${item._id === chat?._id ? styles.selected : ''} ${menuId === item._id ? styles.menuOpen : ''}`}
                        >
                            <div
                                className={styles.itemMain}
                                role="button"
                                tabIndex={connectionOk ? 0 : -1}
                                aria-disabled={!connectionOk}
                                onClick={() => {
                                    if (!connectionOk) return;
                                    void selectChat(item._id);
                                    if (closeOnSelect) onClose?.();
                                }}
                                onKeyDown={(event) => {
                                    if (!connectionOk) return;
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    void selectChat(item._id);
                                    if (closeOnSelect) onClose?.();
                                }}
                            >
                                <span className={styles.divider}>
                                    {metaDate ? (
                                        <span className={styles.dividerDate}>{metaDate}</span>
                                    ) : null}
                                    <span className={styles.dividerLine} />
                                    <div className={styles.itemActions} data-history-menu>
                                        <button
                                            type="button"
                                            className={styles.moreBtn}
                                            aria-label={t('chat_actions')}
                                            aria-expanded={menuId === item._id}
                                            disabled={!connectionOk}
                                            onMouseDown={(event) => event.stopPropagation()}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setMenuId((openId) => (openId === item._id ? '' : item._id));
                                            }}
                                        >
                                            <LuEllipsis size={16} />
                                        </button>
                                        {menuId === item._id && (
                                            <div
                                                className={styles.actionMenu}
                                                role="menu"
                                                onMouseDown={(event) => event.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={styles.menuDanger}
                                                    disabled={!connectionOk}
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        void onDelete(item._id);
                                                    }}
                                                >
                                                    {tc('delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </span>
                                {showSummary ? (
                                    <span className={styles.title}>
                                        {summary || t('chat_untitled')}
                                    </span>
                                ) : null}
                                {showSummary && hasTextMeta ? textMeta : null}
                                {tiles.length > 0 && (
                                    <span className={styles.thumbs}>
                                        {tiles.map((tile, index) => {
                                            const { media } = tile.entries[0];
                                            const iconSvg = media.modelIconSvg || item.modelIconSvg;
                                            const folder = tile.size > 1;
                                            // فولدر: ۳ تامبنیل اول + «+N» برای بقیه، کنار آیکون مدل در بج
                                            const more = tile.size - Math.min(tile.entries.length, FOLDER_THUMBS);
                                            return (
                                                <BadgedImage
                                                    key={tile.key}
                                                    className={`${styles.thumb} ${folder ? styles.folderTile : ''}`}
                                                    compact
                                                    showFavorite={false}
                                                    showBadgeText={folder && more > 0}
                                                    badgeIcon={iconSvg ? <SvgMarkup svg={iconSvg} /> : undefined}
                                                    badgeText={folder && more > 0
                                                        ? ` +${more}`
                                                        : media.modelName || item.modelName}
                                                    style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
                                                >
                                                    {folder ? (
                                                        <span
                                                            className={styles.folderGrid}
                                                            title={t('chat_v2_group_label', { count: tile.size })}
                                                        >
                                                            {tile.entries.slice(0, FOLDER_THUMBS).map((entry, slot) => (
                                                                <span
                                                                    key={`${entry.media.url}-${slot}`}
                                                                    className={styles.folderSlot}
                                                                    data-slot={slot + 1}
                                                                >
                                                                    <HistoryEntryThumb entry={entry} delayMs={(index + slot) * 60} />
                                                                </span>
                                                            ))}
                                                        </span>
                                                    ) : (
                                                        <HistoryEntryThumb entry={tile.entries[0]} delayMs={index * 60} />
                                                    )}
                                                </BadgedImage>
                                            );
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
