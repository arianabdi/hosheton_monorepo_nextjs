'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LuRefreshCw} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import {filkoshApi, FilkoshMtProxyEvent, FilkoshMtProxyNode} from '../../lib/filkosh-api';
import {
    MT_PROXY_EVENT_LEVEL_LABEL,
    MT_PROXY_EVENT_LEVEL_TONE,
    MT_PROXY_EVENT_TYPE_LABEL,
    MT_PROXY_NODE_STATUS_LABEL,
    MT_PROXY_NODE_STATUS_TONE,
} from '../../lib/labels';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import {useLoadOnMount} from '../../components/useLoadOnMount';
import {useClientPaging} from '../../components/useClientPaging';
import MtProxyProvisionMonitor from '../../components/MtProxyProvisionMonitor';

function badgeClass(tone: string) {
    if (tone === 'success') return styles.badgeSuccess;
    if (tone === 'danger') return styles.badgeDanger;
    if (tone === 'warning') return styles.badgeWarning;
    return styles.badgeMuted;
}

export default function FilkoshMtProxyNodePage({params}: {params: Promise<{id: string}>}) {
    const router = useRouter();
    const {id} = React.use(params);
    const [node, setNode] = useState<FilkoshMtProxyNode | null>(null);
    const [events, setEvents] = useState<FilkoshMtProxyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [adTag, setAdTag] = useState('');
    const [monitorVisible, setMonitorVisible] = useState(false);
    const [monitorKey, setMonitorKey] = useState(0);

    const load = useCallback(async (opts?: {silent?: boolean}) => {
        try {
            // رفرش بی‌صدا اسپینر کامل نشان نمی‌دهد تا مانیتور نصب unmount نشود؛
            // وگرنه unmount/remount مانیتور، پایان نصب را دوباره تشخیص می‌دهد و
            // چرخه‌ی بی‌پایان «رفرش کامل صفحه» شکل می‌گیرد.
            if (!opts?.silent) setLoading(true);
            const [n, ev] = await Promise.all([
                filkoshApi.getMtProxyNode(id),
                filkoshApi.listMtProxyEvents({nodeId: id, limit: 200}),
            ]);
            setNode(n);
            setEvents(ev);
            setAdTag((n as FilkoshMtProxyNode).adTag || '');
            // اگر نصبی در جریان است، مانیتور خودکار نمایش داده می‌شود
            if ((n as FilkoshMtProxyNode).status === 'provisioning') setMonitorVisible(true);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useLoadOnMount(load);

    // صفحه‌بندی رویدادهای نود — حداقل ۲۵ آیتم در هر صفحه
    const eventsPaging = useClientPaging(events, 25);

    // هندلر پایدار (useCallback) — اگر inline باشد، با هر رندرِ والد اثر پولینگ مانیتور
    // ری‌استارت می‌شود و onFinished بارها اجرا می‌شود.
    const handleMonitorFinished = useCallback(() => {
        void load({silent: true});
    }, [load]);

    const pool = typeof node?.poolId === 'object' ? node?.poolId : null;

    const links = useMemo(() => {
        if (!node?.clientSecret) return null;
        return {
            tg: `tg://proxy?server=${node.host}&port=${node.port}&secret=${node.clientSecret}`,
            https: `https://t.me/proxy?server=${node.host}&port=${node.port}&secret=${node.clientSecret}`,
        };
    }, [node]);

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            SuccessToaster({message: `${label} کپی شد`});
        } catch {
            ErrorToaster(new Error('کپی ناموفق بود — دستی انتخاب و کپی کنید'));
        }
    };

    const run = async (key: string, action: () => Promise<unknown>, doneMessage: string) => {
        try {
            setBusy(key);
            await action();
            SuccessToaster({message: doneMessage});
            await load({silent: true});
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy('');
        }
    };

    const handleProvision = () => {
        if (!confirm('نصب/نصب مجدد MTProto proxy روی این نود؟ پیشرفت به صورت زنده نمایش داده می‌شود و قابل توقف است.')) return;
        void run('provision', async () => {
            await filkoshApi.provisionMtProxyNode(id);
            setMonitorKey((k) => k + 1);
            setMonitorVisible(true);
        }, 'نصب در پس‌زمینه شروع شد');
    };
    const handleCheck = () => void run('check', () => filkoshApi.checkMtProxyNode(id), 'بررسی انجام شد');
    const handleReplace = () => {
        if (!confirm('این نود بازنشسته و نود جایگزین فعال شود؟')) return;
        void run('replace', () => filkoshApi.replaceMtProxyNode(id), 'جایگزینی انجام شد');
    };
    const handleRetire = () => {
        if (!confirm('این نود بازنشسته شود؟ (سرویس روی سرور stop می‌شود)')) return;
        void run('retire', () => filkoshApi.retireMtProxyNode(id), 'نود بازنشسته شد');
    };
    const handleDelete = () => {
        if (!confirm('حذف کامل نود؟ سرویس پروکسی، فایل‌ها و رازها به طور کامل از سرور پاک می‌شود.')) return;
        void run('delete', async () => {
            const result = await filkoshApi.deleteMtProxyNode(id);
            if (result?.serverCleaned === false) {
                ErrorToaster(new Error('رکورد حذف شد ولی پاک‌سازی سرور کامل نبود — رویدادها را ببینید'));
            }
            router.push('/mtproxy');
        }, 'نود حذف و سرور پاک‌سازی شد');
    };

    const handleSaveAdTag = async (e: React.FormEvent) => {
        e.preventDefault();
        await run('adtag', () => filkoshApi.setMtProxyAdTag(id, adTag.trim()), 'ad_tag ثبت و اعمال شد');
    };

    const handleAutoRegister = () => {
        void run('register', () => filkoshApi.registerMtProxySponsor(id), 'نود نزد @MTProxybot ثبت شد');
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    if (!node) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>نود پیدا نشد</h1>
                            </div>
                            <Link href="/mtproxy" className={styles.backLink}>بازگشت به لیست</Link>
                        </header>
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
                            <h1 className={styles.mainTitle}>
                                نود {node.name}
                            </h1>
                            <p className={styles.subtitle}>
                                استخر {pool?.name || '—'} · {node.host}:{node.port}
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load({silent: true})} disabled={!!busy}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/mtproxy" className={styles.secondaryBtn}>بازگشت به لیست</Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxy} defaultExpanded={false} />

                    {monitorVisible ? (
                        <MtProxyProvisionMonitor
                            key={monitorKey}
                            nodeId={id}
                            onFinished={handleMonitorFinished}
                        />
                    ) : null}

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>وضعیت</h2>
                            <span className={`${styles.badge} ${badgeClass(MT_PROXY_NODE_STATUS_TONE[node.status] || 'muted')}`}>
                                {MT_PROXY_NODE_STATUS_LABEL[node.status] || node.status}
                            </span>
                        </div>
                        <div className={styles.metaRow}>
                            <span>
                                <strong>پورت:</strong> {toFarsiNumber(node.port)}
                            </span>
                            <span>
                                <strong>روش نصب:</strong> {node.installMethod === 'docker' ? 'Docker' : 'systemd'}
                            </span>
                            <span>
                                <strong>FakeTLS:</strong> {node.fakeTlsDomain || '—'}
                            </span>
                            <span>
                                <strong>کشور:</strong> {node.country || '—'}
                            </span>
                            <span>
                                <strong>آخرین چک:</strong>{' '}
                                {node.lastCheckAt ? new Date(node.lastCheckAt).toLocaleString('fa-IR') : '—'}
                            </span>
                            <span>
                                <strong>آخرین موفق:</strong>{' '}
                                {node.lastOkAt ? new Date(node.lastOkAt).toLocaleString('fa-IR') : '—'}
                            </span>
                            <span>
                                <strong>تاخیر:</strong> {node.latencyMs != null ? `${toFarsiNumber(node.latencyMs)}ms` : '—'}
                            </span>
                            <span>
                                <strong>چک ناموفق پیاپی:</strong> {toFarsiNumber(node.failStreak || 0)}
                            </span>
                            <span>
                                <strong>نصب خودکار (standby):</strong> {node.autoProvision ? 'بله' : 'خیر'}
                            </span>
                            {node.serverId ? (
                                <span>
                                    <strong>سرور:</strong>{' '}
                                    {typeof node.serverId === 'object'
                                        ? (node.serverId as {name: string}).name
                                        : 'متصل به سرور'}
                                </span>
                            ) : null}
                        </div>
                        {node.lastError ? (
                            <p className={styles.installError} style={{marginTop: '0.8rem'}}>{node.lastError}</p>
                        ) : null}
                        <div className={styles.actions} style={{marginTop: '1rem'}}>
                            <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.actionPrimary}`}
                                onClick={handleProvision}
                                disabled={!!busy}
                            >
                                {busy === 'provision' ? 'در حال نصب…' : 'نصب / نصب مجدد'}
                            </button>
                            <button type="button" className={styles.actionBtn} onClick={handleCheck} disabled={!!busy}>
                                {busy === 'check' ? 'در حال بررسی…' : 'تست اتصال'}
                            </button>
                            <button type="button" className={styles.actionBtn} onClick={handleReplace} disabled={!!busy}>
                                {busy === 'replace' ? 'در حال جایگزینی…' : 'جایگزینی با نود آماده'}
                            </button>
                            <button type="button" className={styles.actionBtn} onClick={handleRetire} disabled={!!busy}>
                                بازنشستگی
                            </button>
                            <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={!!busy}>
                                حذف
                            </button>
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>لینک اتصال</h2>
                        </div>
                        {links && node.status === 'active' ? (
                            <>
                                <div className={styles.opRow} style={{marginBottom: '0.6rem'}}>
                                    <button
                                        type="button"
                                        className={`${styles.actionBtn} ${styles.actionPrimary}`}
                                        onClick={() => copy(links.tg, 'لینک tg://')}
                                    >
                                        کپی tg://
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.actionBtn}
                                        onClick={() => copy(links.https, 'لینک t.me')}
                                    >
                                        کپی https://t.me
                                    </button>
                                    <a className={styles.secondaryBtn} href={links.tg}>
                                        بازکردن در تلگرام
                                    </a>
                                </div>
                                <div className={styles.preBox}>{links.https}</div>
                                <p className={styles.fieldHint} style={{marginTop: '0.5rem'}}>
                                    این لینک برای همه نودهای استخر یکسان است (راز مشترک) — کلاینت‌ها نیازی به لینک جداگانه
                                    هر سرور ندارند.
                                </p>
                            </>
                        ) : (
                            <p className={styles.emptyHint}>
                                بعد از نصب موفق، لینک اتصال اینجا نمایش داده می‌شود.
                            </p>
                        )}
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>اسپانسری (کانال تبلیغاتی)</h2>
                            <span className={`${styles.badge} ${node.adTag ? styles.badgeSuccess : styles.badgeMuted}`}>
                                {node.adTag ? 'ad_tag ثبت شده' : 'بدون ad_tag'}
                            </span>
                        </div>
                        <form onSubmit={handleSaveAdTag}>
                            <div className={styles.formGrid}>
                                <label className={styles.field}>
                                    <span>ad_tag از @MTProxybot</span>
                                    <input
                                        dir="ltr"
                                        placeholder="32 کاراکتر hex"
                                        value={adTag}
                                        onChange={(e) => setAdTag(e.target.value)}
                                    />
                                    <span className={styles.fieldHint}>
                                        در تلگرام به @MTProxybot پیام بدهید، /newproxy و بعد سرور:پورت:راز را بفرستید؛
                                        ad_tag را اینجا وارد کنید.
                                    </span>
                                </label>
                            </div>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.primaryBtn} disabled={!!busy || !adTag.trim()}>
                                    {busy === 'adtag' ? 'در حال ثبت…' : 'ثبت و اعمال'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={handleAutoRegister}
                                    disabled={!!busy}
                                >
                                    {busy === 'register' ? 'در حال ثبت خودکار…' : 'ثبت خودکار نزد @MTProxybot'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>رویدادهای اخیر این نود</h2>
                            <span className={`${styles.badge} ${styles.badgeMuted}`}>
                                {toFarsiNumber(events.length)} رویداد
                            </span>
                        </div>
                        {events.length === 0 ? (
                            <p className={styles.emptyHint}>هنوز رویدادی ثبت نشده.</p>
                        ) : (
                            <>
                                <TableTheme>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>زمان</th>
                                                <th>نوع</th>
                                                <th>سطح</th>
                                                <th>پیام</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {eventsPaging.pageItems.map((ev) => (
                                                <tr key={ev._id}>
                                                    <td data-label="زمان">{new Date(ev.createdAt).toLocaleString('fa-IR')}</td>
                                                    <td data-label="نوع">
                                                        {MT_PROXY_EVENT_TYPE_LABEL[ev.type] || ev.type}
                                                    </td>
                                                    <td data-label="سطح">
                                                        <span
                                                            className={`${styles.badge} ${badgeClass(MT_PROXY_EVENT_LEVEL_TONE[ev.level] || 'muted')}`}
                                                        >
                                                            {MT_PROXY_EVENT_LEVEL_LABEL[ev.level] || ev.level}
                                                        </span>
                                                    </td>
                                                    <td data-label="پیام">{ev.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableTheme>
                                <div className={styles.paginationSpace}>
                                    <Pagination
                                        rtl
                                        itemPerPage={eventsPaging.itemPerPage}
                                        totalItems={eventsPaging.totalItems}
                                        currentPage={eventsPaging.currentPage}
                                        paginate={eventsPaging.paginate}
                                        setRowsPerPage={eventsPaging.setRowsPerPage}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
