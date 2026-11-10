'use client';

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {LuCheck, LuCircleAlert, LuDownload, LuLoader, LuNetwork, LuScrollText} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {Field, LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshInbound, FilkoshProvisionRun, FilkoshServer} from '../../lib/filkosh-api';
import {PROVISION_ACTION_LABEL, RUN_STATUS_LABEL, TIER_LABEL} from '../../lib/labels';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import FilterBar from '../../components/FilterBar';
import {useClientPaging} from '../../components/useClientPaging';
import {useLoadOnMount} from '../../components/useLoadOnMount';

const PROTOCOLS = [
    {value: 'vless-reality', label: 'VLESS + Reality (Xray)', family: 'xray'},
    {value: 'vless-ws-tls', label: 'VLESS + WS + TLS (Xray)', family: 'xray'},
    {value: 'vless-tcp', label: 'VLESS TCP (Xray)', family: 'xray'},
    {value: 'vmess-tcp', label: 'VMess TCP (Xray)', family: 'xray'},
    {value: 'vmess-ws', label: 'VMess WS (Xray)', family: 'xray'},
    {value: 'trojan', label: 'Trojan TLS (Xray)', family: 'xray'},
    {value: 'shadowsocks', label: 'Shadowsocks (Xray)', family: 'xray'},
    {value: 'shadowsocks2022', label: 'Shadowsocks 2022 (Xray)', family: 'xray'},
    {value: 'hysteria2', label: 'Hysteria2 (sing-box)', family: 'singbox'},
    {value: 'tuic', label: 'TUIC v5 (sing-box)', family: 'singbox'},
    {value: 'wireguard', label: 'WireGuard', family: 'wireguard'},
];

const EMPTY_INBOUND_FILTERS = {q: '', protocol: '', enabled: ''};
const EMPTY_RUN_FILTERS = {q: '', status: '', action: ''};

type InstallAction = 'install-xray' | 'install-singbox' | 'install-wireguard';
type EngineStatus = 'installed' | 'failed' | 'running' | 'idle';

const PROTOCOL_ENGINES: {
    key: string;
    action: InstallAction;
    runAction: string;
    uninstallProtocol: string;
    healthKeys: string[];
    title: string;
    hint: string;
    details: string[];
}[] = [
    {
        key: 'xray',
        action: 'install-xray',
        runAction: 'install_xray',
        uninstallProtocol: 'xray',
        healthKeys: ['xray'],
        title: 'Xray',
        hint: 'موتور اصلی VLESS، VMess، Trojan و Shadowsocks',
        details: [
            'پروتکل‌های Reality، WS+TLS و TCP',
            'نصب از اسکریپت رسمی XTLS روی سرور',
            'برای ساخت inboundهای Xray لازم است',
        ],
    },
    {
        key: 'singbox',
        action: 'install-singbox',
        runAction: 'install_singbox',
        uninstallProtocol: 'singbox',
        healthKeys: ['sing-box'],
        title: 'sing-box',
        hint: 'موتور Hysteria2 و TUIC برای لینک‌های مدرن',
        details: [
            'پروتکل‌های Hysteria2 و TUIC v5',
            'باینری sing-box به‌صورت سرویس systemd نصب می‌شود',
            'برای inboundهای خانواده sing-box لازم است',
        ],
    },
    {
        key: 'wireguard',
        action: 'install-wireguard',
        runAction: 'install_wireguard',
        uninstallProtocol: 'wireguard',
        healthKeys: ['wg-quick@wg0', 'wg-quick'],
        title: 'WireGuard',
        hint: 'تونل سبک کرنلی برای اتصال پایدار',
        details: [
            'نصب بسته wireguard و ابزارهای آن',
            'فوروارد IPv4 روی نود فعال می‌شود',
            'برای inbound از نوع WireGuard لازم است',
        ],
    },
];

function runTone(status: string) {
    if (status === 'success') return styles.badgeSuccess;
    if (status === 'failed') return styles.badgeDanger;
    return styles.badgeWarning;
}

function healthServices(health: Record<string, unknown> | null): Record<string, string> {
    const raw = health?.services;
    if (!raw || typeof raw !== 'object') return {};
    return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value || '')]),
    );
}

function latestHealthReport(
    runs: FilkoshProvisionRun[],
    live: Record<string, unknown> | null,
    stored?: Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (live?.services) return live;
    if (stored?.services) return stored;
    const lastHealth = runs.find((run) => run.action === 'health_check' && run.status === 'success' && run.result);
    return lastHealth?.result || null;
}

