'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {LuMegaphone, LuPackage} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshAnnouncement, FilkoshAppRelease} from '../lib/filkosh-api';
import {APP_SCOPE_LABEL} from '../lib/labels';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

const EMPTY_RELEASE_FILTERS = {q: '', app: '', status: ''};
const EMPTY_ANNOUNCEMENT_FILTERS = {q: '', app: '', status: ''};

export default function FilkoshAppsPage() {
    const [releases, setReleases] = useState<FilkoshAppRelease[]>([]);
    const [announcements, setAnnouncements] = useState<FilkoshAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [releaseFilters, setReleaseFilters] = useState(EMPTY_RELEASE_FILTERS);
    const [announcementFilters, setAnnouncementFilters] = useState(EMPTY_ANNOUNCEMENT_FILTERS);

    const [releaseForm, setReleaseForm] = useState({
        app: 'vpn',
        versionName: '',
        versionCode: 1,
        minSupportedCode: 1,
        downloadUrl: '',
        changelog: '',
        forceUpdate: false,
    });
    const [announcementForm, setAnnouncementForm] = useState({
        app: 'both',
        title: '',
        body: '',
        type: 'info',
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [r, a] = await Promise.all([filkoshApi.listReleases(), filkoshApi.listAnnouncements()]);
            setReleases(r);
            setAnnouncements(a);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const filteredReleases = useMemo(() => {
        const q = releaseFilters.q.trim().toLowerCase();
        return releases.filter((r) => {
            if (releaseFilters.app && r.app !== releaseFilters.app) return false;
            if (releaseFilters.status === 'active' && !r.isActive) return false;
            if (releaseFilters.status === 'inactive' && r.isActive) return false;
            if (!q) return true;
            return r.versionName.toLowerCase().includes(q) || (r.changelog || '').toLowerCase().includes(q);
        });
    }, [releases, releaseFilters]);

    const filteredAnnouncements = useMemo(() => {
        const q = announcementFilters.q.trim().toLowerCase();
        return announcements.filter((a) => {
            if (announcementFilters.app && a.app !== announcementFilters.app) return false;
            if (announcementFilters.status === 'active' && !a.isActive) return false;
            if (announcementFilters.status === 'inactive' && a.isActive) return false;
            if (!q) return true;
            return a.title.toLowerCase().includes(q) || (a.body || '').toLowerCase().includes(q);
        });
    }, [announcements, announcementFilters]);

    const releasePaging = useClientPaging(filteredReleases);
    const announcementPaging = useClientPaging(filteredAnnouncements);

    const changeReleaseFilter = (key: string, value: string) => {
        setReleaseFilters((prev) => ({...prev, [key]: value}));
        releasePaging.resetPage();
    };
    const resetReleaseFilters = () => {
        setReleaseFilters(EMPTY_RELEASE_FILTERS);
        releasePaging.resetPage();
    };
    const changeAnnouncementFilter = (key: string, value: string) => {
        setAnnouncementFilters((prev) => ({...prev, [key]: value}));
        announcementPaging.resetPage();
    };
    const resetAnnouncementFilters = () => {
        setAnnouncementFilters(EMPTY_ANNOUNCEMENT_FILTERS);
        announcementPaging.resetPage();
    };

    const addRelease = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await filkoshApi.createRelease(releaseForm);
            SuccessToaster({message: 'نسخه ثبت شد'});
            setReleaseForm({
                app: 'vpn',
                versionName: '',
                versionCode: releaseForm.versionCode + 1,
                minSupportedCode: 1,
                downloadUrl: '',
                changelog: '',
                forceUpdate: false,
            });
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const addAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await filkoshApi.createAnnouncement(announcementForm);
            SuccessToaster({message: 'اطلاعیه ساخته شد'});
            setAnnouncementForm({app: 'both', title: '', body: '', type: 'info'});
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const toggleRelease = async (r: FilkoshAppRelease) => {
        try {
            await filkoshApi.updateRelease(r._id, {isActive: !r.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const toggleAnnouncement = async (a: FilkoshAnnouncement) => {
        try {
            await filkoshApi.updateAnnouncement(a._id, {isActive: !a.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>اپلیکیشن‌ها</h1>
                                <p className={styles.subtitle}>نسخه‌های اپ فیلکوش و اطلاعیه‌های درون‌برنامه‌ای.</p>
                            </div>
                        </header>
                        <ModuleGuide guide={FILKOSH_GUIDES.apps} />
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const releaseHasFilters = Object.values(releaseFilters).some(Boolean);
    const announcementHasFilters = Object.values(announcementFilters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>اپلیکیشن‌ها</h1>
                            <p className={styles.subtitle}>
                                نسخه‌های اپ فیلکوش (اجبار آپدیت) و اطلاعیه‌های درون‌برنامه‌ای.
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.apps} />

                    <h2 className={styles.panelTitle}>نسخه‌ها ({toFarsiNumber(releases.length)})</h2>
                    <form onSubmit={addRelease} className={styles.formPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>اپ</span>
                                <select value={releaseForm.app} onChange={(e) => setReleaseForm((f) => ({...f, app: e.target.value}))}>
                                    <option value="vpn">VPN</option>
                                    <option value="dns">DNS</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>نسخه (نام)</span>
                                <input
                                    required
                                    dir="ltr"
                                    placeholder="1.0.0"
                                    value={releaseForm.versionName}
                                    onChange={(e) => setReleaseForm((f) => ({...f, versionName: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>versionCode</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={releaseForm.versionCode}
                                    onChange={(e) => setReleaseForm((f) => ({...f, versionCode: Number(e.target.value)}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>حداقل نسخه مجاز</span>
                                <input
                                    type="number"
                                    min={1}
                                    dir="ltr"
                                    value={releaseForm.minSupportedCode}
                                    onChange={(e) => setReleaseForm((f) => ({...f, minSupportedCode: Number(e.target.value)}))}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>لینک دانلود APK</span>
                                <input
                                    dir="ltr"
                                    placeholder="https://..."
                                    value={releaseForm.downloadUrl}
                                    onChange={(e) => setReleaseForm((f) => ({...f, downloadUrl: e.target.value}))}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>تغییرات</span>
                                <input
                                    value={releaseForm.changelog}
                                    onChange={(e) => setReleaseForm((f) => ({...f, changelog: e.target.value}))}
                                />
                            </label>
                            <label className={styles.checkField}>
                                <input
                                    type="checkbox"
                                    checked={releaseForm.forceUpdate}
                                    onChange={(e) => setReleaseForm((f) => ({...f, forceUpdate: e.target.checked}))}
                                />
                                <span>آپدیت اجباری</span>
                            </label>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                ثبت نسخه
                            </button>
                        </div>
                    </form>

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نسخه یا تغییرات…'},
                            {
                                key: 'app',
                                type: 'select',
                                label: 'اپ',
                                allLabel: 'همه اپ‌ها',
                                options: [
                                    {value: 'vpn', label: 'VPN'},
                                    {value: 'dns', label: 'DNS'},
                                ],
                            },
                            {
                                key: 'status',
                                type: 'select',
                                label: 'وضعیت',
                                allLabel: 'همه وضعیت‌ها',
                                options: [
                                    {value: 'active', label: 'فعال'},
                                    {value: 'inactive', label: 'غیرفعال'},
                                ],
                            },
                        ]}
                        values={releaseFilters}
                        onChange={changeReleaseFilter}
                        onApply={() => releasePaging.resetPage()}
                        onReset={resetReleaseFilters}
                        resultCount={filteredReleases.length}
                        resultLabel="نسخه"
                    />

                    {filteredReleases.length === 0 ? (
                        <TableEmptyState
                            icon={<LuPackage size={32} />}
                            title={releaseHasFilters ? 'نسخه‌ای یافت نشد' : 'هنوز نسخه‌ای ثبت نشده'}
                            description={releaseHasFilters ? 'فیلترها را تغییر دهید.' : 'اولین نسخه APK را از فرم بالا ثبت کنید.'}
                            secondaryLabel={releaseHasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={releaseHasFilters ? resetReleaseFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>اپ</th>
                                            <th>نسخه</th>
                                            <th>کد</th>
                                            <th>حداقل</th>
                                            <th>آپدیت اجباری</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {releasePaging.pageItems.map((r) => (
                                            <tr key={r._id}>
                                                <td data-label="اپ">{r.app === 'vpn' ? 'VPN' : 'DNS'}</td>
                                                <td data-label="نسخه" className={styles.codeCell}>
                                                    {r.versionName}
                                                </td>
                                                <td data-label="کد">{toFarsiNumber(r.versionCode)}</td>
                                                <td data-label="حداقل">{toFarsiNumber(r.minSupportedCode)}</td>
                                                <td data-label="آپدیت اجباری">{r.forceUpdate ? 'بله' : 'خیر'}</td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${r.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                        {r.isActive ? 'فعال' : 'غیرفعال'}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={r._id}
                                                        items={[
                                                            {
                                                                label: r.isActive ? 'غیرفعال کن' : 'فعال کن',
                                                                onClick: () => void toggleRelease(r),
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
                                    itemPerPage={releasePaging.itemPerPage}
                                    totalItems={releasePaging.totalItems}
                                    currentPage={releasePaging.currentPage}
                                    paginate={releasePaging.paginate}
                                    setRowsPerPage={releasePaging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}

                    <h2 className={styles.panelTitle} style={{marginTop: '2rem'}}>
                        اطلاعیه‌ها ({toFarsiNumber(announcements.length)})
                    </h2>
                    <form onSubmit={addAnnouncement} className={styles.formPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>اپ</span>
                                <select
                                    value={announcementForm.app}
                                    onChange={(e) => setAnnouncementForm((f) => ({...f, app: e.target.value}))}
                                >
                                    <option value="both">هر دو</option>
                                    <option value="vpn">VPN</option>
                                    <option value="dns">DNS</option>
                                </select>
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>عنوان *</span>
                                <input
                                    required
                                    value={announcementForm.title}
                                    onChange={(e) => setAnnouncementForm((f) => ({...f, title: e.target.value}))}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>متن</span>
                                <input
                                    value={announcementForm.body}
                                    onChange={(e) => setAnnouncementForm((f) => ({...f, body: e.target.value}))}
                                />
                            </label>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                ثبت اطلاعیه
                            </button>
                        </div>
                    </form>

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'عنوان یا متن…'},
                            {
                                key: 'app',
                                type: 'select',
                                label: 'اپ',
                                allLabel: 'همه اپ‌ها',
                                options: Object.entries(APP_SCOPE_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'status',
                                type: 'select',
                                label: 'وضعیت',
                                allLabel: 'همه وضعیت‌ها',
                                options: [
                                    {value: 'active', label: 'فعال'},
                                    {value: 'inactive', label: 'غیرفعال'},
                                ],
                            },
                        ]}
                        values={announcementFilters}
                        onChange={changeAnnouncementFilter}
                        onApply={() => announcementPaging.resetPage()}
                        onReset={resetAnnouncementFilters}
                        resultCount={filteredAnnouncements.length}
                        resultLabel="اطلاعیه"
                    />

                    {filteredAnnouncements.length === 0 ? (
                        <TableEmptyState
                            icon={<LuMegaphone size={32} />}
                            title={announcementHasFilters ? 'اطلاعیه‌ای یافت نشد' : 'هنوز اطلاعیه‌ای ثبت نشده'}
                            description={announcementHasFilters ? 'فیلترها را تغییر دهید.' : 'اولین اطلاعیه درون‌برنامه‌ای را ثبت کنید.'}
                            secondaryLabel={announcementHasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={
                                announcementHasFilters ? resetAnnouncementFilters : undefined
                            }
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>عنوان</th>
                                            <th>اپ</th>
                                            <th>نوع</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {announcementPaging.pageItems.map((a) => (
                                            <tr key={a._id}>
                                                <td data-label="عنوان" className={styles.cellPrimary}>
                                                    {a.title}
                                                    {a.body ? <div className={styles.cellMuted}>{a.body}</div> : null}
                                                </td>
                                                <td data-label="اپ">{APP_SCOPE_LABEL[a.app] || a.app}</td>
                                                <td data-label="نوع">{a.type}</td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${a.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                        {a.isActive ? 'فعال' : 'غیرفعال'}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={a._id}
                                                        items={[
                                                            {
                                                                label: a.isActive ? 'غیرفعال کن' : 'فعال کن',
                                                                onClick: () => void toggleAnnouncement(a),
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
                                    itemPerPage={announcementPaging.itemPerPage}
                                    totalItems={announcementPaging.totalItems}
                                    currentPage={announcementPaging.currentPage}
                                    paginate={announcementPaging.paginate}
                                    setRowsPerPage={announcementPaging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
