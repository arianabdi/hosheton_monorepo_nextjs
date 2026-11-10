'use client';

import type { ReactNode } from 'react';
import {
    LuArrowDownRight,
    LuBell,
    LuClock,
    LuGitBranch,
    LuMail,
    LuPencil,
    LuPercent,
    LuTrash2,
    LuUser,
    LuWebhook,
    LuWallet,
} from 'react-icons/lu';
import { CAMPAIGN_NODE_TYPE_LABELS, nodeSummary, type FlowNode } from '../campaigns.types';
import styles from '../Campaigns.module.scss';

/** آیکون هر نوع نود (مثل آیکون‌های پالت Klaviyo) */
export function NodeTypeIcon({ type, size = 16 }: { type: FlowNode['type']; size?: number }) {
    switch (type) {
        case 'sms':
            return <LuMail size={size} />;
        case 'wallet_charge':
            return <LuWallet size={size} />;
        case 'discount_grant':
            return <LuPercent size={size} />;
        case 'internal_alert':
            return <LuBell size={size} />;
        case 'webhook':
            return <LuWebhook size={size} />;
        case 'profile_update':
            return <LuUser size={size} />;
        case 'time_delay':
            return <LuClock size={size} />;
        case 'conditional_split':
            return <LuGitBranch size={size} />;
        default:
            return <LuArrowDownRight size={size} />;
    }
}

export interface NodeCardProps {
    node: FlowNode;
    isEntry: boolean;
    menuOpen: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onEdit: () => void;
    onToggleEnabled: () => void;
    onDelete: () => void;
}