function resolveEngineStatus(
    engine: (typeof PROTOCOL_ENGINES)[number],
    runs: FilkoshProvisionRun[],
    health: Record<string, unknown> | null,
    busyAction: string | null,
): {status: EngineStatus; lastRun: FilkoshProvisionRun | null} {
    if (busyAction === engine.action) {
        const current = runs.find((run) => run.action === engine.runAction) || null;
        return {status: 'running', lastRun: current};
    }

    const related = runs.filter(
        (run) =>
            run.action === engine.runAction ||
            (run.action === 'uninstall' &&
                (run.protocol === engine.uninstallProtocol || run.protocol === engine.key || engine.healthKeys.includes(run.protocol))),
    );
    const lastRun = related[0] || null;
    const services = healthServices(health);
    const healthActive = engine.healthKeys.some((key) => services[key] === 'active');

    if (lastRun?.action === 'uninstall' && lastRun.status === 'success') {
        return {status: 'idle', lastRun};
    }
    if (lastRun?.action === engine.runAction && lastRun.status === 'running') {
        return {status: 'running', lastRun};
    }
    if (healthActive || (lastRun?.action === engine.runAction && lastRun.status === 'success')) {
        return {status: 'installed', lastRun};
    }
    if (lastRun?.action === engine.runAction && lastRun.status === 'failed') {
        return {status: 'failed', lastRun};
    }
    return {status: 'idle', lastRun};
}

function engineStatusMeta(status: EngineStatus) {
    if (status === 'installed') {
        return {
            label: 'نصب شده',
            button: 'نصب شده',
            badge: styles.badgeSuccess,
            iconClass: styles.installIconOk,
            Icon: LuCheck,
        };
    }
    if (status === 'failed') {
        return {
            label: 'اشکال در نصب',
            button: 'تلاش مجدد',
            badge: styles.badgeDanger,
            iconClass: styles.installIconFail,
            Icon: LuCircleAlert,
        };
    }
    if (status === 'running') {
        return {
            label: 'در حال نصب',
            button: 'در حال نصب…',
            badge: styles.badgeWarning,
            iconClass: styles.installIconRun,
            Icon: LuLoader,
        };
    }
    return {
        label: 'نصب نشده',
        button: 'نصب',
        badge: styles.badgeMuted,
        iconClass: styles.installIconIdle,
        Icon: LuDownload,
    };
}

function serverToForm(s: FilkoshServer) {
    return {
        name: s.name,
        host: s.host,
        sshPort: s.sshPort,
        sshUsername: s.sshUsername,
        sshPassword: s.sshPassword || '',
        country: s.country || '',
        countryCode: s.countryCode || '',
        city: s.city || '',
        flag: s.flag || '',
        description: s.description || '',
        capacity: s.capacity,
        tier: s.tier,
        appScope: s.appScope || 'vpn',
    };
}

