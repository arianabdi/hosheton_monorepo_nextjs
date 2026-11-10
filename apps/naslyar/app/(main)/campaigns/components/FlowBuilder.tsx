'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    LuPlus,
    LuSave,
    LuZap,
} from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { createFlow, getFlow, updateFlow } from '../campaigns-api';
import {
    CAMPAIGN_NODE_TYPE_LABELS,
    CAMPAIGN_TRIGGER_TYPE_LABELS,
    NODE_DEFAULT_CONFIG,
    NODE_PALETTE,
    createNodeId,
    type CampaignFlowForm,
    type CampaignNodeType,
    type FlowNode,
} from '../campaigns.types';
import NodeCard, { NodeConfigForm } from './NodeCard';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from '../Campaigns.module.scss';

interface FlowBuilderProps {
    flowId?: string;
}

/**
 * فلو-بیلدر کمپین — پالت اکشن‌ها (سمت راست) + کانواس درختی با شاخه YES/NO
 * مشابه تجربه Klaviyo Flows. ساختار فلو درخت تک‌ریشه است.
 */
export default function FlowBuilder({ flowId }: FlowBuilderProps) {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(Boolean(flowId));
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'draft' | 'live' | 'paused' | 'archived'>('draft');
    const [triggerType, setTriggerType] = useState<'manual' | 'event'>('manual');
    const [triggerEvent, setTriggerEvent] = useState('');
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [entryNodeId, setEntryNodeId] = useState('');

    const [menuFor, setMenuFor] = useState<string | null>(null);
    const [configFor, setConfigFor] = useState<FlowNode | null>(null);
    /** منوی افزودن نود — مشخص می‌کند از کدام نود و کدام شاخه باز شده است */
    const [addMenuFor, setAddMenuFor] = useState<{ parentId: string; slot: 'default' | 'yes' | 'no' } | null>(null);

    const load = useCallback(async () => {
        if (!token || !flowId) return;
        try {
            setLoading(true);
            const flow = await getFlow(baseUrl, token, flowId);
            setName(flow.name);
            setDescription(flow.description || '');
            setStatus(flow.status);
            setTriggerType(flow.triggerType);
            setTriggerEvent(flow.triggerEvent || '');
            setNodes(flow.nodes || []);
            setEntryNodeId(flow.entryNodeId || (flow.nodes?.[0]?.id ?? ''));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, flowId]);

    useEffect(() => {
        void load();
    }, [load]);

    const buildPayload = useCallback(
        (): CampaignFlowForm => ({
            name: name.trim(),
            description: description.trim(),
            status,
            triggerType,
            triggerEvent: triggerType === 'event' ? triggerEvent.trim() : '',
            entryNodeId,
            nodes,
        }),
        [name, description, status, triggerType, triggerEvent, entryNodeId, nodes],
    );

    const handleSave = async (nextStatus?: 'draft' | 'live' | 'paused' | 'archived') => {
        if (!token) return;
        if (!name.trim()) {
            ErrorToaster({ message: 'نام کمپین را وارد کنید' });
            return;
        }
        const effectiveStatus = nextStatus ?? status;
        if (effectiveStatus === 'live' && !entryNodeId) {
            ErrorToaster({ message: 'برای انتشار، ابتدا یک نود شروع به فلو اضافه کنید' });
            return;
        }
        try {
            setSaving(true);
            const payload = { ...buildPayload(), status: effectiveStatus };
            if (flowId) {
                await updateFlow(baseUrl, token, flowId, payload);
                SuccessToaster({ message: 'کمپین ذخیره شد' });
            } else {
                const created = await createFlow(baseUrl, token, payload);
                SuccessToaster({ message: 'کمپین ایجاد شد' });
                const newId = (created as { _id?: string })?._id;
                if (newId) {
                    router.push(`/campaigns/${newId}/edit`);
                    return;
                }
            }
            setStatus(effectiveStatus);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    // ─── عملیات نودها ───

    const createNode = (type: CampaignNodeType): FlowNode => ({
        id: createNodeId(),
        type,
        title: CAMPAIGN_NODE_TYPE_LABELS[type],
        config: { ...NODE_DEFAULT_CONFIG[type] },
        isEnabled: true,
        next: { default: '', yes: '', no: '' },
    });

    /** افزودن نود پس از نود داده‌شده (یا شروع فلو در صورت نبود نود) */
    const addNodeAfter = (parentNodeId: string | null, slot: 'default' | 'yes' | 'no', type: CampaignNodeType) => {
        const node = createNode(type);
        if (!parentNodeId) {
            setNodes((prev) => [node, ...prev]);
            setEntryNodeId(node.id);
        } else {
            setNodes((prev) =>
                prev
                    .map((n) => {
                        if (n.id === parentNodeId) {
                            return { ...n, next: { ...n.next, [slot]: node.id } };
                        }
                        return n;
                    })
                    .concat(node),
            );
        }
        setAddMenuFor(null);
    };

    const removeNode = (nodeId: string) => {
        setNodes((prev) => {
            const removed = prev.find((n) => n.id === nodeId);
            const rest = prev.filter((n) => n.id !== nodeId);
            // بازاتصال فرزندان حذف‌شده به والد آن
            return rest.map((n) => {
                const next = { ...n.next };
                if (next.default === nodeId) next.default = removed?.next?.default || '';
                if (next.yes === nodeId) next.yes = removed?.next?.yes || '';
                if (next.no === nodeId) next.no = removed?.next?.no || '';
                return { ...n, next };
            });
        });
        if (entryNodeId === nodeId) {
            setEntryNodeId('');
        }
    };

    const patchNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, config } : n)));
    };

    const toggleNodeEnabled = (nodeId: string) => {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, isEnabled: !n.isEnabled } : n)));
    };

    const setNodeTitle = (nodeId: string, title: string) => {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, title } : n)));
    };

    // ─── رندر درخت ───

    const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

    /** بازگشت nodeId شاخه — یا null اگر شاخه خالی است (نقطه +) */
    const branchTarget = (parent: FlowNode, slot: 'default' | 'yes' | 'no'): string | null => {
        const target = parent.next?.[slot] || '';
        return target && nodesById.has(target) ? target : null;
    };

    const renderBranch = (parent: FlowNode, slot: 'default' | 'yes' | 'no', label?: 'YES' | 'NO') => {
        const targetId = branchTarget(parent, slot);
        const menuOpen = addMenuFor?.parentId === parent.id && addMenuFor?.slot === slot;

        return (
            <div key={slot} className={styles.splitColumn}>
                {label && <span className={`${styles.splitLabel} ${label === 'YES' ? styles.yes : styles.no}`}>{label}</span>}
                <div className={styles.connector} />
                {targetId ? (
                    renderChain(targetId)
                ) : (
                    <div className={styles.addRow}>
                        <button
                            type="button"
                            className={styles.addBtn}
                            aria-label="افزودن نود"
                            onClick={() => {
                                setAddMenuFor(menuOpen ? null : { parentId: parent.id, slot });
                            }}
                        >
                            <LuPlus />
                        </button>
                        {menuOpen && (
                            <div className={styles.addMenu} onClick={(e) => e.stopPropagation()}>
                                {NODE_PALETTE.map((group) => (
                                    <div key={group.group}>
                                        <div className={styles.addMenuGroup}>{group.group}</div>
                                        {group.items.map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={styles.addMenuItem}
                                                onClick={() => addNodeAfter(parent.id, slot, type)}
                                            >
                                                {CAMPAIGN_NODE_TYPE_LABELS[type]}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /** نمایش زنجیره نودها از یک nodeId تا انتها (تابع رندر — نه کامپوننت داخلی) */
    const renderChain = (nodeId: string) => {
        const node = nodesById.get(nodeId);
        if (!node) return null;
        const isEntry = nodeId === entryNodeId;

        return (
            <div className={styles.branch}>
                <NodeCard
                    node={node}
                    isEntry={isEntry}
                    menuOpen={menuFor === node.id}
                    onToggleMenu={() => setMenuFor(menuFor === node.id ? null : node.id)}
                    onCloseMenu={() => setMenuFor(null)}
                    onEdit={() => setConfigFor(node)}
                    onToggleEnabled={() => toggleNodeEnabled(node.id)}
                    onDelete={() => removeNode(node.id)}
                />
                <div className={styles.connector} />
                {node.type === 'conditional_split' ? (
                    <div className={styles.splitBranches}>
                        {renderBranch(node, 'yes', 'YES')}
                        {renderBranch(node, 'no', 'NO')}
                    </div>
                ) : (
                    renderBranch(node, 'default')
                )}
            </div>
        );
    };

    // ─── UI ───

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>
                                {flowId ? 'ویرایش کمپین' : 'افزودن کمپین جدید'}
                            </h1>
                            <p className={parentStyles.subtitle}>
                                {flowId
                                    ? name || 'نام، تریگر و مسیر نودها را تغییر دهید'
                                    : 'نام و تریگر را مشخص کنید، بعد نود شروع را از پالت بگذارید'}
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            <Link href="/campaigns" className={parentStyles.secondaryBtn}>
                                بازگشت به فهرست
                            </Link>
                            <button type="button" className={parentStyles.secondaryBtn} disabled={saving} onClick={() => handleSave('draft')}>
                                <LuSave /> ذخیره پیش‌نویس
                            </button>
                            <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => handleSave('live')}>
                                <LuZap /> انتشار زنده
                            </button>
                        </div>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از انتشار</h2>
                        <p>
                            اول هویت کمپین را پر کنید، بعد از پالت یک نود شروع بگذارید. گام‌های بعدی با دکمه + زیر هر
                            نود اضافه می‌شوند. روی «تنظیم» متن پیامک، مبلغ یا شرط را وارد کنید. تا وقتی نود شروع نباشد
                            نمی‌توان زنده کرد. اجراها را بعداً در{' '}
                            <Link href="/campaigns/runs">اجراهای کمپین</Link> ببینید.
                        </p>
                    </section>

                    <div className={parentStyles.formCard} style={{ marginBottom: '1.25rem' }}>
                        <h3 className={parentStyles.formSectionTitle}>هویت کمپین</h3>
                        <div className={hrStyles.formRow}>
                            <div className={parentStyles.field}>
                                <label>نام *</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="مثلاً تشکر از خریدار"
                                />
                                <p className={hrStyles.fieldHint}>
                                    نام داخلی فهرست و اجراها. روی پیامک کاربر نوشته نمی‌شود.
                                </p>
                            </div>
                            <div className={parentStyles.field}>
                                <label>وضعیت انتشار</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as typeof status)}
                                >
                                    <option value="draft">پیش‌نویس — اجرا نمی‌شود</option>
                                    <option value="live">زنده — تریگر کار می‌کند</option>
                                    <option value="paused">متوقف — اجرای جدید شروع نمی‌شود</option>
                                    <option value="archived">بایگانی</option>
                                </select>
                                <p className={hrStyles.fieldHint}>
                                    برای تست، پیش‌نویس ذخیره کنید. «انتشار زنده» همین وضعیت را زنده می‌کند.
                                </p>
                            </div>
                        </div>
                        <div className={parentStyles.field}>
                            <label>توضیح داخلی (اختیاری)</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="مثلاً یک ساعت بعد از خرید، اگر مبلغ بالا بود کد تخفیف بده"
                            />
                            <p className={hrStyles.fieldHint}>یادداشت تیم؛ در فهرست زیر نام کمپین دیده می‌شود.</p>
                        </div>

                        <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                            شروع فلو (تریگر)
                        </h3>
                        <div className={hrStyles.formRow}>
                            <div className={parentStyles.field}>
                                <label>نوع تریگر</label>
                                <select
                                    value={triggerType}
                                    onChange={(e) => setTriggerType(e.target.value as 'manual' | 'event')}
                                >
                                    {Object.entries(CAMPAIGN_TRIGGER_TYPE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                                <p className={hrStyles.fieldHint}>
                                    اجرای دستی را خودتان برای یک کاربر شروع می‌کنید. رویداد پلتفرم با آمدن event خودکار اجرا می‌شود.
                                </p>
                            </div>
                            {triggerType === 'event' ? (
                                <div className={parentStyles.field}>
                                    <label>نام رویداد پلتفرم *</label>
                                    <input
                                        className={styles.ltrInput}
                                        value={triggerEvent}
                                        onChange={(e) => setTriggerEvent(e.target.value)}
                                        placeholder="order_placed"
                                        dir="ltr"
                                    />
                                    <p className={hrStyles.fieldHint}>
                                        باید دقیقاً با نامی که بک‌اند می‌فرستد یکی باشد؛ مثلاً order_placed یا user_registered.
                                    </p>
                                </div>
                            ) : (
                                <div className={parentStyles.field}>
                                    <label>اجرای دستی</label>
                                    <p className={hrStyles.fieldHint} style={{ marginTop: '0.55rem' }}>
                                        بعد از انتشار زنده، از صفحه اجراها یا API تریگر، فلو را برای یک کاربر مشخص شروع کنید.
                                        برای تست اول این حالت ساده‌تر از رویداد است.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className={hrStyles.formNoteBox}>
                            <strong>وضعیت فعلی:</strong>{' '}
                            <span className={`${styles.statusBadge} ${styles[status] || ''}`}>
                                {status === 'live' ? 'زنده' : status === 'paused' ? 'متوقف' : status === 'archived' ? 'بایگانی' : 'پیش‌نویس'}
                            </span>
                            {' '}— {nodes.length} نود در فلو
                            {entryNodeId ? '، نود شروع مشخص است.' : '، هنوز نود شروع ندارید.'}
                        </div>
                    </div>

                    <h3 className={parentStyles.formSectionTitle}>مسیر فلو</h3>
                    <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.85rem' }}>
                        پالت فقط نود شروع را می‌گذارد. بقیه گام‌ها را با + زیر کارت اضافه کنید. نود شرطی دو شاخه YES و
                        NO می‌سازد. نود غیرفعال در اجرا رد می‌شود.
                    </p>

                    <div className={styles.builderLayout}>
                        <aside className={styles.palette}>
                            <h3 className={styles.paletteTitle}>نودها</h3>
                            {NODE_PALETTE.map((group) => (
                                <div key={group.group}>
                                    <div className={styles.paletteGroup}>{group.group}</div>
                                    <div className={styles.paletteItems}>
                                        {group.items.map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={styles.paletteItem}
                                                onClick={() => addNodeAfter(null, 'default', type)}
                                                disabled={nodes.length > 0}
                                                title={nodes.length > 0 ? 'فقط یک نود شروع داریم — از دکمه + زیر نودها استفاده کنید' : 'افزودن به عنوان نود شروع'}
                                            >
                                                <span className={styles.paletteIcon}>
                                                    <LuPlus />
                                                </span>
                                                {CAMPAIGN_NODE_TYPE_LABELS[type]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </aside>

                        <div className={styles.canvas} onClick={() => setMenuFor(null)}>
                            {nodes.length === 0 || !entryNodeId ? (
                                <div className={styles.emptyState} style={{ marginTop: '4rem' }}>
                                    فلو خالی است — از پالت یک نود شروع اضافه کنید (مثل «ارسال پیامک»). بعد با + زیر کارت ادامه دهید.
                                </div>
                            ) : (
                                renderChain(entryNodeId)
                            )}
                        </div>
                    </div>

                    {/* مودال پیکربندی نود */}
                    {configFor && (
                        <div className={styles.modalOverlay} onClick={() => setConfigFor(null)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>
                                    تنظیم «{configFor.title || CAMPAIGN_NODE_TYPE_LABELS[configFor.type]}»
                                </h2>
                                <p className={hrStyles.fieldHint} style={{ marginBottom: '1rem' }}>
                                    این تنظیمات موقع اجرای فلو روی کاربر اعمال می‌شود. فیلدهای ستاره‌دار را خالی نگذارید وگرنه اجرا ناموفق می‌شود.
                                </p>
                                <div className={parentStyles.field}>
                                    <label>عنوان نمایشی روی کارت</label>
                                    <input
                                        value={configFor.title || ''}
                                        onChange={(e) => {
                                            setNodeTitle(configFor.id, e.target.value);
                                            setConfigFor({ ...configFor, title: e.target.value });
                                        }}
                                    />
                                    <p className={hrStyles.fieldHint}>فقط در بیلدر دیده می‌شود؛ مثلاً «پیامک تشکر خرید».</p>
                                </div>
                                <NodeConfigForm
                                    node={configFor}
                                    onChange={(config) => {
                                        patchNodeConfig(configFor.id, config);
                                        setConfigFor({ ...configFor, config });
                                    }}
                                />
                                <div className={parentStyles.formActions}>
                                    <button
                                        type="button"
                                        className={parentStyles.primaryBtn}
                                        onClick={() => setConfigFor(null)}
                                    >
                                        تایید
                                    </button>
                                    <button
                                        type="button"
                                        className={parentStyles.secondaryBtn}
                                        onClick={() => setConfigFor(null)}
                                    >
                                        انصراف
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