export default function NodeCard({
    node,
    isEntry,
    menuOpen,
    onToggleMenu,
    onCloseMenu,
    onEdit,
    onToggleEnabled,
    onDelete,
}: NodeCardProps) {
    return (
        <div className={`${styles.nodeCard} ${node.isEnabled ? '' : styles.disabled} ${isEntry ? styles.entryNode : ''}`}>
            <div className={styles.nodeHead}>
                <span className={styles.nodeIcon}>
                    <NodeTypeIcon type={node.type} size={17} />
                </span>
                <div className={styles.nodeTitles}>
                    <p className={styles.nodeTitle} title={node.title || CAMPAIGN_NODE_TYPE_LABELS[node.type]}>
                        {node.title || CAMPAIGN_NODE_TYPE_LABELS[node.type]}
                    </p>
                </div>
                <button type="button" className={styles.nodeKebab} aria-label="عملیات نود" onClick={onToggleMenu}>
                    ⋮
                </button>
            </div>
            <p className={styles.nodeSummary}>{nodeSummary(node)}</p>
            <div className={styles.nodeFooter}>
                <span
                    className={`${styles.liveToggle} ${node.isEnabled ? styles.on : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleEnabled();
                    }}
                >
                    <span className={styles.liveDot} /> {node.isEnabled ? 'Live' : 'Off'}
                </span>
                {isEntry && <span style={{ fontSize: '0.68rem', opacity: 0.5 }}>شروع فلو</span>}
            </div>

            {menuOpen && (
                <div className={styles.nodeMenu} onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                            onEdit();
                            onCloseMenu();
                        }}
                    >
                        <LuPencil /> تنظیم
                    </button>
                    <button type="button" className={styles.menuItem} onClick={() => { onToggleEnabled(); onCloseMenu(); }}>
                        {node.isEnabled ? 'غیرفعال' : 'فعال'}
                    </button>
                    {!isEntry && (
                        <button
                            type="button"
                            className={`${styles.menuItem} ${styles.danger}`}
                            onClick={() => {
                                onDelete();
                                onCloseMenu();
                            }}
                        >
                            <LuTrash2 /> حذف
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── فرم پیکربندی نود (در مودال) ───

export interface NodeConfigFormProps {
    node: FlowNode;
    onChange: (config: Record<string, unknown>) => void;
}

/** یک field کوچک با استایل والد */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className={styles.configField}>
            <label>{label}</label>
            {children}
            {hint ? <p className={styles.configHint}>{hint}</p> : null}
        </div>
    );
}

export function NodeConfigForm({ node, onChange }: NodeConfigFormProps) {
    const set = (key: string, value: unknown) => onChange({ ...node.config, [key]: value });
    const config = node.config || {};

    switch (node.type) {
        case 'sms':
            return (
                <>
                    <Field label="متن پیامک *" hint="متنی که به شماره کاربر ارسال می‌شود. خالی باشد اجرا ناموفق می‌شود.">
                        <textarea
                            value={String(config.message || '')}
                            onChange={(e) => set('message', e.target.value)}
                            rows={3}
                            placeholder="خریدت ثبت شد. ممنون که با ما هستی."
                        />
                    </Field>
                    <Field label="شماره مقصد" hint="خالی بگذارید تا همان شماره حساب کاربر استفاده شود. فقط برای تست عدد ثابت بگذارید.">
                        <input
                            className={styles.ltrInput}
                            value={String(config.phone || '')}
                            onChange={(e) => set('phone', e.target.value)}
                            placeholder="0912..."
                            dir="ltr"
                        />
                    </Field>
                </>
            );
        case 'wallet_charge':
            return (
                <>
                    <Field label="مبلغ شارژ *" hint="مبلغ به واحد کیف پول کاربر. صفر یا خالی یعنی این نود کار نمی‌کند.">
                        <input
                            type="number"
                            min={1}
                            value={Number(config.amount || 0)}
                            onChange={(e) => set('amount', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="توضیح تراکنش" hint="در تاریخچه کیف پول کاربر دیده می‌شود؛ مثلاً «جایزه کمپین خرید».">
                        <input
                            value={String(config.description || '')}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder="شارژ کیف پول توسط کمپین"
                        />
                    </Field>
                </>
            );
        case 'discount_grant':
            return (
                <>
                    <Field label="نوع تخفیف" hint="درصدی از مبلغ سفارش، یا مبلغ ثابت تومان.">
                        <select
                            value={String(config.discountType || 'percent')}
                            onChange={(e) => set('discountType', e.target.value)}
                        >
                            <option value="percent">درصدی</option>
                            <option value="fixed">مبلغ ثابت</option>
                        </select>
                    </Field>
                    <Field label="مقدار تخفیف *" hint="برای درصدی عدد ۱ تا ۱۰۰؛ برای مبلغ ثابت همان عدد تومان.">
                        <input
                            type="number"
                            min={1}
                            value={Number(config.discountValue || 0)}
                            onChange={(e) => set('discountValue', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="اعتبار (روز)" hint="بعد از این تعداد روز کد باطل می‌شود. ۰ یعنی بدون انقضا.">
                        <input
                            type="number"
                            min={0}
                            value={Number(config.expiresInDays ?? 7)}
                            onChange={(e) => set('expiresInDays', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="سقف استفاده" hint="چند بار این کاربر می‌تواند از کد استفاده کند. معمولاً ۱.">
                        <input
                            type="number"
                            min={1}
                            value={Number(config.maxUses ?? 1)}
                            onChange={(e) => set('maxUses', Number(e.target.value))}
                        />
                    </Field>
                </>
            );
        case 'internal_alert':
            return (
                <>
                    <Field label="عنوان" hint="عنوان اعلان داخل پنل برای تیم؛ کاربر نهایی نمی‌بیند.">
                        <input value={String(config.title || '')} onChange={(e) => set('title', e.target.value)} />
                    </Field>
                    <Field label="متن اطلاع *" hint="توضیح برای اپراتور؛ مثلاً «خرید بالای ۵۰۰ هزار — پیگیری دستی».">
                        <textarea
                            value={String(config.message || '')}
                            onChange={(e) => set('message', e.target.value)}
                            rows={3}
                        />
                    </Field>
                </>
            );
        case 'webhook':
            return (
                <Field label="آدرس وب‌هوک *" hint="POST به این URL با داده کاربر و زمینه اجرا. باید https معتبر باشد.">
                    <input
                        className={styles.ltrInput}
                        value={String(config.url || '')}
                        onChange={(e) => set('url', e.target.value)}
                        placeholder="https://example.com/hook"
                        dir="ltr"
                    />
                </Field>
            );
        case 'profile_update':
            return (
                <>
                    <Field label="فیلد پروفایل *" hint="نام فیلد در پروفایل کاربر، مثل fullName یا city. اشتباه باشد نود fail می‌شود.">
                        <input
                            className={styles.ltrInput}
                            value={String(config.field || '')}
                            onChange={(e) => set('field', e.target.value)}
                            placeholder="fullName"
                            dir="ltr"
                        />
                    </Field>
                    <Field label="مقدار جدید *" hint="مقداری که در آن فیلد نوشته می‌شود.">
                        <input value={String(config.value ?? '')} onChange={(e) => set('value', e.target.value)} />
                    </Field>
                </>
            );
        case 'time_delay':
            return (
                <>
                    <p className={styles.configHint} style={{ marginBottom: '0.75rem' }}>
                        اجرا در وضعیت «منتظر» می‌ماند تا این مدت بگذرد، بعد نود بعدی شروع می‌شود. هر سه را ۰ نگذارید.
                    </p>
                    <div className={styles.delayGrid}>
                    <Field label="روز">
                        <input
                            type="number"
                            min={0}
                            value={Number(config.days || 0)}
                            onChange={(e) => set('days', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="ساعت">
                        <input
                            type="number"
                            min={0}
                            max={23}
                            value={Number(config.hours || 0)}
                            onChange={(e) => set('hours', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="دقیقه">
                        <input
                            type="number"
                            min={0}
                            max={59}
                            value={Number(config.minutes || 0)}
                            onChange={(e) => set('minutes', Number(e.target.value))}
                        />
                    </Field>
                    </div>
                </>
            );
        case 'conditional_split':
            return (
                <>
                    <Field label="عبارت سمت چپ *" hint="مسیر داده مثل user.balance یا order.total. خالی باشد هر دو شاخه اشتباه می‌روند.">
                        <input
                            className={styles.ltrInput}
                            value={String(config.left || '')}
                            onChange={(e) => set('left', e.target.value)}
                            placeholder="user.balance"
                            dir="ltr"
                        />
                    </Field>
                    <Field label="عملگر" hint="چطور چپ و راست مقایسه شوند. «موجود باشد» فقط وجود فیلد را چک می‌کند.">
                        <select value={String(config.op || 'eq')} onChange={(e) => set('op', e.target.value)}>
                            <option value="eq">مساوی</option>
                            <option value="neq">نامساوی</option>
                            <option value="gt">بزرگ‌تر از</option>
                            <option value="gte">بزرگ‌تر یا مساوی</option>
                            <option value="lt">کوچک‌تر از</option>
                            <option value="lte">کوچک‌تر یا مساوی</option>
                            <option value="contains">شامل</option>
                            <option value="exists">موجود باشد</option>
                        </select>
                    </Field>
                    <Field label="مقدار سمت راست" hint="برای exists لازم نیست. برای عدد، همان عدد را بدون واحد بنویسید.">
                        <input
                            className={styles.ltrInput}
                            value={String(config.right ?? '')}
                            onChange={(e) => set('right', e.target.value)}
                            dir="ltr"
                        />
                    </Field>
                    <p className={styles.configHint}>
                        مسیرهای قابل استفاده: user.* (اطلاعات کاربر)، lastWalletCharge، discountCode، lastCondition و
                        داده‌های تریگر. شاخه YES اگر شرط برقرار باشد، وگرنه NO.
                    </p>
                </>
            );
        default:
            return <p>این نوع نود پیکربندی ندارد.</p>;
    }
}



