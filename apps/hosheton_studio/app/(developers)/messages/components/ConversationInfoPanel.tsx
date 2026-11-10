'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuBan, LuDownload, LuFileText, LuFlag, LuGlobe, LuImage, LuLayoutTemplate, LuLink, LuPlay } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import type {
    ConversationItem,
    CreatorProfile,
    DirectAttachment,
    SharedItemsResponse,
    SharedKind,
} from '@/app/(marketplace)/lib/types';
import { HoshetonError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { dateLocale, fileExtension, formatBytes, formatLastSeen, formatListTime, splitLinks } from '../lib/dm-format';
import { DmAvatar } from './DmAvatar';
import type { PendingPeer } from './ConversationList';
import styles from './ConversationInfoPanel.module.scss';

type Props = {
    conversation: ConversationItem | null;
    peer: PendingPeer;
    presence: { online: boolean; lastSeenAt: string | null } | undefined;
    /** با هر پیام/حذف تازه بالا می‌رود تا فهرست فایل‌ها دوباره خوانده شود */
    sharedVersion: number;
    onClose: () => void;
    onOpenMedia: (media: DirectAttachment[], index: number) => void;
    onBlock: () => void;
    onUnblock: () => void;
    onReport: () => void;
};

type SharedState = {
    items: SharedItemsResponse['items'];
    hasMore: boolean;
    nextBefore: string | null;
    loading: boolean;
    error: unknown;
};

const TABS: Array<{ key: SharedKind; icon: React.ReactNode }> = [
    { key: 'media', icon: <LuImage size={14} /> },
    { key: 'files', icon: <LuFileText size={14} /> },
    { key: 'links', icon: <LuLink size={14} /> },
];

/** پروفایل‌ها در طول جلسه کش می‌شوند تا جابه‌جایی بین گفتگوها بی‌اسپینر باشد */
const profileCache = new Map<string, CreatorProfile>();

export function ConversationInfoPanel({
    conversation,
    peer,
    presence,
    sharedVersion,
    onClose,
    onOpenMedia,
    onBlock,
    onUnblock,
    onReport,
}: Props) {
    const { t, i18n } = useTranslation('messages');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;
    const conversationId = conversation?._id || '';

    const [profile, setProfile] = useState<CreatorProfile | null>(() => profileCache.get(peer._id) ?? null);
    const [tab, setTab] = useState<SharedKind>('media');
    const [counts, setCounts] = useState<Record<SharedKind, number> | null>(null);
    const [shared, setShared] = useState<Record<SharedKind, SharedState | undefined>>({ media: undefined, files: undefined, links: undefined });
    const requestRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        marketplaceApi.getCreatorProfile(peer._id)
            .then((data) => {
                profileCache.set(peer._id, data);
                if (!cancelled) setProfile(data);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [peer._id]);

    const loadShared = useCallback(async (kind: SharedKind, before?: string) => {
        if (!conversationId) return;
        const request = ++requestRef.current;
        setShared((prev) => ({
            ...prev,
            [kind]: { ...(prev[kind] ?? { items: [], hasMore: false, nextBefore: null }), loading: true, error: null },
        }));
        try {
            const data = await marketplaceApi.getSharedItems(conversationId, { kind, before });
            if (request !== requestRef.current && !before) return;
            setCounts(data.counts);
            setShared((prev) => ({
                ...prev,
                [kind]: {
                    items: before ? [...(prev[kind]?.items ?? []), ...data.items] : data.items,
                    hasMore: data.hasMore,
                    nextBefore: data.nextBefore,
                    loading: false,
                    error: null,
                },
            }));
        } catch (error) {
            setShared((prev) => ({ ...prev, [kind]: { ...(prev[kind] as SharedState), loading: false, error } }));
        }
    }, [conversationId]);

    // تب فعال با باز شدن، عوض شدن تب یا رسیدن فایل/لینک تازه دوباره خوانده می‌شود
    useEffect(() => {
        void loadShared(tab);
    }, [tab, sharedVersion, loadShared]);

    const current = shared[tab];
    const creator = profile?.creator;
    const stats = profile?.stats;
    const joined = creator?.joinedAt
        ? new Intl.DateTimeFormat(dateLocale(lang), { year: 'numeric', month: 'long' }).format(new Date(creator.joinedAt))
        : '';
    const statusText = presence?.online
        ? t('online')
        : presence?.lastSeenAt
            ? t('last_seen', { time: formatLastSeen(presence.lastSeenAt, lang, t) })
            : conversation?.role ? t(conversation.role === 'creator' ? 'role_buyer' : 'role_creator') : '';

    const mediaItems = (current?.items ?? []).filter((item) => item.attachment) as Array<SharedItemsResponse['items'][number] & { attachment: DirectAttachment }>;

    const renderShared = () => {
        if (!current || (current.loading && !current.items.length)) {
            return (
                <div className={tab === 'media' ? styles.mediaGrid : styles.rows} aria-hidden>
                    {Array.from({ length: tab === 'media' ? 6 : 3 }, (_, i) => (
                        <span key={i} className={tab === 'media' ? styles.mediaSkeleton : styles.rowSkeleton} />
                    ))}
                </div>
            );
        }
        if (current.error && !current.items.length) {
            return (
                <div className={styles.sharedEmpty}>
                    <HoshetonError error={current.error} fallback={t('load_messages_error')}>
                        {(e) => <p>{e.message}</p>}
                    </HoshetonError>
                    <button type="button" className={styles.textBtn} onClick={() => void loadShared(tab)}>{t('retry_load')}</button>
                </div>
            );
        }
        if (!current.items.length) {
            return (
                <div className={styles.sharedEmpty}>
                    {TABS.find((x) => x.key === tab)?.icon}
                    <p>{t(`shared_empty_${tab}`)}</p>
                </div>
            );
        }

        let list: React.ReactNode;
        if (tab === 'media') {
            const all = mediaItems.map((item) => item.attachment);
            list = (
                <div className={styles.mediaGrid}>
                    {mediaItems.map((item, index) => (
                        <button
                            key={`${item.messageId}-${item.attachment.fileId}`}
                            type="button"
                            className={styles.mediaTile}
                            onClick={() => onOpenMedia(all, index)}
                            aria-label={item.attachment.name || t('attachment_image')}
                        >
                            {item.attachment.kind === 'image' ? (
                                <img src={item.attachment.url} alt="" loading="lazy" />
                            ) : (
                                <>
                                    <video src={item.attachment.url} preload="metadata" muted />
                                    <span className={styles.play}><LuPlay size={14} /></span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            );
        } else if (tab === 'files') {
            list = (
                <ul className={styles.rows}>
                    {current.items.map((item) => item.attachment && (
                        <li key={`${item.messageId}-${item.attachment.fileId}`}>
                            <a className={styles.fileRow} href={item.attachment.url} target="_blank" rel="noopener noreferrer" download={item.attachment.name || undefined}>
                                <span className={styles.fileIcon}>
                                    <LuFileText size={16} />
                                    {fileExtension(item.attachment.name) && <small>{fileExtension(item.attachment.name)}</small>}
                                </span>
                                <span className={styles.rowText}>
                                    <span className={styles.rowTitle} dir="auto">{item.attachment.name || t('attachment_file')}</span>
                                    <span className={styles.rowMeta}>
                                        {formatBytes(item.attachment.size, lang)} · {formatListTime(item.createdAt, lang, t)}
                                    </span>
                                </span>
                                <LuDownload size={15} className={styles.rowAction} aria-label={t('download')} />
                            </a>
                        </li>
                    ))}
                </ul>
            );
        } else {
            list = (
                <ul className={styles.rows}>
                    {current.items.flatMap((item) => splitLinks(item.body || '')
                        .filter((part) => part.type === 'link')
                        .map((part, i) => (
                            <li key={`${item.messageId}-${i}`}>
                                <a className={styles.fileRow} href={part.value} target="_blank" rel="noopener noreferrer nofollow">
                                    <span className={styles.fileIcon}><LuGlobe size={16} /></span>
                                    <span className={styles.rowText}>
                                        <span className={styles.rowTitle} dir="ltr">{part.value.replace(/^https?:\/\//, '')}</span>
                                        <span className={styles.rowMeta} dir="auto">{formatListTime(item.createdAt, lang, t)}</span>
                                    </span>
                                </a>
                            </li>
                        )))}
                </ul>
            );
        }

        return (
            <>
                {list}
                {current.hasMore && (
                    <button
                        type="button"
                        className={styles.loadMore}
                        disabled={current.loading}
                        onClick={() => current.nextBefore && void loadShared(tab, current.nextBefore)}
                    >
                        {current.loading ? tc('loading') : t('load_more')}
                    </button>
                )}
            </>
        );
    };

    return (
        <aside className={styles.panel} aria-label={t('info_title')}>
            <header className={styles.head}>
                <h2>{t('info_title')}</h2>
                <ModalCloseButton placement="inline" size="sm" onClick={onClose} aria-label={tc('close')} />
            </header>

            <div className={styles.scroll}>
                <section className={styles.profile}>
                    <DmAvatar name={peer.fullName} src={creator?.avatar || peer.avatar} online={presence?.online} size="lg" />
                    <h3>{creator?.fullName || peer.fullName}</h3>
                    {statusText && <p className={`${styles.status} ${presence?.online ? styles.statusOnline : ''}`}>{statusText}</p>}
                    <Link href={`/creators/${peer._id}`} className={styles.profileLink}>{t('view_profile')}</Link>
                </section>

                {(creator?.bio || joined || creator?.website) && (
                    <section className={styles.section}>
                        {creator?.bio && (
                            <div className={styles.field}>
                                <span className={styles.fieldLabel}>{t('about_user')}</span>
                                <p className={styles.bio} dir="auto">{creator.bio}</p>
                            </div>
                        )}
                        {creator?.website && (
                            <div className={styles.field}>
                                <span className={styles.fieldLabel}>{t('website')}</span>
                                <a href={creator.website} target="_blank" rel="noopener noreferrer nofollow" dir="ltr">{creator.website.replace(/^https?:\/\//, '')}</a>
                            </div>
                        )}
                        {joined && (
                            <div className={styles.field}>
                                <span className={styles.fieldLabel}>{t('joined')}</span>
                                <span>{joined}</span>
                            </div>
                        )}
                    </section>
                )}

                {stats && (
                    <section className={`${styles.section} ${styles.stats}`}>
                        <div><strong>{formatAppNumber(stats.templateCount ?? 0, lang)}</strong><span>{t('stats_templates')}</span></div>
                        <div><strong>{formatAppNumber(stats.totalSales ?? 0, lang)}</strong><span>{t('stats_sales')}</span></div>
                        <div><strong>{formatAppNumber(stats.totalLikes ?? 0, lang)}</strong><span>{t('stats_likes')}</span></div>
                    </section>
                )}

                {conversation?.template && (
                    <section className={styles.section}>
                        <span className={styles.fieldLabel}>{t('about_template')}</span>
                        <Link href={templateDetailPath({ _id: conversation.template._id, slug: conversation.template.slug })} className={styles.templateRow}>
                            {conversation.template.cover ? (
                                <img src={conversation.template.cover} alt="" />
                            ) : (
                                <span className={styles.templateFallback}><LuLayoutTemplate size={16} /></span>
                            )}
                            <span className={styles.rowTitle}>{conversation.template.title}</span>
                        </Link>
                    </section>
                )}

                {conversationId && (
                    <section className={styles.sharedSection}>
                        <div className={styles.tabs} role="tablist" aria-label={t('shared_title')}>
                            {TABS.map(({ key }) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === key}
                                    className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                                    onClick={() => setTab(key)}
                                >
                                    {t(`shared_${key}`)}
                                    {counts && counts[key] > 0 && <span className={styles.tabCount}>{formatAppNumber(counts[key], lang)}</span>}
                                </button>
                            ))}
                        </div>
                        <div className={styles.sharedBody} role="tabpanel">
                            {renderShared()}
                        </div>
                    </section>
                )}

                {conversation && (
                    <section className={`${styles.section} ${styles.actions}`}>
                        {conversation.blockedByMe ? (
                            <button type="button" className={styles.actionBtn} onClick={onUnblock}>
                                <LuBan size={16} /> {t('unblock_user')}
                            </button>
                        ) : (
                            <button type="button" className={styles.actionBtn} onClick={onBlock}>
                                <LuBan size={16} /> {t('block_user')}
                            </button>
                        )}
                        <button type="button" className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={onReport}>
                            <LuFlag size={16} /> {t('report_user')}
                        </button>
                    </section>
                )}
            </div>
        </aside>
    );
}
