'use client';

import React, {useCallback, useState} from 'react';
import Link from 'next/link';
import {LuMegaphone, LuRefreshCw, LuSend} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {
    filkoshApi,
    FilkoshMtProxyNode,
    FilkoshMtProxyPool,
    FilkoshMtProxySponsorStatus,
} from '../../lib/filkosh-api';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import {useClientPaging} from '../../components/useClientPaging';
import {useLoadOnMount} from '../../components/useLoadOnMount';

export default function FilkoshMtProxySponsorsPage() {
    const [pools, setPools] = useState<FilkoshMtProxyPool[]>([]);
    const [nodes, setNodes] = useState<FilkoshMtProxyNode[]>([]);
    const [status, setStatus] = useState<FilkoshMtProxySponsorStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [tagModal, setTagModal] = useState<FilkoshMtProxyNode | null>(null);
    const [tagValue, setTagValue] = useState('');
    const [channelDraft, setChannelDraft] = useState<{poolId: string; channel: string} | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [p, n, s] = await Promise.all([
                filkoshApi.listMtProxyPools(),
                filkoshApi.listMtProxyNodes({status: 'active'}),
                filkoshApi.mtProxySponsorStatus(),
            ]);
            setPools(p);
            setNodes(n);
            setStatus(s);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const withTag = nodes.filter((n) => n.adTag);
    const withoutTag = nodes.filter((n) => !n.adTag);
    const withoutPaging = useClientPaging(withoutTag);

    const poolName = (node: FilkoshMtProxyNode) =>
        typeof node.poolId === 'object' && node.poolId ? (node.poolId as {name: string}).name : '—';

    const busyThen = async (key: string, action: () => Promise<unknown>, done: string) => {
        try {
            setBusy(key);
            await action();
            SuccessToaster({message: done});
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy('');
        }
    };

    const saveChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelDraft) return;
        const pool = pools.find((p) => p._id === channelDraft.poolId);
        if (!pool) return;
        await busyThen(
            'channel',
            () => filkoshApi.updateMtProxyPool(pool._id, {sponsorChannel: channelDraft.channel}),
            'کانال اسپانسر ذخیره شد',
        );
        setChannelDraft(null);
    };

    const submitTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tagModal) return;
        const node = tagModal;
        setTagModal(null);
        await busyThen('tag', () => filkoshApi.setMtProxyAdTag(node._id, tagValue.trim()), 'ad_tag ثبت و اعمال شد');
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>اسپانسری پروکسی</h1>
                                <p className={styles.subtitle}>کانال تبلیغاتی نمایش‌داده‌شده به کاربران پروکسی تلگرام.</p>
                            </div>
                        </header>
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>اسپانسری پروکسی</h1>
                            <p className={styles.subtitle}>
                                کانال اسپانسر با ad_tagِ @MTProxybot به نودها وصل می‌شود و بالای چت‌های کاربرانِ متصل
                                نمایش داده می‌شود. {toFarsiNumber(withTag.length)} از {toFarsiNumber(nodes.length)} نود فعال
                                ad_tag دارند.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/mtproxy" className={styles.backLink}>بازگشت به پروکسی تلگرام</Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxySponsors} />

                    {/* ---- وضعیت اتوماسیون ---- */}
                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>وضعیت اتوماسیون</h2>
                            <span className={`${styles.badge} ${status?.autoRegisterReady ? styles.badgeSuccess : styles.badgeWarning}`}>
                                {status?.autoRegisterReady ? 'ثبت خودکار آماده است' : 'ثبت خودکار غیرفعال — ad_tag را دستی وارد کنید'}
                            </span>
                        </div>
                        <div className={styles.metaRow}>
                            <span>توکن ربات (اطلاع‌رسانی): {status?.botToken ? '✅' : '—'}</span>
                            <span>چت ادمین: {status?.adminChatId ? '✅' : '—'}</span>
                            <span>API ID: {status?.apiId ? '✅' : '—'}</span>
                            <span>API Hash: {status?.apiHash ? '✅' : '—'}</span>
                            <span>سشن کاربر تلگرام: {status?.session ? '✅' : '—'}</span>
                        </div>
                        {!status?.autoRegisterReady ? (
                            <p className={styles.fieldHint} style={{marginTop: '0.7rem'}}>
                                برای ثبت خودکار: در my.telegram.org یک اپ بسازید و API ID/Hash بگیرید، بعد با اسکریپت{' '}
                                <code dir="ltr">scripts/gen-telegram-session.cjs</code> سشن بسازید و سه متغیر{' '}
                                <code dir="ltr">MT_TELEGRAM_API_ID / MT_TELEGRAM_API_HASH / MT_TELEGRAM_SESSION</code> را
                                در env فیلکوش بگذارید (مستندات کامل: docs/mtproxy-setup.md).
                            </p>
                        ) : null}
                    </div>

                    {/* ---- تنظیم کانال هر استخر ---- */}
                    <h2 className={styles.panelTitle}>کانال اسپانسر استخرها</h2>
                    {pools.length === 0 ? (
                        <p className={styles.emptyHint}>اول از بخش استخرها یک استخر بسازید.</p>
                    ) : (
                        pools.map((pool) => (
                            <div key={pool._id} className={`${styles.panel} ${styles.panelCompact}`}>
                                <div className={styles.sectionHead}>
                                    <h2>
                                        {pool.name} <span className={styles.cellMuted}>({pool.slug})</span>
                                    </h2>
                                    <div className={styles.actions}>
                                        <button
                                            type="button"
                                            className={styles.secondaryBtn}
                                            onClick={() =>
                                                setChannelDraft({poolId: pool._id, channel: pool.sponsorChannel || ''})
                                            }
                                        >
                                            ویرایش کانال
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.secondaryBtn}
                                            disabled={!!busy || !pool.sponsorChannel}
                                            onClick={() =>
                                                void busyThen(
                                                    `apply-${pool._id}`,
                                                    () => filkoshApi.applyPoolMtProxySponsor(pool._id),
                                                    'اعمال اسپانسر روی همه نودهای فعال تمام شد',
                                                )
                                            }
                                        >
                                            {busy === `apply-${pool._id}` ? 'در حال اعمال…' : 'اعمال روی همه نودها'}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.secondaryBtn}
                                            disabled={!!busy}
                                            onClick={() =>
                                                void busyThen(
                                                    `register-${pool._id}`,
                                                    () => filkoshApi.registerPoolMtProxySponsor(pool._id),
                                                    'ثبت خودکار انجام شد',
                                                )
                                            }
                                        >
                                            {busy === `register-${pool._id}` ? 'در حال ثبت…' : 'ثبت خودکار نودهای بدون ad_tag'}
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.metaRow}>
                                    <span>
                                        کانال: <strong dir="ltr">{pool.sponsorChannel || '—'}</strong>
                                    </span>
                                    <span>ثبت خودکار: {pool.autoRegisterSponsor ? 'روشن' : 'خاموش'}</span>
                                </div>
                                {channelDraft?.poolId === pool._id ? (
                                    <form onSubmit={saveChannel} className={styles.formPanel} style={{marginTop: '0.8rem'}}>
                                        <label className={styles.field}>
                                            <span>یوزرنیم کانال (بدون @)</span>
                                            <input
                                                dir="ltr"
                                                placeholder="myproxychannel"
                                                value={channelDraft.channel}
                                                onChange={(e) =>
                                                    setChannelDraft((prev) =>
                                                        prev ? {...prev, channel: e.target.value} : prev,
                                                    )
                                                }
                                            />
                                            <span className={styles.fieldHint}>
                                                کانال باید عمومی باشد؛ این مقدار برای نمایش و اطلاع‌رسانی استفاده می‌شود.
                                            </span>
                                        </label>
                                        <div className={styles.formActions}>
                                            <button type="submit" className={styles.primaryBtn} disabled={busy === 'channel'}>
                                                ذخیره
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.secondaryBtn}
                                                onClick={() => setChannelDraft(null)}
                                            >
                                                انصراف
                                            </button>
                                        </div>
                                    </form>
                                ) : null}
                            </div>
                        ))
                    )}

                    {/* ---- نودهای بدون ad_tag ---- */}
                    <h2 className={styles.panelTitle} style={{marginTop: '2rem'}}>
                        نودهای بدون ad_tag ({toFarsiNumber(withoutTag.length)})
                    </h2>
                    {withoutTag.length === 0 ? (
                        <TableEmptyState
                            icon={<LuMegaphone size={32} />}
                            title={nodes.length === 0 ? 'نود فعالی نیست' : 'همه نودهای فعال ad_tag دارند'}
                            description={
                                nodes.length === 0
                                    ? 'بعد از نصب نودها، اینجا می‌توانید اسپانسری را تنظیم کنید.'
                                    : 'کانال اسپانسر روی همه نودهای فعال اعمال شده است.'
                            }
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نود</th>
                                            <th>استخر</th>
                                            <th>آدرس</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withoutPaging.pageItems.map((n) => (
                                            <tr key={n._id}>
                                                <td data-label="نود" className={styles.cellPrimary}>
                                                    <Link href={`/mtproxy/${n._id}`} className={styles.linkCell}>
                                                        {n.name}
                                                    </Link>
                                                </td>
                                                <td data-label="استخر">{poolName(n)}</td>
                                                <td data-label="آدرس" className={styles.cellLtr}>
                                                    {n.host}:{n.port}
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={n._id}
                                                        items={[
                                                            {
                                                                label: 'وارد کردن ad_tag دستی',
                                                                onClick: () => {
                                                                    setTagModal(n);
                                                                    setTagValue('');
                                                                },
                                                            },
                                                            {
                                                                label: busy === `reg-${n._id}` ? 'در حال ثبت…' : 'ثبت خودکار',
                                                                onClick: () =>
                                                                    void busyThen(
                                                                        `reg-${n._id}`,
                                                                        () => filkoshApi.registerMtProxySponsor(n._id),
                                                                        'نود نزد @MTProxybot ثبت شد',
                                                                    ),
                                                            },
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableTheme>
                            <div className={styles.paginationSpace}>
                                <Pagination
                                    rtl
                                    itemPerPage={withoutPaging.itemPerPage}
                                    totalItems={withoutPaging.totalItems}
                                    currentPage={withoutPaging.currentPage}
                                    paginate={withoutPaging.paginate}
                                    setRowsPerPage={withoutPaging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}

                    {/* ---- نودهای دارای ad_tag ---- */}
                    <h2 className={styles.panelTitle} style={{marginTop: '2rem'}}>
                        نودهای دارای ad_tag ({toFarsiNumber(withTag.length)})
                    </h2>
                    {withTag.length === 0 ? (
                        <p className={styles.emptyHint}>
                            <LuSend size={14} /> هنوز هیچ نودی اسپانسری نشده — از جدول بالا شروع کنید.
                        </p>
                    ) : (
                        <TableTheme>
                            <table>
                                <thead>
                                    <tr>
                                        <th>نود</th>
                                        <th>استخر</th>
                                        <th>ad_tag</th>
                                        <th>زمان اعمال</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withTag.map((n) => (
                                        <tr key={n._id}>
                                            <td data-label="نود" className={styles.cellPrimary}>
                                                <Link href={`/mtproxy/${n._id}`} className={styles.linkCell}>
                                                    {n.name}
                                                </Link>
                                            </td>
                                            <td data-label="استخر">{poolName(n)}</td>
                                            <td data-label="ad_tag" className={styles.codeCell}>
                                                {n.adTag.slice(0, 8)}…
                                            </td>
                                            <td data-label="زمان اعمال">
                                                {n.sponsorAppliedAt
                                                    ? new Date(n.sponsorAppliedAt).toLocaleString('fa-IR')
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}
                </div>
            </Wrapper>

            {tagModal ? (
                <div className={styles.modalOverlay} onClick={() => setTagModal(null)}>
                    <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>ad_tag دستی برای «{tagModal.name}»</h3>
                        <p className={styles.emptyHint}>
                            در تلگرام به @MTProxybot پیام بدهید: اول <code dir="ltr">/newproxy</code> و بعد{' '}
                            <code dir="ltr">{tagModal.host}:{tagModal.port}:</code>&lt;راز&gt;. کد ۳۲ رقمی دریافتی را
                            اینجا وارد کنید.
                        </p>
                        <form onSubmit={submitTag}>
                            <label className={styles.field}>
                                <span>ad_tag *</span>
                                <input
                                    required
                                    dir="ltr"
                                    minLength={8}
                                    value={tagValue}
                                    onChange={(e) => setTagValue(e.target.value)}
                                />
                            </label>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.primaryBtn}>
                                    ثبت و اعمال
                                </button>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setTagModal(null)}>
                                    انصراف
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