export default function FilkoshServerDetailPage() {
    const {id} = useParams<{id: string}>();
    const [server, setServer] = useState<FilkoshServer | null>(null);
    const [inbounds, setInbounds] = useState<FilkoshInbound[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [health, setHealth] = useState<Record<string, unknown> | null>(null);
    const [runs, setRuns] = useState<FilkoshProvisionRun[]>([]);
    const [openRun, setOpenRun] = useState<FilkoshProvisionRun | null>(null);
    const [showInboundForm, setShowInboundForm] = useState(false);
    const [inboundForm, setInboundForm] = useState({
        name: '',
        protocol: 'vless-reality',
        port: 8443,
        sni: 'www.microsoft.com',
    });
    const [qr, setQr] = useState<{title: string; link: string; dataUrl: string} | null>(null);
    const [detailInbound, setDetailInbound] = useState<FilkoshInbound | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        host: '',
        sshPort: 22,
        sshUsername: 'root',
        sshPassword: '',
        country: '',
        countryCode: '',
        city: '',
        flag: '',
        description: '',
        capacity: 100,
        tier: 'free',
        appScope: 'vpn',
    });
    const formDirtyRef = useRef(false);
    const hasLoadedRef = useRef(false);
    const [inboundFilters, setInboundFilters] = useState(EMPTY_INBOUND_FILTERS);
    const [runFilters, setRunFilters] = useState(EMPTY_RUN_FILTERS);
    const [selectedOp, setSelectedOp] = useState('');

    const load = useCallback(async () => {
        try {
            if (!hasLoadedRef.current) setLoading(true);
            const [s, i, r] = await Promise.all([
                filkoshApi.getServer(id, true),
                filkoshApi.listInbounds(id),
                filkoshApi.listRuns(id, 100),
            ]);
            setServer(s);
            setInbounds(i);
            setRuns(r);
            if (!formDirtyRef.current) setEditForm(serverToForm(s));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            hasLoadedRef.current = true;
            setLoading(false);
        }
    }, [id]);

    useLoadOnMount(load);

    const filteredInbounds = useMemo(() => {
        const q = inboundFilters.q.trim().toLowerCase();
        return inbounds.filter((inb) => {
            if (inboundFilters.protocol && inb.protocol !== inboundFilters.protocol) return false;
            if (inboundFilters.enabled === 'on' && !inb.enabled) return false;
            if (inboundFilters.enabled === 'off' && inb.enabled) return false;
            if (!q) return true;
            return inb.name.toLowerCase().includes(q) || inb.protocol.toLowerCase().includes(q) || String(inb.port).includes(q);
        });
    }, [inbounds, inboundFilters]);

    const filteredRuns = useMemo(() => {
        const q = runFilters.q.trim().toLowerCase();
        return runs.filter((r) => {
            if (runFilters.status && r.status !== runFilters.status) return false;
            if (runFilters.action && r.action !== runFilters.action) return false;
            if (!q) return true;
            return (PROVISION_ACTION_LABEL[r.action] || r.action).toLowerCase().includes(q) || (r.protocol || '').toLowerCase().includes(q);
        });
    }, [runs, runFilters]);

    const inboundPaging = useClientPaging(filteredInbounds);
    const runPaging = useClientPaging(filteredRuns, 8);

    const changeInboundFilter = (key: string, value: string) => {
        setInboundFilters((prev) => ({...prev, [key]: value}));
        inboundPaging.resetPage();
    };
    const resetInboundFilters = () => {
        setInboundFilters(EMPTY_INBOUND_FILTERS);
        inboundPaging.resetPage();
    };
    const changeRunFilter = (key: string, value: string) => {
        setRunFilters((prev) => ({...prev, [key]: value}));
        runPaging.resetPage();
    };
    const resetRunFilters = () => {
        setRunFilters(EMPTY_RUN_FILTERS);
        runPaging.resetPage();
    };

    const handleTestSsh = async () => {
        try {
            setBusyAction('ssh');
            const result = await filkoshApi.testSsh(id);
            if (result.ok) {
                SuccessToaster({message: `اتصال SSH موفق — ${result.arch || ''}`});
            } else {
                ErrorToaster(new Error(result.error || 'اتصال ناموفق بود'));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyAction(null);
        }
    };

    const patchEditForm = (patch: Partial<typeof editForm>) => {
        formDirtyRef.current = true;
        setEditForm((f) => ({...f, ...patch}));
    };

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingEdit(true);
            const payload: Record<string, unknown> = {
                name: editForm.name,
                host: editForm.host,
                sshPort: Number(editForm.sshPort),
                sshUsername: editForm.sshUsername,
                country: editForm.country,
                countryCode: editForm.countryCode,
                city: editForm.city,
                flag: editForm.flag,
                description: editForm.description,
                capacity: Number(editForm.capacity),
                tier: editForm.tier,
                appScope: editForm.appScope,
            };
            if (editForm.sshPassword) payload.sshPassword = editForm.sshPassword;
            await filkoshApi.updateServer(id, payload);
            SuccessToaster({message: 'مشخصات سرور ذخیره شد'});
            formDirtyRef.current = false;
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSavingEdit(false);
        }
    };

    const runAction = async (
        action: 'prepare' | 'install-xray' | 'install-singbox' | 'install-wireguard' | 'sync' | 'health' | 'uninstall',
        engine?: string,
    ) => {
        const labels: Record<string, string> = {
            prepare: 'آماده‌سازی نود (apt/BBR/ufw) انجام شود؟',
            'install-xray': 'Xray نصب شود؟',
            'install-singbox': 'sing-box نصب شود؟',
            'install-wireguard': 'WireGuard نصب شود؟',
            sync: 'کانفیگ همه inboundهای فعال روی سرور اعمال شود؟',
            health: 'بررسی سلامت انجام شود؟',
            uninstall: `${engine} از سرور حذف شود؟`,
        };
        if (!confirm(labels[action])) return;
        try {
            setBusyAction(action);
            const result = await filkoshApi.provision(action, id, engine);
            SuccessToaster({message: 'انجام شد'});
            if (action === 'health') setHealth(result);
            if (action === 'uninstall' || action === 'sync') await load();
            setRuns(await filkoshApi.listRuns(id, 100));
        } catch (e) {
            ErrorToaster(e);
            try {
                setRuns(await filkoshApi.listRuns(id, 100));
            } catch {
                /* ignore refresh errors */
            }
        } finally {
            setBusyAction(null);
        }
    };

    const runSelectedOp = () => {
        if (!selectedOp || busyAction !== null) return;
        if (selectedOp === 'ssh') {
            void handleTestSsh();
            return;
        }
        if (selectedOp === 'prepare' || selectedOp === 'sync' || selectedOp === 'health') {
            void runAction(selectedOp);
        }
    };

    const addInbound = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await filkoshApi.createInbound({
                serverId: id,
                name: inboundForm.name || `${inboundForm.protocol}-${inboundForm.port}`,
                protocol: inboundForm.protocol,
                port: Number(inboundForm.port),
                sni: inboundForm.sni,
                serverNames: [inboundForm.sni],
            });
            SuccessToaster({message: 'Inbound ساخته شد — حالا «اعمال روی سرور» را بزنید'});
            setShowInboundForm(false);
            await load();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const toggleInbound = async (inbound: FilkoshInbound, enabled: boolean) => {
        try {
            await filkoshApi.updateInbound(inbound._id, {enabled});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deleteInbound = async (inbound: FilkoshInbound) => {
        if (!confirm(`حذف inbound «${inbound.name}» (پورت ${inbound.port})؟`)) return;
        try {
            await filkoshApi.deleteInbound(inbound._id);
            SuccessToaster({message: 'حذف شد — برای اعمال، «اعمال روی سرور» را بزنید'});
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const showQr = async (title: string, link: string) => {
        try {
            const dataUrl = await QRCode.toDataURL(link, {width: 320, margin: 1});
            setQr({title, link, dataUrl});
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const viewRunLog = async (run: FilkoshProvisionRun) => {
        try {
            setOpenRun(await filkoshApi.getRun(run._id));
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const firstClientLink = (inbound: FilkoshInbound): string | null => {
        const client = inbound.clients?.find((c) => !c.revoked);
        if (!client) return null;
        const host = server?.host || '';
        const settings = inbound.settings || {};
        const serverNames = Array.isArray(settings.serverNames) ? settings.serverNames.map(String) : [];
        const shortIds = Array.isArray(settings.shortIds) ? settings.shortIds.map(String) : [];
        const sni = String(settings.sni || serverNames[0] || host);
        const publicKey = String(settings.publicKey || '');
        switch (inbound.protocol) {
            case 'vless-reality':
                return `vless://${client.uuid}@${host}:${inbound.port}?type=tcp&security=reality&encryption=none&pbk=${publicKey}&fp=chrome&sni=${sni}&sid=${shortIds[0] || ''}&flow=xtls-rprx-vision#${encodeURIComponent(inbound.name)}`;
            case 'vless-ws-tls':
            case 'vless-ws':
            case 'vless-tcp':
                return `vless://${client.uuid}@${host}:${inbound.port}?type=${inbound.protocol.includes('ws') ? 'ws' : 'tcp'}#${encodeURIComponent(inbound.name)}`;
            case 'trojan':
                return `trojan://${client.password}@${host}:${inbound.port}?security=tls&sni=${sni}#${encodeURIComponent(inbound.name)}`;
            case 'shadowsocks':
            case 'shadowsocks2022':
                return `ss://${btoa(`${client.method || 'aes-256-gcm'}:${client.password}`)}@${host}:${inbound.port}#${encodeURIComponent(inbound.name)}`;
            case 'hysteria2':
                return `hy2://${client.password}@${host}:${inbound.port}?sni=${sni}#${encodeURIComponent(inbound.name)}`;
            case 'tuic':
                return `tuic://${client.uuid}:${client.password}@${host}:${inbound.port}?sni=${sni}#${encodeURIComponent(inbound.name)}`;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <ModuleGuide guide={FILKOSH_GUIDES.serverDetail} defaultExpanded={false} />
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    if (!server) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <TableEmptyState
                            icon={<LuNetwork size={32} />}
                            title="سرور پیدا نشد"
                            description="این نود حذف شده یا شناسه آن اشتباه است."
                            primaryLabel="بازگشت به لیست سرورها"
                            primaryHref="/servers"
                        />
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const inboundHasFilters = Object.values(inboundFilters).some(Boolean);
    const runHasFilters = Object.values(runFilters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>
                                {server.flag} {server.name}
                            </h1>
                            <p className={styles.subtitle}>
                                <span dir="ltr">
                                    {server.host}:{toFarsiNumber(server.sshPort)}
                                </span>{' '}
                                · {server.country || '—'} · {TIER_LABEL[server.tier] || server.tier}
                            </p>
                            {server.description ? (
                                <p className={styles.subtitle} style={{marginTop: '0.25rem'}}>{server.description}</p>
                            ) : null}
                        </div>
                        <Link href="/servers" className={styles.backLink}>
                            بازگشت به لیست
                        </Link>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.serverDetail} defaultExpanded={false} />

                    <section className={styles.panel}>
                        <h2 className={styles.panelTitle}>مشخصات سرور</h2>
                        <form onSubmit={saveEdit}>
                            <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
                                <label className={styles.field}>
                                    <span>نام سرور *</span>
                                    <input
                                        required
                                        minLength={2}
                                        value={editForm.name}
                                        onChange={(e) => patchEditForm({name: e.target.value})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>Host / IP *</span>
                                    <input
                                        required
                                        dir="ltr"
                                        value={editForm.host}
                                        onChange={(e) => patchEditForm({host: e.target.value})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>پورت SSH</span>
                                    <input
                                        type="number"
                                        min={1}
                                        dir="ltr"
                                        value={editForm.sshPort}
                                        onChange={(e) => patchEditForm({sshPort: Number(e.target.value)})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>کاربر SSH</span>
                                    <input
                                        dir="ltr"
                                        value={editForm.sshUsername}
                                        onChange={(e) => patchEditForm({sshUsername: e.target.value})}
                                    />
                                </label>
                                <div className={styles.field}>
                                    <span>رمز عبور SSH</span>
                                    <Field
                                        type="password"
                                        dir="ltr"
                                        useCopyIcon
                                        placeholder="(پسوردی ثبت نشده)"
                                        value={editForm.sshPassword}
                                        onChange={(v: string) => patchEditForm({sshPassword: v})}
                                    />
                                    <span className={styles.fieldHint}>
                                        با آیکون چشم رمز نمایش داده می‌شود و با آیکون کپی در کلیپ‌بورد قرار می‌گیرد.
                                    </span>
                                </div>
                                <label className={styles.field}>
                                    <span>کشور</span>
                                    <input
                                        value={editForm.country}
                                        onChange={(e) => patchEditForm({country: e.target.value})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>کد کشور</span>
                                    <input
                                        dir="ltr"
                                        maxLength={2}
                                        value={editForm.countryCode}
                                        onChange={(e) => patchEditForm({countryCode: e.target.value.toUpperCase()})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>شهر</span>
                                    <input value={editForm.city} onChange={(e) => patchEditForm({city: e.target.value})} />
                                </label>
                                <label className={styles.field}>
                                    <span>فلگ</span>
                                    <input value={editForm.flag} onChange={(e) => patchEditForm({flag: e.target.value})} />
                                </label>
                                <label className={styles.field}>
                                    <span>ظرفیت</span>
                                    <input
                                        type="number"
                                        min={1}
                                        dir="ltr"
                                        value={editForm.capacity}
                                        onChange={(e) => patchEditForm({capacity: Number(e.target.value)})}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span>سطح دسترسی</span>
                                    <select value={editForm.tier} onChange={(e) => patchEditForm({tier: e.target.value})}>
                                        <option value="free">رایگان</option>
                                        <option value="premium">پرمیوم</option>
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    <span>مربوط به اپ</span>
                                    <select
                                        value={editForm.appScope}
                                        onChange={(e) => patchEditForm({appScope: e.target.value})}
                                    >
                                        <option value="vpn">VPN</option>
                                        <option value="dns">DNS</option>
                                        <option value="both">هر دو</option>
                                        <option value="none">هیچ‌کدام (خارج از سیستم)</option>
                                    </select>
                                    <span className={styles.fieldHint}>
                                        سرورهای بدون مجوز یک بخش، در انتخابگر همان بخش (مثل ایجاد نود پراکسی) لود نمی‌شوند.
                                    </span>
                                </label>
                                <label className={`${styles.field} ${styles.full}`}>
                                    <span>توضیحات</span>
                                    <textarea
                                        rows={2}
                                        placeholder="مثلاً: برای کدام سرویس/مشتری خریداری شده، تاریخ خرید، مدت قرارداد…"
                                        value={editForm.description}
                                        onChange={(e) => patchEditForm({description: e.target.value})}
                                    />
                                    <span className={styles.fieldHint}>اختیاری — این سرور برای چه کاری یا برای چه کسی خریداری شده؟</span>
                                </label>
                            </div>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.primaryBtn} disabled={savingEdit}>
                                    {savingEdit ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className={styles.panel}>
                        <h2 className={styles.panelTitle}>نصب پروتکل</h2>
                        <p className={styles.panelLead}>
                            هر موتور را جدا نصب کنید. اگر نصب موفق باشد دکمه قفل می‌شود؛ اگر قبلاً تلاش شده و شکست خورده، وضعیت «اشکال در نصب» نشان داده می‌شود.
                        </p>
                        <div className={styles.installGrid}>
                            {PROTOCOL_ENGINES.map((engine) => {
                                const {status, lastRun} = resolveEngineStatus(
                                    engine,
                                    runs,
                                    latestHealthReport(runs, health, server.lastHealthReport),
                                    busyAction,
                                );
                                const meta = engineStatusMeta(status);
                                const StatusIcon = meta.Icon;
                                const cardClass = [
                                    styles.installCard,
                                    status === 'installed' ? styles.installCardOk : '',
                                    status === 'failed' ? styles.installCardFail : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ');
                                return (
                                    <article key={engine.key} className={cardClass}>
                                        <div className={styles.installCardHead}>
                                            <div className={styles.installTitleWrap}>
                                                <span className={`${styles.installIcon} ${meta.iconClass}`}>
                                                    <StatusIcon size={16} />
                                                </span>
                                                <div>
                                                    <h3 className={styles.installName}>{engine.title}</h3>
                                                    <p className={styles.installHint}>{engine.hint}</p>
                                                </div>
                                            </div>
                                            <span className={`${styles.badge} ${styles.installStatus} ${meta.badge}`}>{meta.label}</span>
                                        </div>
                                        <ul className={styles.installDetails}>
                                            {engine.details.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                        {lastRun ? (
                                            <div className={styles.installMeta}>
                                                آخرین عملیات:{' '}
                                                {new Date(lastRun.finishedAt || lastRun.createdAt).toLocaleString('fa-IR')}
                                            </div>
                                        ) : null}
                                        {status === 'failed' && lastRun?.error ? (
                                            <div className={styles.installError}>{lastRun.error}</div>
                                        ) : null}
                                        <div className={styles.installActions}>
                                            <button
                                                type="button"
                                                className={`${styles.actionBtn} ${status === 'installed' ? '' : styles.actionPrimary}`}
                                                disabled={status === 'installed' || busyAction !== null}
                                                onClick={() => runAction(engine.action)}
                                            >
                                                {meta.button}
                                            </button>
                                            {lastRun ? (
                                                <button
                                                    type="button"
                                                    className={styles.actionBtn}
                                                    onClick={() => void viewRunLog(lastRun)}
                                                >
                                                    مشاهده لاگ
                                                </button>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        {busyAction?.startsWith('install') ? (
                            <p className={styles.busyNote}>
                                در حال اجرای «{PROVISION_ACTION_LABEL[busyAction] || busyAction}» — ممکن است چند دقیقه طول بکشد…
                            </p>
                        ) : null}
                    </section>

                    <section className={styles.panel}>
                        <h2 className={styles.panelTitle}>عملیات سرور</h2>
                        <div className={styles.opRow}>
                            <select
                                className={styles.opSelect}
                                value={selectedOp}
                                disabled={busyAction !== null}
                                onChange={(e) => setSelectedOp(e.target.value)}
                            >
                                <option value="">انتخاب عملیات…</option>
                                <option value="prepare">آماده‌سازی نود</option>
                                <option value="sync">اعمال روی سرور</option>
                                <option value="health">بررسی سلامت</option>
                                <option value="ssh">تست SSH</option>
                            </select>
                            <button
                                type="button"
                                className={`${styles.primaryBtn} ${styles.opRunBtn}`}
                                disabled={!selectedOp || busyAction !== null}
                                onClick={runSelectedOp}
                            >
                                {busyAction && !busyAction.startsWith('install') ? 'در حال اجرا…' : 'اجرا'}
                            </button>
                        </div>
                        {busyAction && !busyAction.startsWith('install') ? (
                            <p className={styles.busyNote}>
                                در حال اجرای «{PROVISION_ACTION_LABEL[busyAction] || busyAction}» — ممکن است چند دقیقه طول بکشد…
                            </p>
                        ) : null}
                        {health ? <pre className={styles.preBox}>{JSON.stringify(health, null, 2)}</pre> : null}
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h2>پروتکل‌ها (Inbounds)</h2>
                            <button type="button" className={styles.primaryBtn} onClick={() => setShowInboundForm((v) => !v)}>
                                {showInboundForm ? 'بستن فرم' : 'پروتکل جدید'}
                            </button>
                        </div>

                        {showInboundForm ? (
                            <form onSubmit={addInbound} className={styles.formPanel} style={{marginTop: 0}}>
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>نام</span>
                                        <input
                                            placeholder="reality-8443"
                                            value={inboundForm.name}
                                            onChange={(e) => setInboundForm((f) => ({...f, name: e.target.value}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>پروتکل</span>
                                        <select
                                            value={inboundForm.protocol}
                                            onChange={(e) => setInboundForm((f) => ({...f, protocol: e.target.value}))}
                                        >
                                            {PROTOCOLS.map((p) => (
                                                <option key={p.value} value={p.value}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>پورت</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={65535}
                                            dir="ltr"
                                            value={inboundForm.port}
                                            onChange={(e) => setInboundForm((f) => ({...f, port: Number(e.target.value)}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>SNI (برای Reality/TLS)</span>
                                        <input
                                            dir="ltr"
                                            placeholder="www.microsoft.com"
                                            value={inboundForm.sni}
                                            onChange={(e) => setInboundForm((f) => ({...f, sni: e.target.value}))}
                                        />
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button type="submit" className={styles.primaryBtn}>
                                        ساخت Inbound
                                    </button>
                                </div>
                            </form>
                        ) : null}

                        <FilterBar
                            fields={[
                                {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام، پروتکل یا پورت…'},
                                {
                                    key: 'protocol',
                                    type: 'select',
                                    label: 'پروتکل',
                                    allLabel: 'همه پروتکل‌ها',
                                    options: PROTOCOLS.map((p) => ({value: p.value, label: p.label})),
                                },
                                {
                                    key: 'enabled',
                                    type: 'select',
                                    label: 'وضعیت',
                                    allLabel: 'همه',
                                    options: [
                                        {value: 'on', label: 'فعال'},
                                        {value: 'off', label: 'غیرفعال'},
                                    ],
                                },
                            ]}
                            values={inboundFilters}
                            onChange={changeInboundFilter}
                            onApply={() => inboundPaging.resetPage()}
                            onReset={resetInboundFilters}
                            resultCount={filteredInbounds.length}
                            resultLabel="پروتکل"
                        />

                        {filteredInbounds.length === 0 ? (
                            <TableEmptyState
                                icon={<LuNetwork size={32} />}
                                title={inboundHasFilters ? 'پروتکلی یافت نشد' : 'هنوز پروتکلی اضافه نشده'}
                                description={
                                    inboundHasFilters
                                        ? 'فیلترها را تغییر دهید.'
                                        : 'با دکمه «پروتکل جدید» یک inbound بسازید و بعد «اعمال روی سرور» را بزنید.'
                                }
                                secondaryLabel={inboundHasFilters ? 'پاک کردن فیلترها' : undefined}
                                onSecondaryClick={inboundHasFilters ? resetInboundFilters : undefined}
                            />
                        ) : (
                            <>
                                <TableTheme>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>نام</th>
                                                <th>پروتکل</th>
                                                <th>پورت</th>
                                                <th>کلاینت فعال</th>
                                                <th>وضعیت</th>
                                                <th>عملیات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inboundPaging.pageItems.map((inb) => {
                                                const link = firstClientLink(inb);
                                                const activeClients = inb.clients?.filter((c) => !c.revoked).length || 0;
                                                return (
                                                    <tr key={inb._id}>
                                                        <td data-label="نام" className={styles.cellPrimary}>
                                                            {inb.name}
                                                        </td>
                                                        <td data-label="پروتکل">{inb.protocol}</td>
                                                        <td data-label="پورت" className={styles.cellLtr}>
                                                            {toFarsiNumber(inb.port)}
                                                        </td>
                                                        <td data-label="کلاینت فعال">{toFarsiNumber(activeClients)}</td>
                                                        <td data-label="وضعیت">
                                                            <span className={`${styles.badge} ${inb.enabled ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                                {inb.enabled ? 'فعال' : 'غیرفعال'}
                                                            </span>
                                                        </td>
                                                        <td data-label="عملیات">
                                                            <HrRowActionMenu
                                                                rowId={inb._id}
                                                                items={[
                                                                    ...(link
                                                                        ? [
                                                                              {label: 'QR', onClick: () => void showQr(inb.name, link)},
                                                                              {
                                                                                  label: 'کپی لینک',
                                                                                  onClick: () => {
                                                                                      navigator.clipboard.writeText(link);
                                                                                      SuccessToaster({message: 'لینک کپی شد'});
                                                                                  },
                                                                              },
                                                                          ]
                                                                        : []),
                                                                    {label: 'جزئیات', onClick: () => setDetailInbound(inb)},
                                                                    {
                                                                        label: inb.enabled ? 'غیرفعال کن' : 'فعال کن',
                                                                        onClick: () => void toggleInbound(inb, !inb.enabled),
                                                                    },
                                                                    {label: 'حذف', danger: true, onClick: () => void deleteInbound(inb)},
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
                                        itemPerPage={inboundPaging.itemPerPage}
                                        totalItems={inboundPaging.totalItems}
                                        currentPage={inboundPaging.currentPage}
                                        paginate={inboundPaging.paginate}
                                        setRowsPerPage={inboundPaging.setRowsPerPage}
                                    />
                                </div>
                            </>
                        )}
                    </section>

                    <section className={`${styles.panel} ${styles.panelCompact}`}>
                        <h2 className={styles.panelTitle}>آخرین عملیات (Runs)</h2>
                        <FilterBar
                            compact
                            fields={[
                                {key: 'q', type: 'search', label: 'جستجو', placeholder: 'عملیات یا پروتکل…'},
                                {
                                    key: 'status',
                                    type: 'select',
                                    label: 'وضعیت',
                                    allLabel: 'همه وضعیت‌ها',
                                    options: Object.entries(RUN_STATUS_LABEL).map(([value, label]) => ({value, label})),
                                },
                                {
                                    key: 'action',
                                    type: 'select',
                                    label: 'نوع عملیات',
                                    allLabel: 'همه عملیات',
                                    options: Array.from(new Set(runs.map((r) => r.action))).map((value) => ({
                                        value,
                                        label: PROVISION_ACTION_LABEL[value] || value,
                                    })),
                                },
                            ]}
                            values={runFilters}
                            onChange={changeRunFilter}
                            onReset={resetRunFilters}
                            resultCount={filteredRuns.length}
                            resultLabel="عملیات"
                        />

                        {filteredRuns.length === 0 ? (
                            <TableEmptyState
                                icon={<LuScrollText size={32} />}
                                title={runHasFilters ? 'عملیاتی یافت نشد' : 'هنوز عملیاتی اجرا نشده'}
                                description="بعد از نصب یا همگام‌سازی، تاریخچه اینجا می‌آید."
                                secondaryLabel={runHasFilters ? 'پاک کردن فیلترها' : undefined}
                                onSecondaryClick={runHasFilters ? resetRunFilters : undefined}
                            />
                        ) : (
                            <>
                                <TableTheme>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>وضعیت</th>
                                                <th>عملیات</th>
                                                <th>زمان</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {runPaging.pageItems.map((r) => (
                                                <tr key={r._id}>
                                                    <td data-label="وضعیت">
                                                        <span className={`${styles.badge} ${runTone(r.status)}`}>
                                                            {RUN_STATUS_LABEL[r.status] || r.status}
                                                        </span>
                                                    </td>
                                                    <td data-label="عملیات" className={styles.cellPrimary}>
                                                        {PROVISION_ACTION_LABEL[r.action] || r.action}
                                                        {r.protocol ? <div className={styles.cellMuted}>{r.protocol}</div> : null}
                                                    </td>
                                                    <td data-label="زمان">{new Date(r.createdAt).toLocaleString('fa-IR')}</td>
                                                    <td data-label="لاگ">
                                                        <button
                                                            type="button"
                                                            className={styles.textBtn}
                                                            onClick={() => void viewRunLog(r)}
                                                        >
                                                            لاگ
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableTheme>
                                <div className={`${styles.paginationSpace} ${styles.paginationSpaceCompact}`}>
                                    <Pagination
                                        rtl
                                        itemPerPage={runPaging.itemPerPage}
                                        totalItems={runPaging.totalItems}
                                        currentPage={runPaging.currentPage}
                                        paginate={runPaging.paginate}
                                        setRowsPerPage={runPaging.setRowsPerPage}
                                    />
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </Wrapper>

            {qr ? (
                <div className={styles.modalOverlay} onClick={() => setQr(null)}>
                    <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()} style={{alignItems: 'center'}}>
                        <h3 className={styles.modalTitle}>{qr.title}</h3>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr.dataUrl} alt="QR" width={280} height={280} className={styles.qrImage} />
                        <p className={styles.qrLink}>{qr.link}</p>
                        <button type="button" className={styles.primaryBtn} onClick={() => setQr(null)}>
                            بستن
                        </button>
                    </div>
                </div>
            ) : null}

            {openRun ? (
                <div className={styles.modalOverlay} onClick={() => setOpenRun(null)}>
                    <div className={`${styles.modalPanel} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>لاگ اجرا</h3>
                        <pre className={styles.preBox}>
                            {(openRun.logs || []).map((l) => `${l.stream === 'stderr' ? '⨯' : '›'} ${l.line}`).join('\n') ||
                                openRun.error ||
                                '(بدون خروجی)'}
                        </pre>
                        <button type="button" className={styles.primaryBtn} onClick={() => setOpenRun(null)}>
                            بستن
                        </button>
                    </div>
                </div>
            ) : null}

            {detailInbound ? (
                <div className={styles.modalOverlay} onClick={() => setDetailInbound(null)}>
                    <div className={`${styles.modalPanel} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>جزئیات {detailInbound.name}</h3>
                        <pre className={styles.preBox}>{JSON.stringify(detailInbound.settings, null, 2)}</pre>
                        <button type="button" className={styles.primaryBtn} onClick={() => setDetailInbound(null)}>
                            بستن
                        </button>
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
