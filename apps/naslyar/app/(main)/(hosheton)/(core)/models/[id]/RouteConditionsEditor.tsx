'use client';

import React from 'react';
import { LuTrash2 } from 'react-icons/lu';

import styles from './ModelModesEditor.module.scss';
import type { NodeSettingFieldForm } from './settingFieldForm';
import {
    emptyRouteCondition,
    isListOperator,
    ROUTE_CONDITION_OPERATORS,
    settingDefault,
    settingOptions,
    type RouteConditionForm,
    type RouteConditionOperator,
} from './routeConditions';

/**
 * شرط تنظیمات کاربر برای انتخاب یک مسیر اجرا — مثلاً «رزولوشن یکی از 4k» تا
 * درخواست‌های 4k به fal بروند و بقیه به مسیر بی‌شرط Atlas.
 */
export default function RouteConditionsEditor({
    conditions,
    settingsSchema,
    onChange,
}: {
    conditions: RouteConditionForm[];
    settingsSchema: NodeSettingFieldForm[];
    onChange: (conditions: RouteConditionForm[]) => void;
}) {
    const fields = settingsSchema.filter((field) => field.key.trim());
    const patch = (index: number, next: Partial<RouteConditionForm>) => {
        onChange(conditions.map((condition, i) => (i === index ? { ...condition, ...next } : condition)));
    };

    return (
        <div>
            <div className={styles.limitsHead}>
                <div>
                    <span className={styles.sectionTitle}>شرط تنظیمات کاربر</span>
                    <span className={styles.sectionHint}>
                        این مسیر فقط وقتی انتخاب می‌شود که همه‌ی شرط‌ها برقرار باشند. اگر کاربر تنظیمی را عوض نکرده باشد،
                        مقدار پیش‌فرض همان تنظیم بررسی می‌شود. بدون شرط = همه‌ی تنظیمات.
                    </span>
                </div>
            </div>

            {conditions.length ? (
                <div className={styles.conditions}>
                    {conditions.map((condition, index) => {
                        const options = settingOptions(settingsSchema, condition.key);
                        const fallback = settingDefault(fields.find((field) => field.key === condition.key));
                        const knownKey = !condition.key || fields.some((field) => field.key === condition.key);
                        return (
                            <div className={styles.conditionRow} key={index}>
                                <select
                                    value={condition.key}
                                    aria-label="تنظیم"
                                    onChange={(event) => patch(index, { key: event.target.value, values: [], value: '' })}
                                >
                                    <option value="">انتخاب تنظیم</option>
                                    {!knownKey ? <option value={condition.key}>{condition.key} (در تنظیمات مدل نیست)</option> : null}
                                    {fields.map((field) => (
                                        <option key={field.uid || field.key} value={field.key}>
                                            {field.labelFa || field.label || field.key} — {field.key}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={condition.op}
                                    aria-label="نوع شرط"
                                    onChange={(event) => patch(index, { op: event.target.value as RouteConditionOperator })}
                                >
                                    {ROUTE_CONDITION_OPERATORS.map((operator) => (
                                        <option key={operator.value} value={operator.value}>{operator.label}</option>
                                    ))}
                                </select>
                                {isListOperator(condition.op) ? (
                                    options.length ? (
                                        <div className={styles.conditionChips} role="group" aria-label="مقادیر">
                                            {options.map((option) => {
                                                const on = condition.values.includes(option.value);
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        aria-pressed={on}
                                                        className={`${styles.conditionChip} ${on ? styles.conditionChipOn : ''}`}
                                                        onClick={() => patch(index, {
                                                            values: on
                                                                ? condition.values.filter((item) => item !== option.value)
                                                                : [...condition.values, option.value],
                                                        })}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <input
                                            className={styles.ltr}
                                            value={condition.values.join(', ')}
                                            placeholder="4k, 2160p"
                                            aria-label="مقادیر (با کاما)"
                                            onChange={(event) => patch(index, {
                                                values: event.target.value.split(',').map((item) => item.trim()),
                                            })}
                                        />
                                    )
                                ) : (
                                    <input
                                        type="number"
                                        className={styles.ltr}
                                        value={condition.value}
                                        placeholder="8"
                                        aria-label="عدد"
                                        onChange={(event) => patch(index, { value: event.target.value })}
                                    />
                                )}
                                <button
                                    type="button"
                                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                    title="حذف شرط"
                                    aria-label={`حذف شرط ${index + 1}`}
                                    onClick={() => onChange(conditions.filter((_, i) => i !== index))}
                                >
                                    <LuTrash2 size={13} aria-hidden />
                                </button>
                                {condition.key && fallback ? (
                                    <span className={`${styles.hint} ${styles.conditionHint}`}>
                                        اگر کاربر تغییر ندهد: <span className={styles.metaLtr}>{fallback}</span>
                                    </span>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <button
                type="button"
                className={styles.linkBtn}
                disabled={!fields.length}
                title={fields.length ? undefined : 'اول در تب «تنظیمات مدل» تنظیم تعریف کنید'}
                onClick={() => onChange([...conditions, emptyRouteCondition()])}
            >
                + افزودن شرط تنظیمات
            </button>
        </div>
    );
}
