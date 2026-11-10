'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LuCheck, LuX} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState} from '@my-workspace/components';
import {filkoshApi, FilkoshMtProxyNode, FilkoshMtProxyPool, FilkoshServer} from '../../lib/filkosh-api';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import {useLoadOnMount} from '../../components/useLoadOnMount';
import MtProxyProvisionMonitor from '../../components/MtProxyProvisionMonitor';

const STEPS = ['انتخاب سرور', 'تنظیمات نصب', 'نصب و راه‌اندازی'] as const;

export default function FilkoshAddMtProxyNodePage() {
    const router = useRouter();
    const [pools, setPools] = useState<FilkoshMtProxyPool[]>([]);
    const [servers, setServers] = useState<FilkoshServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [source, setSource] = useState<'server' | 'manual'>('server');
    const [createdNode, setCreatedNode] = useState<FilkoshMtProxyNode | null>(null);
    const [finalNode, setFinalNode] = useState<FilkoshMtProxyNode | null>(null);
    const [installState, setInstallState] = useState<string>('');
    const [runKey, setRunKey] = useState(0);
    const [form, setForm] = useState({
        poolId: '',
        serverId: '',
        name: '',
        host: '',
        sshPort: 22,
        sshUsername: 'root',
        sshPassword: '',
        country: '',
        countryCode: '',
        port: 443,
        fakeTlsDomain: '',
        installMethod: '',
        secret: '',
        note: '',
        provisionNow: true,
    });

    const set = (key: string, value: unknown) => setForm((f) => ({...f, [key]: value}));

    const load = useCallback(async () => {
        try {
            setLoading(true);
            // فقط سرورهای مجاز در بخش VPN (appScope = vpn یا both) — سرورهای بدون مجوز لود نمی‌شوند
            const [p, s] = await Promise.all([filkoshApi.listMtProxyPools(), filkoshApi.listServers({inScope: 'vpn'})]);
            setPools(p);
            setServers(s);
            if (p.length) {
                setForm((f) => ({
                    ...f,
                    poolId: f.poolId || p[0]._id,
                    port: f.port || p[0].defaultPort || 443,
                    fakeTlsDomain: p[0].fakeTlsDomain || '',
                    installMethod: p[0].installMethod || 'source',
                }));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const selectedPool = pools.find((p) => p._id === form.poolId);

    const onPoolChange = (poolId: string) => {
        const pool = pools.find((p) => p._id === poolId);
        setForm((f) => ({
            ...f,
            poolId,
            port: pool?.defaultPort || f.port,
            fakeTlsDomain: pool?.fakeTlsDomain ?? f.fakeTlsDomain,
            installMethod: pool?.installMethod || f.installMethod,
        }));
    };

    const onServerChange = (serverId: string) => {
        const server = servers.find((s) => s._id === serverId);
        setForm((f) => ({
            ...f,
            serverId,
            name: server?.name || f.name,
            host: server?.host || f.host,
            country: server?.country || f.country,
            countryCode: server?.countryCode || f.countryCode,
        }));
    };

    // اعتبارسنجی مرحله ۱ — انتخاب سرور ثبت‌شده یا ورود دستی کامل
    const step1Valid = source === 'server' ? !!form.serverId : !!form.name.trim() && !!form.host.trim() && !!form.sshPassword.trim();
    const step2Valid = !!form.poolId && form.port > 0;

    const submit = async () => {
        try {
            setSaving(true);
            const body: Record<string, unknown> = {
                poolId: form.poolId,
                port: form.port,
                provisionNow: form.provisionNow,
            };
            if (source === 'server') {
                body.serverId = form.serverId;
                if (form.name) body.name = form.name;
            } else {
                body.name = form.name;
                body.host = form.host;
                body.sshPort = form.sshPort;
                body.sshUsername = form.sshUsername;
                body.sshPassword = form.sshPassword;
                body.country = form.country;
                body.countryCode = form.countryCode;
            }
            if (form.fakeTlsDomain !== selectedPool?.fakeTlsDomain) body.fakeTlsDomain = form.fakeTlsDomain;
            if (form.installMethod && form.installMethod !== selectedPool?.installMethod) body.installMethod = form.installMethod;
            if (form.secret.trim()) body.secret = form.secret.trim();
            if (form.note) body.note = form.note;

            const node = await filkoshApi.createMtProxyNode(body);
            setCreatedNode(node);
            setStep(2);
            if (!form.provisionNow) {
                SuccessToaster({message: 'نود ثبت شد — بعداً از صفحه نود نصبش کنید'});
                router.push(`/mtproxy/${node._id}`);
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    const onInstallFinished = useCallback(async (state: string) => {
        setInstallState(state);
        if (state === 'ok' && createdNode) {
            try {
                const fresh = await filkoshApi.getMtProxyNode(createdNode._id);
                setFinalNode(fresh);
                SuccessToaster({message: 'نصب کامل شد — پروکسی آماده است'});
            } catch {
                // نمایش لینک حیاتی نیست
            }
        }
    }, [createdNode]);

    const retryInstall = async () => {
        if (!createdNode) return;
        try {
            setInstallState('');
            setFinalNode(null);
            await filkoshApi.provisionMtProxyNode(createdNode._id);
            setRunKey((k) => k + 1);
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const finalLinks = useMemo(() => {
        const n = finalNode;
        if (!n?.clientSecret) return null;
        return {
            tg: `tg://proxy?server=${n.host}&port=${n.port}&secret=${n.clientSecret}`,
            https: `https://t.me/proxy?server=${n.host}&port=${n.port}&secret=${n.clientSecret}`,
        };
    }, [finalNode]);

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            SuccessToaster({message: `${label} کپی شد`});
        } catch {
            ErrorToaster(new Error('کپی ناموفق بود — دستی انتخاب و کپی کنید'));
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>افزودن نود پروکسی</h1>
                                <p className={styles.subtitle}>ثبت سرور جدید در استخر پروکسی تلگرام.</p>
                            </div>
                        </header>
                        <ModuleGuide guide={FILKOSH_GUIDES.mtproxy} defaultExpanded={false} />
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    if (!pools.length) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>افزودن نود پروکسی</h1>
                                <p className={styles.subtitle}>اول باید یک استخر بسازید — نود همیشه داخل یک استخر تعریف می‌شود.</p>
                            </div>
                            <Link href="/mtproxy/pools" className={styles.primaryBtn}>
                                ساخت استخر
                            </Link>
                        </header>
                        <ModuleGuide guide={FILKOSH_GUIDES.mtproxyPools} defaultExpanded={false} />
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
                            <h1 className={styles.mainTitle}>افزودن نود پروکسی</h1>
                            <p className={styles.subtitle}>
                                در سه مرحله: انتخاب سرور، تنظیمات نصب و نصب زنده با امکان توقف.
                            </p>
                        </div>
                        <Link href="/mtproxy" className={styles.backLink}>
                            بازگشت به لیست
                        </Link>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxy} defaultExpanded={false} />

                    {/* نوار مراحل ویزارد */}
                    <div className={styles.wizardBar}>
                        {STEPS.map((label, i) => (
                            <React.Fragment key={label}>
                                {i > 0 ? <span className={styles.wizardArrow}>←</span> : null}
                                <span
                                    className={`${styles.wizardStep} ${i === step ? styles.wizardStepActive : ''} ${
                                        i < step ? styles.wizardStepDone : ''
                                    }`}
                                >
                                    <span className={styles.wizardStepNum}>
                                        {i < step ? <LuCheck size={12} /> : toFarsiNumber(i + 1)}
                                    </span>
                                    {label}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* مرحله ۱ — انتخاب سرور */}
                    {step === 0 ? (
                        <div className={styles.formPanel}>
                            <div className={styles.sectionHead}>
                                <h2>۱. انتخاب سرور</h2>
                            </div>
                            <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
                                <label className={styles.field}>
                                    <span>استخر *</span>
                                    <select required value={form.poolId} onChange={(e) => onPoolChange(e.target.value)}>
                                        {pools.map((p) => (
                                            <option key={p._id} value={p._id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    <span>منبع سرور</span>
                                    <select value={source} onChange={(e) => setSource(e.target.value as 'server' | 'manual')}>
                                        <option value="server">از سرورهای ثبت‌شده</option>
                                        <option value="manual">ورود دستی SSH</option>
                                    </select>
                                </label>

                                {source === 'server' ? (
                                    <label className={`${styles.field} ${styles.full}`}>
                                        <span>سرور *</span>
                                        <select required value={form.serverId} onChange={(e) => onServerChange(e.target.value)}>
                                            <option value="">— انتخاب کنید —</option>
                                            {servers.map((s) => (
                                                <option key={s._id} value={s._id}>
                                                    {s.name} — {s.host}
                                                </option>
                                            ))}
                                        </select>
                                        <span className={styles.fieldHint}>
                                            فقط سرورهای دارای مجوز بخش VPN نمایش داده می‌شوند. رمز SSH از رکورد سرور خوانده می‌شود؛
                                            سرور در بخش سرورها سر جایش می‌ماند.
                                        </span>
                                        {!servers.length ? (
                                            <span className={styles.fieldHint} style={{color: '#b91c1c'}}>
                                                هیچ سروری با مجوز VPN وجود ندارد — از بخش سرورها مجوز استفاده در VPN را فعال کنید یا
                                                سرور جدیدی اضافه کنید.
                                            </span>
                                        ) : null}
                                    </label>
                                ) : null}

                                {source === 'manual' ? (
                                    <>
                                        <label className={styles.field}>
                                            <span>نام *</span>
                                            <input
                                                required
                                                minLength={2}
                                                placeholder="مثلاً proxy-de-01"
                                                value={form.name}
                                                onChange={(e) => set('name', e.target.value)}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>Host / IP *</span>
                                            <input
                                                required
                                                dir="ltr"
                                                placeholder="45.xxx.xxx.xxx"
                                                value={form.host}
                                                onChange={(e) => set('host', e.target.value)}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>پورت SSH</span>
                                            <input
                                                type="number"
                                                min={1}
                                                dir="ltr"
                                                value={form.sshPort}
                                                onChange={(e) => set('sshPort', Number(e.target.value))}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>کاربر SSH</span>
                                            <input
                                                dir="ltr"
                                                value={form.sshUsername}
                                                onChange={(e) => set('sshUsername', e.target.value)}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>رمز عبور SSH *</span>
                                            <input
                                                required
                                                type="password"
                                                dir="ltr"
                                                value={form.sshPassword}
                                                onChange={(e) => set('sshPassword', e.target.value)}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>کشور</span>
                                            <input
                                                placeholder="Germany"
                                                value={form.country}
                                                onChange={(e) => set('country', e.target.value)}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>کد کشور (۲ حرف)</span>
                                            <input
                                                dir="ltr"
                                                maxLength={2}
                                                placeholder="DE"
                                                value={form.countryCode}
                                                onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <label className={styles.field}>
                                        <span>نام (اختیاری)</span>
                                        <input value={form.name} onChange={(e) => set('name', e.target.value)} />
                                    </label>
                                )}
                            </div>
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    disabled={!step1Valid}
                                    onClick={() => setStep(1)}
                                >
                                    مرحله بعد: تنظیمات نصب
                                </button>
                                <Link href="/mtproxy" className={styles.secondaryBtn}>
                                    انصراف
                                </Link>
                            </div>
                        </div>
                    ) : null}

                    {/* مرحله ۲ — تنظیمات نصب */}
                    {step === 1 ? (
                        <div className={styles.formPanel}>
                            <div className={styles.sectionHead}>
                                <h2>۲. تنظیمات نصب</h2>
                            </div>
                            <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
                                <label className={styles.field}>
                                    <span>پورت پروکسی</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={65535}
                                        dir="ltr"
                                        value={form.port}
                                        onChange={(e) => set('port', Number(e.target.value))}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>روش نصب</span>
                                    <select value={form.installMethod} onChange={(e) => set('installMethod', e.target.value)}>
                                        <option value="source">systemd (بیلد سورس MTProxy)</option>
                                        <option value="docker">docker (ایمیج رسمی)</option>
                                    </select>
                                    <span className={styles.fieldHint}>
                                        docker سریع‌تر نصب می‌شود؛ systemd سبک‌تر روی سرورهای کم‌رم اجرا می‌شود.
                                    </span>
                                </label>
                                <label className={styles.field}>
                                    <span>دامنه FakeTLS</span>
                                    <input
                                        dir="ltr"
                                        placeholder={selectedPool?.fakeTlsDomain || 'www.cloudflare.com'}
                                        value={form.fakeTlsDomain}
                                        onChange={(e) => set('fakeTlsDomain', e.target.value)}
                                    />
                                    <span className={styles.fieldHint}>خالی = بدون FakeTLS (راز ساده)</span>
                                </label>
                                <label className={styles.field}>
                                    <span>راز اختصاصی (اختیاری)</span>
                                    <input
                                        dir="ltr"
                                        placeholder="خالی = راز مشترک استخر"
                                        value={form.secret}
                                        onChange={(e) => set('secret', e.target.value)}
                                    />
                                    <span className={styles.fieldHint}>
                                        ۳۲ کاراکتر hex — با راز مشترک، لینک کاربرها با تعویض سرور ثابت می‌ماند.
                                    </span>
                                </label>
                                <label className={`${styles.field} ${styles.full}`}>
                                    <span>یادداشت</span>
                                    <input value={form.note} onChange={(e) => set('note', e.target.value)} />
                                </label>
                            </div>

                            <div className={styles.checkRow}>
                                <label className={styles.checkField}>
                                    <input
                                        type="checkbox"
                                        checked={form.provisionNow}
                                        onChange={(e) => set('provisionNow', e.target.checked)}
                                    />
                                    <span>بعد از ثبت، نصب در همین ویزارد شروع و دنبال شود</span>
                                </label>
                            </div>

                            <p className={styles.fieldHint}>
                                نصب شامل دریافت پیش‌نیازها، بیلد/دانلود MTProxy، ساخت سرویس و باز کردن پورت است — پیشرفت
                                مرحله‌به‌مرحله نمایش داده می‌شود و هر لحظه قابل توقف است.
                            </p>
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    disabled={!step2Valid || saving}
                                    onClick={submit}
                                >
                                    {saving ? 'در حال ثبت…' : 'ثبت و شروع نصب'}
                                </button>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setStep(0)}>
                                    بازگشت
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* مرحله ۳ — نصب زنده */}
                    {step === 2 && createdNode ? (
                        <div className={styles.formPanel}>
                            <div className={styles.sectionHead}>
                                <h2>۳. نصب و راه‌اندازی — {createdNode.name}</h2>
                            </div>

                            <MtProxyProvisionMonitor key={runKey} nodeId={createdNode._id} onFinished={onInstallFinished} />

                            {installState === 'failed' || installState === 'cancelled' ? (
                                <div className={styles.formActions}>
                                    <button type="button" className={styles.primaryBtn} onClick={retryInstall}>
                                        تلاش مجدد نصب
                                    </button>
                                    <Link href={`/mtproxy/${createdNode._id}`} className={styles.secondaryBtn}>
                                        صفحه نود
                                    </Link>
                                </div>
                            ) : null}

                            {installState === 'ok' && finalLinks ? (
                                <div className={styles.wizardDoneLinks}>
                                    <div className={styles.opRow}>
                                        <button
                                            type="button"
                                            className={`${styles.actionBtn} ${styles.actionPrimary}`}
                                            onClick={() => copy(finalLinks.tg, 'لینک tg://')}
                                        >
                                            کپی tg://
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() => copy(finalLinks.https, 'لینک t.me')}
                                        >
                                            کپی https://t.me
                                        </button>
                                        <a className={styles.secondaryBtn} href={finalLinks.tg}>
                                            بازکردن در تلگرام
                                        </a>
                                    </div>
                                    <div className={styles.preBox}>{finalLinks.https}</div>
                                </div>
                            ) : null}

                            {installState === 'ok' ? (
                                <div className={styles.formActions}>
                                    <Link href={`/mtproxy/${createdNode._id}`} className={styles.primaryBtn}>
                                        <LuCheck size={14} />
                                        مشاهده نود
                                    </Link>
                                    <Link href="/mtproxy" className={styles.secondaryBtn}>
                                        لیست نودها
                                    </Link>
                                </div>
                            ) : installState === '' ? (
                                <p className={styles.fieldHint}>
                                    می‌توانید همین صفحه را باز نگه دارید؛ نصب پس‌زمینه ادامه دارد و با بستن صفحه هم قطع نمی‌شود —
                                    فقط کافی است بعداً از صفحه نود پیشرفت را ببینید.
                                </p>
                            ) : (
                                <div className={styles.formActions}>
                                    <Link href="/mtproxy" className={styles.secondaryBtn}>
                                        <LuX size={14} />
                                        بستن
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </Wrapper>
        </Container>
    );
}
