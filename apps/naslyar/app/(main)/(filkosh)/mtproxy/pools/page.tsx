'use client';

import React, {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {LuSend} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshMtProxyPool} from '../../lib/filkosh-api';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import {useClientPaging} from '../../components/useClientPaging';
import {useLoadOnMount} from '../../components/useLoadOnMount';

const EMPTY_FORM = {
    name: '',
    slug: '',
    description: '',
    defaultPort: 443,
    fakeTlsDomain: 'www.cloudflare.com',
    installMethod: 'source',
    targetHealthy: 1,
    maxFailStreak: 3,
    autoReplace: true,
    sponsorChannel: '',
    autoRegisterSponsor: true,
    notifyChatId: '',
};

function badgeClass(tone: string) {
    if (tone === 'success') return styles.badgeSuccess;
    if (tone === 'danger') return styles.badgeDanger;
    if (tone === 'warning') return styles.badgeWarning;
    return styles.badgeMuted;
}

function statusCounts(counts: Record<string, number> | undefined) {
    if (!counts) return null;
    const active = counts.active || 0;
    const pending = counts.pending || 0;
    const failed = counts.failed || 0;
    return {active, pending, failed};
}

export default function FilkoshMtProxyPoolsPage() {
    const [pools, setPools] = useState<FilkoshMtProxyPool[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setPools(await filkoshApi.listMtProxyPools());
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const paging = useClientPaging(pools);

    const set = (key: string, value: unknown) => setForm((f) => ({...f, [key]: value}));

    const startEdit = (pool: FilkoshMtProxyPool) => {
        setEditingId(pool._id);
        setForm({
            name: pool.name,
            slug: pool.slug,
            description: pool.description || '',
            defaultPort: pool.defaultPort,
            fakeTlsDomain: pool.fakeTlsDomain || '',
            installMethod: pool.installMethod || 'source',
            targetHealthy: pool.targetHealthy || 1,
            maxFailStreak: pool.maxFailStreak || 3,
            autoReplace: pool.autoReplace !== false,
            sponsorChannel: pool.sponsorChannel || '',
            autoRegisterSponsor: pool.autoRegisterSponsor !== false,
            notifyChatId: pool.notifyChatId || '',
        });
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            if (editingId) {
                await filkoshApi.updateMtProxyPool(editingId, form);
                SuccessToaster({message: 'استخر بروزرسانی شد'});
            } else {
                await filkoshApi.createMtProxyPool(form);
                SuccessToaster({message: 'استخر ساخته شد'});
            }
            resetForm();
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const handleReconcile = async (pool: FilkoshMtProxyPool) => {
        try {
            setBusy(true);
            const result = await filkoshApi.reconcileMtProxyPool(pool._id);
            if (result.sufficient) {
                SuccessToaster({message: `${toFarsiNumber(result.healthy)} نود فعال — ظرفیت کافی است`});
            } else {
                ErrorToaster(
                    new Error(
                        `${toFarsiNumber(result.healthy)} از ${toFarsiNumber(result.target)} — نود آماده کافی نبود${
                            result.promoted.length ? ` (${toFarsiNumber(result.promoted.length)} مورد ارتقا یافت)` : ''
                        }`,
                    ),
                );
            }
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const handleRotate = async (pool: FilkoshMtProxyPool) => {
        if (
            !confirm(
                `راز مشترک استخر «${pool.name}» عوض شود؟ همه نودهای فعال با راز جدید نصب مجدد می‌شوند (چند دقیقه).`,
            )
        )
            return;
        try {
            setBusy(true);
            const result = await filkoshApi.rotateMtProxyPoolSecret(pool._id);
            SuccessToaster({message: `${toFarsiNumber(result.rotated)} از ${toFarsiNumber(result.total)} نود با راز جدید نصب شد`});
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (pool: FilkoshMtProxyPool) => {
        if (!confirm(`حذف استخر «${pool.name}»؟`)) return;
        try {
            await filkoshApi.deleteMtProxyPool(pool._id);
            SuccessToaster({message: 'استخر حذف شد'});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const toggleActive = async (pool: FilkoshMtProxyPool) => {
        try {
            await filkoshApi.updateMtProxyPool(pool._id, {isActive: !pool.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const stats = useMemo(
        () => ({
            total: pools.length,
            active: pools.filter((p) => p.isActive).length,
        }),
        [pools],
    );

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>استخرهای پروکسی</h1>
                                <p className={styles.subtitle}>مدیریت استخرهای ناوگان MTProto proxy تلگرام.</p>
                            </div>
                            <Link href="/mtproxy" className={styles.backLink}>بازگشت به پروکسی تلگرام</Link>
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
                            <h1 className={styles.mainTitle}>استخرهای پروکسی</h1>
                            <p className={styles.subtitle}>
                                {toFarsiNumber(stats.active)} استخر فعال از {toFarsiNumber(stats.total)} — تنظیمات مشترک
                                نودها، راز مشترک و حداقل ظرفیت سالم.
                            </p>
                        </div>
                        <Link href="/mtproxy" className={styles.backLink}>بازگشت به پروکسی تلگرام</Link>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxyPools} />

                    <h2 className={styles.panelTitle}>{editingId ? 'ویرایش استخر' : 'استخر جدید'}</h2>
                    <form onSubmit={submit} className={styles.formPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>نام *</span>
                                <input
                                    required
                                    minLength={2}
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>slug * {editingId ? '(غیرقابل تغییر)' : ''}</span>
                                <input
                                    required
                                    dir="ltr"
                                    disabled={!!editingId}
                                    placeholder="main"
                                    value={form.slug}
                                    onChange={(e) => set('slug', e.target.value.toLowerCase())}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>پورت پیش‌فرض</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={65535}
                                    dir="ltr"
                                    value={form.defaultPort}
                                    onChange={(e) => set('defaultPort', Number(e.target.value))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>دامنه FakeTLS</span>
                                <input
                                    dir="ltr"
                                    placeholder="www.cloudflare.com — خالی = بدون faketls"
                                    value={form.fakeTlsDomain}
                                    onChange={(e) => set('fakeTlsDomain', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>روش نصب</span>
                                <select value={form.installMethod} onChange={(e) => set('installMethod', e.target.value)}>
                                    <option value="source">systemd (بیلد سورس)</option>
                                    <option value="docker">docker</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>حداقل نود سالم *</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={form.targetHealthy}
                                    onChange={(e) => set('targetHealthy', Number(e.target.value))}
                                />
                                <span className={styles.fieldHint}>سیستم با ارتقای نودهای آماده، این تعداد را حفظ می‌کند</span>
                            </label>
                            <label className={styles.field}>
                                <span>چک ناموفق مجاز</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={form.maxFailStreak}
                                    onChange={(e) => set('maxFailStreak', Number(e.target.value))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>کانال اسپانسر</span>
                                <input
                                    dir="ltr"
                                    placeholder="mychannel@ (بدون @)"
                                    value={form.sponsorChannel}
                                    onChange={(e) => set('sponsorChannel', e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>چت اطلاع‌رسانی (اختیاری)</span>
                                <input
                                    dir="ltr"
                                    placeholder="خالی = چت ادمین سراسری"
                                    value={form.notifyChatId}
                                    onChange={(e) => set('notifyChatId', e.target.value)}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>توضیح</span>
                                <input value={form.description} onChange={(e) => set('description', e.target.value)} />
                            </label>
                        </div>
                        <div className={styles.checkRow}>
                            <label className={styles.checkField}>
                                <input
                                    type="checkbox"
                                    checked={form.autoReplace}
                                    onChange={(e) => set('autoReplace', e.target.checked)}
                                />
                                <span>جایگزینی خودکار نود خراب</span>
                            </label>
                            <label className={styles.checkField}>
                                <input
                                    type="checkbox"
                                    checked={form.autoRegisterSponsor}
                                    onChange={(e) => set('autoRegisterSponsor', e.target.checked)}
                                />
                                <span>ثبت خودکار اسپانسری (سشن تلگرام لازم است)</span>
                            </label>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                {editingId ? 'ذخیره تغییرات' : 'ساخت استخر'}
                            </button>
                            {editingId ? (
                                <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
                                    انصراف از ویرایش
                                </button>
                            ) : null}
                        </div>
                    </form>

                    {pools.length === 0 ? (
                        <TableEmptyState
                            icon={<LuSend size={32} />}
                            title="هنوز استخری ساخته نشده"
                            description="استخر یعنی یک سرویس پروکسی با ظرفیت مقیاس‌پذیر؛ بعد از ساخت، نودها را واردش کنید."
                            primaryLabel="ساخت اولین استخر"
                            onPrimaryClick={() => {
                                document.querySelector('form')?.scrollIntoView({behavior: 'smooth'});
                            }}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نام</th>
                                            <th>slug</th>
                                            <th>پورت</th>
                                            <th>FakeTLS</th>
                                            <th>ظرفیت</th>
                                            <th>اسپانسر</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paging.pageItems.map((p) => {
                                            const counts = statusCounts(p.counts);
                                            return (
                                                <tr key={p._id}>
                                                    <td data-label="نام" className={styles.cellPrimary}>
                                                        {p.name}
                                                        {p.description ? (
                                                            <div className={styles.cellMuted}>{p.description}</div>
                                                        ) : null}
                                                    </td>
                                                    <td data-label="slug" className={styles.codeCell}>{p.slug}</td>
                                                    <td data-label="پورت">{toFarsiNumber(p.defaultPort)}</td>
                                                    <td data-label="FakeTLS" className={styles.cellLtr}>
                                                        {p.fakeTlsDomain || '—'}
                                                    </td>
                                                    <td data-label="ظرفیت">
                                                        {counts ? (
                                                            <>
                                                                <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                                    {toFarsiNumber(counts.active)} فعال
                                                                </span>{' '}
                                                                <span className={`${styles.badge} ${styles.badgeMuted}`}>
                                                                    {toFarsiNumber(counts.pending)} آماده
                                                                </span>
                                                                {counts.failed ? (
                                                                    <>
                                                                        {' '}
                                                                        <span className={`${styles.badge} ${styles.badgeDanger}`}>
                                                                            {toFarsiNumber(counts.failed)} خراب
                                                                        </span>
                                                                    </>
                                                                ) : null}
                                                                <div className={styles.cellMuted}>
                                                                    حداقل: {toFarsiNumber(p.targetHealthy)}
                                                                </div>
                                                            </>
                                                        ) : '—'}
                                                    </td>
                                                    <td data-label="اسپانسر" className={styles.cellLtr}>
                                                        {p.sponsorChannel || '—'}
                                                    </td>
                                                    <td data-label="وضعیت">
                                                        <span className={`${styles.badge} ${p.isActive ? badgeClass('success') : styles.badgeMuted}`}>
                                                            {p.isActive ? 'فعال' : 'غیرفعال'}
                                                        </span>
                                                        {!p.autoReplace ? (
                                                            <div className={styles.cellMuted}>جایگزینی خودکار خاموش</div>
                                                        ) : null}
                                                    </td>
                                                    <td data-label="عملیات">
                                                        <HrRowActionMenu
                                                            rowId={p._id}
                                                            items={[
                                                                {label: 'ویرایش', onClick: () => startEdit(p)},
                                                                {label: 'هماهنگ‌سازی (ارتقای آماده‌ها)', onClick: () => void handleReconcile(p)},
                                                                {label: 'چرخش راز مشترک', onClick: () => void handleRotate(p)},
                                                                {
                                                                    label: p.isActive ? 'غیرفعال کن' : 'فعال کن',
                                                                    onClick: () => void toggleActive(p),
                                                                },
                                                                {label: 'حذف', danger: true, onClick: () => void handleDelete(p)},
                                                            ]}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableTheme>
                            <div className={styles.paginationSpace}>
                                <Pagination
                                    rtl
                                    itemPerPage={paging.itemPerPage}
                                    totalItems={paging.totalItems}
                                    currentPage={paging.currentPage}
                                    paginate={paging.paginate}
                                    setRowsPerPage={paging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
