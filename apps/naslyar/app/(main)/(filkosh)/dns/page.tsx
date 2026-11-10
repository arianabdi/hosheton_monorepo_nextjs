'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {LuGlobe, LuShield} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshDnsProfile, FilkoshDnsProvider} from '../lib/filkosh-api';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

const BLOCKLISTS = [
    {key: 'ads', label: 'تبلیغات'},
    {key: 'malware', label: 'بدافزار'},
    {key: 'tracking', label: 'ردیاب‌ها'},
    {key: 'social', label: 'شبکه اجتماعی'},
    {key: 'gambling', label: 'قمار'},
    {key: 'adult', label: 'بزرگسال'},
    {key: 'crypto', label: 'کریپتو'},
    {key: 'fakeNews', label: 'اخبار جعلی'},
];

const EMPTY_PROVIDER_FILTERS = {q: '', status: '', feature: ''};
const EMPTY_PROFILE_FILTERS = {q: '', providerSlug: '', status: ''};

export default function FilkoshDnsPage() {
    const [providers, setProviders] = useState<FilkoshDnsProvider[]>([]);
    const [profiles, setProfiles] = useState<FilkoshDnsProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [providerFilters, setProviderFilters] = useState(EMPTY_PROVIDER_FILTERS);
    const [profileFilters, setProfileFilters] = useState(EMPTY_PROFILE_FILTERS);
    const [providerForm, setProviderForm] = useState({
        name: '',
        slug: '',
        protocol: 'doh',
        url: '',
        ip: '',
        description: '',
        adsBlocking: false,
        malwareBlocking: false,
    });
    const [profileForm, setProfileForm] = useState({
        name: '',
        slug: '',
        providerSlug: '',
        description: '',
        icon: '🛡️',
        blocklists: {} as Record<string, boolean>,
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [p, pr] = await Promise.all([filkoshApi.listDnsProviders(), filkoshApi.listDnsProfiles()]);
            setProviders(p);
            setProfiles(pr);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const filteredProviders = useMemo(() => {
        const q = providerFilters.q.trim().toLowerCase();
        return providers.filter((p) => {
            if (providerFilters.status === 'active' && !p.isActive) return false;
            if (providerFilters.status === 'inactive' && p.isActive) return false;
            if (providerFilters.feature === 'ads' && !p.adsBlocking) return false;
            if (providerFilters.feature === 'malware' && !p.malwareBlocking) return false;
            if (!q) return true;
            return (
                p.name.toLowerCase().includes(q) ||
                p.slug.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        });
    }, [providers, providerFilters]);

    const filteredProfiles = useMemo(() => {
        const q = profileFilters.q.trim().toLowerCase();
        return profiles.filter((p) => {
            if (profileFilters.providerSlug && p.providerSlug !== profileFilters.providerSlug) return false;
            if (profileFilters.status === 'active' && !p.isActive) return false;
            if (profileFilters.status === 'inactive' && p.isActive) return false;
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
        });
    }, [profiles, profileFilters]);

    const providerPaging = useClientPaging(filteredProviders);
    const profilePaging = useClientPaging(filteredProfiles);

    const changeProviderFilter = (key: string, value: string) => {
        setProviderFilters((prev) => ({...prev, [key]: value}));
        providerPaging.resetPage();
    };
    const resetProviderFilters = () => {
        setProviderFilters(EMPTY_PROVIDER_FILTERS);
        providerPaging.resetPage();
    };
    const changeProfileFilter = (key: string, value: string) => {
        setProfileFilters((prev) => ({...prev, [key]: value}));
        profilePaging.resetPage();
    };
    const resetProfileFilters = () => {
        setProfileFilters(EMPTY_PROFILE_FILTERS);
        profilePaging.resetPage();
    };

    const addProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            const body: Record<string, unknown> = {
                name: providerForm.name,
                slug: providerForm.slug,
                protocol: providerForm.protocol,
                description: providerForm.description,
                adsBlocking: providerForm.adsBlocking,
                malwareBlocking: providerForm.malwareBlocking,
                endpoints: providerForm.url ? [{url: providerForm.url, ip: providerForm.ip}] : [],
            };
            await filkoshApi.createDnsProvider(body);
            SuccessToaster({message: 'پرووایدر ساخته شد'});
            setProviderForm({
                name: '',
                slug: '',
                protocol: 'doh',
                url: '',
                ip: '',
                description: '',
                adsBlocking: false,
                malwareBlocking: false,
            });
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const addProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await filkoshApi.createDnsProfile(profileForm);
            SuccessToaster({message: 'پروفایل ساخته شد'});
            setProfileForm({name: '', slug: '', providerSlug: '', description: '', icon: '🛡️', blocklists: {}});
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const toggleProvider = async (p: FilkoshDnsProvider) => {
        try {
            await filkoshApi.updateDnsProvider(p._id, {isActive: !p.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deleteProvider = async (p: FilkoshDnsProvider) => {
        if (!confirm(`حذف پرووایدر «${p.name}»؟`)) return;
        try {
            await filkoshApi.deleteDnsProvider(p._id);
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const toggleProfile = async (p: FilkoshDnsProfile) => {
        try {
            await filkoshApi.updateDnsProfile(p._id, {isActive: !p.isActive});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deleteProfile = async (p: FilkoshDnsProfile) => {
        if (!confirm(`حذف پروفایل «${p.name}»؟`)) return;
        try {
            await filkoshApi.deleteDnsProfile(p._id);
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
                                <h1 className={styles.mainTitle}>DNS</h1>
                                <p className={styles.subtitle}>کاتالوگ پرووایدرها و پروفایل‌های بلاک‌لیست.</p>
                            </div>
                        </header>
                        <ModuleGuide guide={FILKOSH_GUIDES.dns} />
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const providerHasFilters = Object.values(providerFilters).some(Boolean);
    const profileHasFilters = Object.values(profileFilters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>DNS</h1>
                            <p className={styles.subtitle}>
                                کاتالوگ پرووایدرهای DNS و پروفایل‌های بلاک‌لیست برای اپ فیلکوش DNS.
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.dns} />

                    <h2 className={styles.panelTitle}>پرووایدرها ({toFarsiNumber(providers.length)})</h2>
                    <form onSubmit={addProvider} className={styles.formPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>نام *</span>
                                <input
                                    required
                                    value={providerForm.name}
                                    onChange={(e) => setProviderForm((f) => ({...f, name: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>slug *</span>
                                <input
                                    required
                                    dir="ltr"
                                    placeholder="shecan"
                                    value={providerForm.slug}
                                    onChange={(e) => setProviderForm((f) => ({...f, slug: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>DoH URL</span>
                                <input
                                    dir="ltr"
                                    placeholder="https://..."
                                    value={providerForm.url}
                                    onChange={(e) => setProviderForm((f) => ({...f, url: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>IP</span>
                                <input
                                    dir="ltr"
                                    placeholder="1.1.1.1"
                                    value={providerForm.ip}
                                    onChange={(e) => setProviderForm((f) => ({...f, ip: e.target.value}))}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                <span>توضیح</span>
                                <input
                                    value={providerForm.description}
                                    onChange={(e) => setProviderForm((f) => ({...f, description: e.target.value}))}
                                />
                            </label>
                        </div>
                        <div className={styles.checkRow}>
                            <label className={styles.checkField}>
                                <input
                                    type="checkbox"
                                    checked={providerForm.adsBlocking}
                                    onChange={(e) => setProviderForm((f) => ({...f, adsBlocking: e.target.checked}))}
                                />
                                <span>حذف تبلیغات</span>
                            </label>
                            <label className={styles.checkField}>
                                <input
                                    type="checkbox"
                                    checked={providerForm.malwareBlocking}
                                    onChange={(e) => setProviderForm((f) => ({...f, malwareBlocking: e.target.checked}))}
                                />
                                <span>بلاک بدافزار</span>
                            </label>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                افزودن پرووایدر
                            </button>
                        </div>
                    </form>

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام، slug یا توضیح…'},
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
                            {
                                key: 'feature',
                                type: 'select',
                                label: 'قابلیت',
                                allLabel: 'همه قابلیت‌ها',
                                options: [
                                    {value: 'ads', label: 'حذف تبلیغات'},
                                    {value: 'malware', label: 'بلاک بدافزار'},
                                ],
                            },
                        ]}
                        values={providerFilters}
                        onChange={changeProviderFilter}
                        onApply={() => providerPaging.resetPage()}
                        onReset={resetProviderFilters}
                        resultCount={filteredProviders.length}
                        resultLabel="پرووایدر"
                    />

                    {filteredProviders.length === 0 ? (
                        <TableEmptyState
                            icon={<LuGlobe size={32} />}
                            title={providerHasFilters ? 'پرووایدری یافت نشد' : 'هنوز پرووایدری ثبت نشده'}
                            description={providerHasFilters ? 'فیلترها را تغییر دهید.' : 'اولین موتور DNS را از فرم بالا اضافه کنید.'}
                            secondaryLabel={providerHasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={providerHasFilters ? resetProviderFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نام</th>
                                            <th>slug</th>
                                            <th>آدرس</th>
                                            <th>قابلیت</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {providerPaging.pageItems.map((p) => (
                                            <tr key={p._id}>
                                                <td data-label="نام" className={styles.cellPrimary}>
                                                    {p.name}
                                                    {p.description ? <div className={styles.cellMuted}>{p.description}</div> : null}
                                                </td>
                                                <td data-label="slug" className={styles.codeCell}>
                                                    {p.slug}
                                                </td>
                                                <td data-label="آدرس" className={styles.cellLtr}>
                                                    {p.endpoints?.[0]?.url || p.endpoints?.[0]?.ip || '—'}
                                                </td>
                                                <td data-label="قابلیت">
                                                    <div className={styles.tags}>
                                                        {p.adsBlocking ? <span className={styles.tag}>تبلیغات</span> : null}
                                                        {p.malwareBlocking ? <span className={styles.tag}>بدافزار</span> : null}
                                                        {!p.adsBlocking && !p.malwareBlocking ? '—' : null}
                                                    </div>
                                                </td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${p.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                        {p.isActive ? 'فعال' : 'غیرفعال'}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={p._id}
                                                        items={[
                                                            {
                                                                label: p.isActive ? 'غیرفعال کن' : 'فعال کن',
                                                                onClick: () => void toggleProvider(p),
                                                            },
                                                            {label: 'حذف', danger: true, onClick: () => void deleteProvider(p)},
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
                                    itemPerPage={providerPaging.itemPerPage}
                                    totalItems={providerPaging.totalItems}
                                    currentPage={providerPaging.currentPage}
                                    paginate={providerPaging.paginate}
                                    setRowsPerPage={providerPaging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}

                    <h2 className={styles.panelTitle} style={{marginTop: '2rem'}}>
                        پروفایل‌ها ({toFarsiNumber(profiles.length)})
                    </h2>
                    <form onSubmit={addProfile} className={styles.formPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>نام *</span>
                                <input
                                    required
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm((f) => ({...f, name: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>slug *</span>
                                <input
                                    required
                                    dir="ltr"
                                    value={profileForm.slug}
                                    onChange={(e) => setProfileForm((f) => ({...f, slug: e.target.value}))}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>پرووایدر</span>
                                <select
                                    value={profileForm.providerSlug}
                                    onChange={(e) => setProfileForm((f) => ({...f, providerSlug: e.target.value}))}
                                >
                                    <option value="">—</option>
                                    {providers.map((p) => (
                                        <option key={p._id} value={p.slug}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>آیکون</span>
                                <input value={profileForm.icon} onChange={(e) => setProfileForm((f) => ({...f, icon: e.target.value}))} />
                            </label>
                        </div>
                        <div className={styles.checkRow}>
                            {BLOCKLISTS.map((b) => (
                                <label key={b.key} className={styles.checkField}>
                                    <input
                                        type="checkbox"
                                        checked={!!profileForm.blocklists[b.key]}
                                        onChange={(e) =>
                                            setProfileForm((f) => ({
                                                ...f,
                                                blocklists: {...f.blocklists, [b.key]: e.target.checked},
                                            }))
                                        }
                                    />
                                    <span>{b.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                افزودن پروفایل
                            </button>
                        </div>
                    </form>

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام یا slug…'},
                            {
                                key: 'providerSlug',
                                type: 'select',
                                label: 'پرووایدر',
                                allLabel: 'همه پرووایدرها',
                                options: providers.map((p) => ({value: p.slug, label: p.name})),
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
                        values={profileFilters}
                        onChange={changeProfileFilter}
                        onApply={() => profilePaging.resetPage()}
                        onReset={resetProfileFilters}
                        resultCount={filteredProfiles.length}
                        resultLabel="پروفایل"
                    />

                    {filteredProfiles.length === 0 ? (
                        <TableEmptyState
                            icon={<LuShield size={32} />}
                            title={profileHasFilters ? 'پروفایلی یافت نشد' : 'هنوز پروفایلی ثبت نشده'}
                            description={profileHasFilters ? 'فیلترها را تغییر دهید.' : 'یک پروفایل بلاک‌لیست روی پرووایدر بسازید.'}
                            secondaryLabel={profileHasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={profileHasFilters ? resetProfileFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نام</th>
                                            <th>slug</th>
                                            <th>پرووایدر</th>
                                            <th>بلاک‌لیست</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {profilePaging.pageItems.map((p) => (
                                            <tr key={p._id}>
                                                <td data-label="نام" className={styles.cellPrimary}>
                                                    {p.icon} {p.name}
                                                    {p.description ? <div className={styles.cellMuted}>{p.description}</div> : null}
                                                </td>
                                                <td data-label="slug" className={styles.codeCell}>
                                                    {p.slug}
                                                </td>
                                                <td data-label="پرووایدر">{p.providerSlug || '—'}</td>
                                                <td data-label="بلاک‌لیست">
                                                    <div className={styles.tags}>
                                                        {Object.entries(p.blocklists || {})
                                                            .filter(([, v]) => v)
                                                            .map(([k]) => (
                                                                <span key={k} className={styles.tag}>
                                                                    {BLOCKLISTS.find((b) => b.key === k)?.label || k}
                                                                </span>
                                                            ))}
                                                    </div>
                                                </td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${p.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                        {p.isActive ? 'فعال' : 'غیرفعال'}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={p._id}
                                                        items={[
                                                            {
                                                                label: p.isActive ? 'غیرفعال کن' : 'فعال کن',
                                                                onClick: () => void toggleProfile(p),
                                                            },
                                                            {label: 'حذف', danger: true, onClick: () => void deleteProfile(p)},
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
                                    itemPerPage={profilePaging.itemPerPage}
                                    totalItems={profilePaging.totalItems}
                                    currentPage={profilePaging.currentPage}
                                    paginate={profilePaging.paginate}
                                    setRowsPerPage={profilePaging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
