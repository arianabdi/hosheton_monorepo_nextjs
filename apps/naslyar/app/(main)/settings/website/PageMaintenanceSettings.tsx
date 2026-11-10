'use client';

import React from 'react';
import type { PageMaintenanceRule } from '@my-workspace/utils';
import maintenanceStyles from './MaintenanceSettings.module.scss';
import styles from './PageMaintenanceSettings.module.scss';

/** ردیف فرم — مسیرها به‌صورت متن خام (هر خط یک الگو) تا تایپ خط جدید نپرد */
export interface PageMaintenanceRow extends Omit<PageMaintenanceRule, 'paths'> {
    pathsText: string;
}

export function rowsFromRules(rules: PageMaintenanceRule[]): PageMaintenanceRow[] {
    return rules.map(({ paths, ...rest }) => ({ ...rest, pathsText: paths.join('\n') }));
}

export function rulesFromRows(rows: PageMaintenanceRow[]): PageMaintenanceRule[] {
    return rows
        .map(({ pathsText, ...rest }) => ({
            ...rest,
            label: rest.label.trim(),
            title: rest.title?.trim() || '',
            content: rest.content?.trim() || '',
            paths: pathsText
                .split(/[\n,]/)
                .map((p) => p.trim())
                .filter(Boolean),
        }))
        .filter((rule) => rule.paths.length);
}

const DEFAULT_TITLE = 'این بخش در حال بروزرسانی است';
const DEFAULT_CONTENT =
    'در حال ارتقای این بخش هستیم تا تجربه‌ی بهتری برایتان بسازیم. به‌زودی با امکانات تازه برمی‌گردیم؛ تا آن زمان می‌توانید از بخش‌های دیگر استفاده کنید.';

interface Props {
    rows: PageMaintenanceRow[];
    onChange: (rows: PageMaintenanceRow[]) => void;
}

/**
 * بروزرسانی صفحه‌به‌صفحه — فهرست صفحه‌ها کاملاً از همین فرم ساخته می‌شود (هیچ صفحه‌ای در کد ثابت نیست)
 * و در system-setting «website.page_maintenance» همان اپی که پنل به آن وصل است ذخیره می‌شود.
 * اپ‌ها مسیر فعلی را با findPageMaintenanceRule (@my-workspace/utils) تطبیق می‌دهند.
 */
export default function PageMaintenanceSettings({ rows, onChange }: Props) {
    const activeCount = rows.filter((row) => row.enabled && row.pathsText.trim()).length;

    const update = (id: string, patch: Partial<PageMaintenanceRow>) => {
        onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    };

    const remove = (id: string) => onChange(rows.filter((row) => row.id !== id));

    const add = () => {
        onChange([
            ...rows,
            { id: `page-${Date.now()}`, label: '', pathsText: '', enabled: true, title: '', content: '' },
        ]);
    };

    return (
        <div className={maintenanceStyles.card}>
            <div className={maintenanceStyles.cardHeader}>
                <h3 className={maintenanceStyles.cardTitle}>بروزرسانی صفحه‌ها</h3>
                <span className={`${maintenanceStyles.statusBadge} ${activeCount ? maintenanceStyles.enabled : maintenanceStyles.disabled}`}>
                    {activeCount ? `${activeCount.toLocaleString('fa-IR')} صفحه در حال بروزرسانی` : 'همه‌ی صفحه‌ها فعال'}
                </span>
            </div>

            <p className={styles.intro}>
                به‌جای بستن کل پلتفرم، فقط یک بخش را ببندید (مثلاً اکسپلور، چت، ورک‌فلو یا پیام‌ها). کاربر هنوز منو و
                بقیه‌ی بخش‌ها را دارد و فقط محتوای همان صفحه با پیام «در حال بروزرسانی» عوض می‌شود. فهرست صفحه‌ها
                برای هر اپلیکیشن جداست — هر صفحه‌ای لازم شد اضافه کنید و بعد از اتمام کار خاموش یا حذفش کنید.
            </p>

            {rows.length === 0 ? (
                <p className={styles.empty}>هنوز صفحه‌ای اضافه نشده است.</p>
            ) : (
                <ul className={styles.list}>
                    {rows.map((row) => (
                        <li key={row.id} className={styles.item}>
                            <label className={`${maintenanceStyles.switchRow} ${row.enabled ? maintenanceStyles.active : ''}`}>
                                <input
                                    type="checkbox"
                                    className={maintenanceStyles.switch}
                                    checked={row.enabled}
                                    onChange={(e) => update(row.id, { enabled: e.target.checked })}
                                />
                                <span className={maintenanceStyles.switchText}>
                                    <span className={maintenanceStyles.switchTitle}>
                                        {row.label.trim() || 'صفحه‌ی بدون نام'}
                                    </span>
                                    <span className={maintenanceStyles.switchDesc}>
                                        {row.enabled ? 'در حال بروزرسانی — کاربران پیام بروزرسانی را می‌بینند' : 'خاموش — صفحه عادی نمایش داده می‌شود'}
                                    </span>
                                </span>
                            </label>

                            <div className={styles.grid}>
                                <label className={maintenanceStyles.field}>
                                    <span className={maintenanceStyles.fieldLabel}>نام صفحه</span>
                                    <input
                                        type="text"
                                        value={row.label}
                                        placeholder="مثلاً اکسپلور"
                                        onChange={(e) => update(row.id, { label: e.target.value })}
                                    />
                                    <span className={maintenanceStyles.fieldHint}>فقط برای شناسایی در همین پنل؛ به کاربر نشان داده نمی‌شود.</span>
                                </label>

                                <label className={maintenanceStyles.field}>
                                    <span className={maintenanceStyles.fieldLabel}>مسیرهای صفحه</span>
                                    <textarea
                                        className={styles.paths}
                                        dir="ltr"
                                        value={row.pathsText}
                                        placeholder={'/explore\n/projects/*/workflow'}
                                        onChange={(e) => update(row.id, { pathsText: e.target.value })}
                                    />
                                    <span className={maintenanceStyles.fieldHint}>
                                        هر خط یک مسیر؛ هر مسیر زیرصفحه‌هایش را هم می‌گیرد، مثلاً <code>/chat</code> همه‌ی گفتگوها را.
                                        ستاره <code>*</code> جای یک بخش دلخواه است، مثل شناسه‌ی پروژه، و <code>**</code> جای چند بخش.
                                    </span>
                                </label>
                            </div>

                            <label className={maintenanceStyles.field}>
                                <span className={maintenanceStyles.fieldLabel}>عنوان سفارشی</span>
                                <input
                                    type="text"
                                    value={row.title || ''}
                                    placeholder={DEFAULT_TITLE}
                                    onChange={(e) => update(row.id, { title: e.target.value })}
                                />
                            </label>

                            <label className={maintenanceStyles.field}>
                                <span className={maintenanceStyles.fieldLabel}>متن سفارشی</span>
                                <textarea
                                    value={row.content || ''}
                                    placeholder={DEFAULT_CONTENT}
                                    onChange={(e) => update(row.id, { content: e.target.value })}
                                />
                                <span className={maintenanceStyles.fieldHint}>
                                    خالی بماند، متن پیش‌فرض (به زبان کاربر) نمایش داده می‌شود. متن سفارشی به همان شکلی که می‌نویسید نشان داده می‌شود.
                                </span>
                            </label>

                            <div className={styles.itemActions}>
                                <button type="button" className={styles.removeBtn} onClick={() => remove(row.id)}>
                                    حذف این صفحه
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div>
                <button type="button" className={styles.addBtn} onClick={add}>+ افزودن صفحه</button>
            </div>
        </div>
    );
}
