'use client';

import React, { useMemo, useState } from 'react';
import { LuTrash2 } from 'react-icons/lu';

import styles from './ProviderPricingTables.module.scss';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { isModeRunnable, type ModelModeEditorValue, type ProviderOption } from './ModelModesEditor';
import { summarizeRouteConditions } from './routeConditions';
import type { NodeSettingFieldForm } from './settingFieldForm';

export const DEFAULT_PRICING_KEY = 'default';

/** فراداده‌ی یک جدول قیمت ارائه‌دهنده (خود قیمت در فرم قیمت‌گذاری صفحه است) */
export interface ProviderPricingTableMeta {
    editorId: string;
    providerId: string;
    /** خالی = همه‌ی مودها */
    modeIds: string[];
}

type ProviderNameOf = (providerId: string) => string;

export function createPricingTableId(): string {
    return `price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function modeIdsOf(modes: ModelModeEditorValue[]): string[] {
    return modes.map((mode) => mode.modeType.trim()).filter(Boolean);
}

/** هم‌سان با validateProviderModelProviderPricing در API */
export function validateProviderPricingTables(
    tables: ProviderPricingTableMeta[],
    modes: ModelModeEditorValue[],
    providerName: ProviderNameOf,
): string[] {
    const errors: string[] = [];
    const known = new Set(modeIdsOf(modes).map((id) => id.toLowerCase()));
    const general = new Set<string>();
    const scoped = new Set<string>();
    tables.forEach((table, index) => {
        const label = providerName(table.providerId) || `جدول ${index + 1}`;
        if (!table.providerId) {
            errors.push(`ارائه‌دهنده‌ی جدول قیمت ${index + 1} را انتخاب کنید.`);
            return;
        }
        if (!table.modeIds.length) {
            if (general.has(table.providerId)) errors.push(`«${label}» دو جدول «همه‌ی مودها» دارد؛ یکی را حذف کنید یا به مود خاص محدود کنید.`);
            general.add(table.providerId);
            return;
        }
        table.modeIds.forEach((modeId) => {
            if (!known.has(modeId.toLowerCase())) errors.push(`جدول «${label}» به مود «${modeId}» اشاره می‌کند که در تب مودها نیست.`);
            const key = `${table.providerId}:${modeId.toLowerCase()}`;
            if (scoped.has(key)) errors.push(`مود «${modeId}» در دو جدول «${label}» آمده است.`);
            scoped.add(key);
        });
    });
    return Array.from(new Set(errors));
}

/** کدام جدول، یک درخواست به provider برای mode را قیمت می‌زند — هم‌سان با resolvePricing در API */
export function pricingTableFor(
    tables: ProviderPricingTableMeta[],
    providerId: string,
    mode: ModelModeEditorValue | null,
): { key: string; scoped: boolean } | null {
    const modeId = mode?.modeType.trim().toLowerCase() || '';
    const candidates = tables.filter((table) => table.providerId && table.providerId === providerId);
    const scoped = modeId
        ? candidates.find((table) => table.modeIds.some((id) => id.toLowerCase() === modeId))
        : undefined;
    if (scoped) return { key: scoped.editorId, scoped: true };
    const general = candidates.find((table) => !table.modeIds.length);
    return general ? { key: general.editorId, scoped: false } : null;
}

export function pricingTableLabel(table: ProviderPricingTableMeta, providerName: ProviderNameOf): string {
    const provider = providerName(table.providerId) || 'بدون ارائه‌دهنده';
    return table.modeIds.length ? `${provider} · ${table.modeIds.join('، ')}` : provider;
}

export default function ProviderPricingTables({
    tables,
    activeKey,
    onSelect,
    onAdd,
    onPatch,
    onRemove,
    providers,
    modes,
    parentProviderId,
    settingsSchema,
    sameAsDefault,
}: {
    tables: ProviderPricingTableMeta[];
    activeKey: string;
    onSelect: (key: string) => void;
    onAdd: (providerId: string) => void;
    onPatch: (editorId: string, patch: Partial<ProviderPricingTableMeta>) => void;
    onRemove: (editorId: string) => void;
    providers: ProviderOption[];
    modes: ModelModeEditorValue[];
    parentProviderId: string;
    settingsSchema: NodeSettingFieldForm[];
    /** جدول‌هایی که هنوز عیناً همان قیمت پیش‌فرض‌اند (کپی شده و عوض نشده) */
    sameAsDefault: Set<string>;
}) {
    const [newProviderId, setNewProviderId] = useState('');
    const providerName: ProviderNameOf = (providerId) => {
        const provider = providers.find((item) => item._id === providerId);
        return provider?.displayName || provider?.name || '';
    };
    const active = tables.find((table) => table.editorId === activeKey) || null;
    const errors = useMemo(
        () => validateProviderPricingTables(tables, modes, providerName),
        // providerName فقط به providers وابسته است
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tables, modes, providers],
    );

    // ارائه‌دهنده‌هایی که مسیر روشن دارند اول فهرست می‌آیند
    const routedProviderIds = useMemo(() => {
        const ids = new Set<string>();
        modes.filter(isModeRunnable).forEach((mode) => {
            const routes = mode.routes.filter((route) => route.isActive);
            if (!routes.length && parentProviderId) ids.add(parentProviderId);
            routes.forEach((route) => { if (route.providerId) ids.add(route.providerId); });
        });
        if (!modes.length && parentProviderId) ids.add(parentProviderId);
        return ids;
    }, [modes, parentProviderId]);
    const sortedProviders = useMemo(
        () => [...providers].sort((a, b) => Number(routedProviderIds.has(b._id)) - Number(routedProviderIds.has(a._id))),
        [providers, routedProviderIds],
    );

    const routeRows = useMemo(() => {
        const rows: Array<{
            key: string;
            mode: string;
            route: string;
            conditions: string;
            provider: string;
            table: string;
            tableKey: string;
            source: 'provider' | 'mode' | 'default';
        }> = [];
        const tableName = (key: string) => {
            const table = tables.find((item) => item.editorId === key);
            return table ? pricingTableLabel(table, providerName) : 'پیش‌فرض';
        };
        const push = (mode: ModelModeEditorValue | null, routeId: string, providerId: string, conditions: string) => {
            const table = pricingTableFor(tables, providerId, mode);
            const modeOverride = Boolean(mode?.pricingOverrideText.trim());
            rows.push({
                key: `${mode?.editorId || 'model'}:${routeId}`,
                mode: mode?.modeType || '—',
                route: routeId,
                conditions,
                provider: providerName(providerId) || 'provider اصلی مدل',
                table: table ? tableName(table.key) : modeOverride ? 'قیمت اختصاصی مود (JSON)' : 'پیش‌فرض',
                tableKey: table ? table.key : DEFAULT_PRICING_KEY,
                source: table ? 'provider' : modeOverride ? 'mode' : 'default',
            });
        };
        if (!modes.length) push(null, 'مسیر اصلی', parentProviderId, '');
        modes.filter(isModeRunnable).forEach((mode) => {
            const routes = mode.routes.filter((route) => route.isActive);
            if (!routes.length) push(mode, 'مسیر اصلی', parentProviderId, '');
            routes.forEach((route) => push(
                mode,
                route.id || '—',
                route.providerId,
                summarizeRouteConditions(route.conditions, settingsSchema),
            ));
        });
        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modes, tables, providers, parentProviderId, settingsSchema]);
    const offCount = modes.reduce((count, mode) => count + (isModeRunnable(mode)
        ? mode.routes.filter((route) => !route.isActive).length
        : Math.max(1, mode.routes.length)), 0);
    const unusedTables = tables.filter((table) => table.providerId && !routeRows.some((row) => row.tableKey === table.editorId));

    const tabs = [
        { id: DEFAULT_PRICING_KEY, label: 'قیمت پیش‌فرض' },
        ...tables.map((table) => ({ id: table.editorId, label: pricingTableLabel(table, providerName) })),
    ];

    return (
        <div className={styles.wrap}>
            <div className={styles.head}>
                <div>
                    <span className={styles.title}>قیمت بر اساس ارائه‌دهنده</span>
                    <span className={styles.hint}>
                        «قیمت پیش‌فرض» برای هر درخواستی است که ارائه‌دهنده‌اش جدول جدا ندارد. اگر همین مدل روی ارائه‌دهنده‌ی دیگری
                        (مثلاً fal) قیمت دیگری دارد، برایش جدول بسازید؛ مسیرهای آن ارائه‌دهنده در تب «مودها» خودکار با همان جدول
                        قیمت می‌خورند — هم در قیمتی که کاربر قبل از ارسال می‌بیند، هم در مبلغ کسرشده.
                    </span>
                </div>
            </div>

            <SimpleLineTabs tabs={tabs} activeTab={activeKey} onChange={onSelect} />

            {active ? (
                <div className={styles.tableMeta}>
                    <label className={styles.field}>
                        <span>ارائه‌دهنده</span>
                        <select
                            value={active.providerId}
                            onChange={(event) => onPatch(active.editorId, { providerId: event.target.value })}
                        >
                            <option value="">انتخاب ارائه‌دهنده</option>
                            {sortedProviders.map((provider) => (
                                <option key={provider._id} value={provider._id}>
                                    {provider.displayName || provider.name}{routedProviderIds.has(provider._id) ? ' — در مسیرها' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className={styles.field}>
                        <span>برای کدام مودها</span>
                        <div className={styles.chips} role="group" aria-label="مودهای این جدول">
                            <button
                                type="button"
                                aria-pressed={!active.modeIds.length}
                                className={`${styles.chip} ${active.modeIds.length ? '' : styles.chipOn}`}
                                onClick={() => onPatch(active.editorId, { modeIds: [] })}
                            >
                                همه‌ی مودها
                            </button>
                            {modeIdsOf(modes).map((modeId) => {
                                const on = active.modeIds.includes(modeId);
                                return (
                                    <button
                                        key={modeId}
                                        type="button"
                                        aria-pressed={on}
                                        className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                                        onClick={() => onPatch(active.editorId, {
                                            modeIds: on
                                                ? active.modeIds.filter((id) => id !== modeId)
                                                : [...active.modeIds, modeId],
                                        })}
                                    >
                                        {modeId}
                                    </button>
                                );
                            })}
                        </div>
                        <span className={styles.hint}>
                            جدولِ مخصوص یک مود بر جدولِ «همه‌ی مودها»ی همان ارائه‌دهنده مقدم است.
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => onRemove(active.editorId)}
                        title="حذف این جدول — مسیرهای این ارائه‌دهنده دوباره با قیمت پیش‌فرض حساب می‌شوند"
                    >
                        <LuTrash2 size={13} aria-hidden /> حذف جدول
                    </button>
                    {sameAsDefault.has(active.editorId) ? (
                        <div className={styles.notice}>
                            این جدول هنوز عیناً همان قیمت پیش‌فرض است. قیمت‌های پایین را با قیمت واقعی همین ارائه‌دهنده عوض کنید.
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className={styles.addRow}>
                <select
                    value={newProviderId}
                    aria-label="ارائه‌دهنده‌ی جدول جدید"
                    onChange={(event) => setNewProviderId(event.target.value)}
                >
                    <option value="">ارائه‌دهنده‌ی جدول جدید…</option>
                    {sortedProviders.map((provider) => (
                        <option key={provider._id} value={provider._id}>
                            {provider.displayName || provider.name}{routedProviderIds.has(provider._id) ? ' — در مسیرها' : ''}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className={styles.addBtn}
                    disabled={!newProviderId}
                    onClick={() => {
                        onAdd(newProviderId);
                        setNewProviderId('');
                    }}
                >
                    + جدول قیمت ارائه‌دهنده
                </button>
                <span className={styles.hint}>ساختار جدول از قیمت پیش‌فرض کپی می‌شود؛ فقط اعداد را عوض کنید.</span>
            </div>

            {errors.length ? (
                <div className={styles.errors}>
                    <strong>قبل از ذخیره درست کنید</strong>
                    <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
            ) : null}

            <div className={styles.summary}>
                <div className={styles.summaryHead}>
                    <span className={styles.title}>هر مسیر با کدام جدول قیمت می‌خورد</span>
                    <span className={styles.hint}>
                        فقط مودها و مسیرهای روشن. روی نام جدول بزنید تا همان جدول باز شود.
                        {offCount ? ` ${offCount} مسیر/مود خاموش در قیمت‌گذاری شرکت نمی‌کند.` : ''}
                    </span>
                </div>
                <table className={styles.summaryTable}>
                    <thead>
                        <tr>
                            <th>مود</th>
                            <th>مسیر</th>
                            <th>ارائه‌دهنده</th>
                            <th>جدول قیمت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routeRows.length ? routeRows.map((row) => (
                            <tr key={row.key}>
                                <td data-label="مود" className={styles.ltr}>{row.mode}</td>
                                <td data-label="مسیر">
                                    <span className={styles.ltr}>{row.route}</span>
                                    {row.conditions ? <span className={styles.conditions}>{row.conditions}</span> : null}
                                </td>
                                <td data-label="ارائه‌دهنده">{row.provider}</td>
                                <td data-label="جدول قیمت">
                                    {row.source === 'mode' ? (
                                        <span className={styles.muted} title="قیمت JSON در «تنظیمات پیشرفته‌ی مود» (تب مودها)">{row.table}</span>
                                    ) : (
                                        <button
                                            type="button"
                                            className={`${styles.tableLink} ${row.tableKey === activeKey ? styles.tableLinkActive : ''}`}
                                            onClick={() => onSelect(row.tableKey)}
                                        >
                                            {row.table}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className={styles.muted}>مود یا مسیر روشنی نیست؛ این مدل اجرا نمی‌شود.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {unusedTables.length ? (
                    <div className={styles.notice}>
                        {unusedTables.map((table) => `«${pricingTableLabel(table, providerName)}»`).join('، ')} فعلاً هیچ مسیر روشنی ندارد و
                        استفاده نمی‌شود — یک مسیر به همین ارائه‌دهنده در تب «مودها» بسازید یا روشن کنید.
                    </div>
                ) : null}
            </div>
        </div>
    );
}
