'use client';

import styles from './ai-modes.module.scss';

export type ModeInputForm = {
    type: 'prompt' | 'image' | 'video' | 'audio' | 'mask';
    key: string;
    label: string;
    labelFa: string;
    required: boolean;
    min: number;
    max: number;
    maxMb: number;
    hintFa: string;
};

const TYPES: Array<{ value: ModeInputForm['type']; label: string }> = [
    { value: 'prompt', label: 'پرامپت' },
    { value: 'image', label: 'تصویر' },
    { value: 'video', label: 'ویدیو' },
    { value: 'audio', label: 'صدا' },
    { value: 'mask', label: 'ماسک' },
];

export const EMPTY_MODE_INPUT: ModeInputForm = {
    type: 'image',
    key: '',
    label: '',
    labelFa: '',
    required: true,
    min: 1,
    max: 1,
    maxMb: 0,
    hintFa: '',
};

function toSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function inputsFromDoc(inputs?: Array<Record<string, unknown>>): ModeInputForm[] {
    if (!Array.isArray(inputs) || !inputs.length) {
        return [{ ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت' }];
    }
    return inputs.map((row) => ({
        type: (['prompt', 'image', 'video', 'audio', 'mask'].includes(String(row.type))
            ? row.type
            : 'image') as ModeInputForm['type'],
        key: String(row.key || ''),
        label: String(row.label || ''),
        labelFa: String(row.labelFa || ''),
        required: row.required !== false,
        min: Number(row.min) || (row.required === false ? 0 : 1),
        max: Number(row.max) || 1,
        maxMb: Number(row.maxMb) > 0 ? Number(row.maxMb) : 0,
        hintFa: String(row.hintFa || ''),
    }));
}

export function sanitizeModeInputs(rows: ModeInputForm[]): ModeInputForm[] {
    const seen = new Set<string>();
    const out: ModeInputForm[] = [];
    for (const row of rows) {
        const key = toSlug(row.key || row.label || row.labelFa);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const max = Math.max(1, Number(row.max) || 1);
        const min = Math.max(0, Math.min(max, Number(row.min) || (row.required ? 1 : 0)));
        out.push({
            type: row.type,
            key,
            label: row.label.trim() || key,
            labelFa: row.labelFa.trim() || row.label.trim() || key,
            required: row.required !== false,
            min: row.type === 'prompt' ? 1 : min,
            max: row.type === 'prompt' ? 1 : max,
            maxMb: row.type === 'prompt' ? 0 : (Number(row.maxMb) > 0 ? Number(row.maxMb) : 0),
            hintFa: row.hintFa.trim(),
        });
    }
    return out;
}

const PRESETS: Array<{ label: string; rows: ModeInputForm[] }> = [
    {
        label: 'فقط پرامپت',
        rows: [{ ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت' }],
    },
    {
        label: 'یک عکس',
        rows: [
            { ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت' },
            { ...EMPTY_MODE_INPUT, type: 'image', key: 'image', label: 'Image', labelFa: 'تصویر', min: 1, max: 1 },
        ],
    },
    {
        label: 'فریم اول و آخر',
        rows: [
            { ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت گذار' },
            { ...EMPTY_MODE_INPUT, type: 'image', key: 'first_frame', label: 'Start Frame', labelFa: 'فریم شروع', min: 1, max: 1 },
            { ...EMPTY_MODE_INPUT, type: 'image', key: 'last_frame', label: 'End Frame', labelFa: 'فریم پایان', min: 1, max: 1 },
        ],
    },
    {
        label: 'چند عکس',
        rows: [
            { ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت' },
            { ...EMPTY_MODE_INPUT, type: 'image', key: 'frames', label: 'Frames', labelFa: 'فریم‌ها', min: 2, max: 12 },
        ],
    },
];

export default function ModeInputsEditor({
    value,
    onChange,
}: {
    value: ModeInputForm[];
    onChange: (next: ModeInputForm[]) => void;
}) {
    const update = (index: number, patch: Partial<ModeInputForm>) => {
        onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    return (
        <div className={styles.inputsEditor}>
            <div className={styles.inputsEditorHead}>
                <strong>ورودی‌های مورد نیاز</strong>
                <span>در چت برای هر مورد غیر از پرامپت، اسلات جدا با همان سقف تعداد ساخته می‌شود.</span>
            </div>
            <div className={styles.inputPresets}>
                {PRESETS.map((preset) => (
                    <button
                        type="button"
                        key={preset.label}
                        className={styles.secondaryBtn}
                        onClick={() => onChange(preset.rows.map((row) => ({ ...row })))}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            {value.map((row, index) => (
                <div className={styles.inputRow} key={`${row.key}-${index}`}>
                    <label className={styles.field}>
                        نوع
                        <select
                            value={row.type}
                            onChange={(e) => update(index, { type: e.target.value as ModeInputForm['type'] })}
                        >
                            {TYPES.map((type) => (
                                <option value={type.value} key={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        کلید (key)
                        <input
                            dir="ltr"
                            value={row.key}
                            placeholder="first_frame"
                            onChange={(e) => update(index, { key: e.target.value })}
                        />
                    </label>
                    <label className={styles.field}>
                        عنوان انگلیسی
                        <input
                            dir="ltr"
                            value={row.label}
                            onChange={(e) => update(index, { label: e.target.value })}
                        />
                    </label>
                    <label className={styles.field}>
                        عنوان فارسی
                        <input
                            value={row.labelFa}
                            placeholder="فریم شروع"
                            onChange={(e) => update(index, { labelFa: e.target.value })}
                        />
                    </label>
                    <label className={styles.field}>
                        حداقل
                        <input
                            type="number"
                            min={0}
                            max={row.max || 99}
                            disabled={row.type === 'prompt'}
                            value={row.type === 'prompt' ? 1 : row.min}
                            onChange={(e) => update(index, { min: Number(e.target.value) })}
                        />
                    </label>
                    <label className={styles.field}>
                        حداکثر
                        <input
                            type="number"
                            min={1}
                            max={99}
                            disabled={row.type === 'prompt'}
                            value={row.type === 'prompt' ? 1 : row.max}
                            onChange={(e) => update(index, { max: Number(e.target.value) })}
                        />
                    </label>
                    {row.type !== 'prompt' ? (
                        <label className={styles.field}>
                            حداکثر حجم (MB)
                            <input
                                type="number"
                                min={0}
                                step="0.5"
                                placeholder="بدون سقف"
                                value={row.maxMb || ''}
                                onChange={(e) => update(index, { maxMb: Number(e.target.value) || 0 })}
                            />
                        </label>
                    ) : null}
                    <label className={styles.toggleLabel}>
                        <span>الزامی</span>
                        <input
                            type="checkbox"
                            checked={row.required}
                            onChange={(e) => update(index, { required: e.target.checked })}
                        />
                    </label>
                    <label className={`${styles.field} ${styles.full}`}>
                        راهنمای کوتاه
                        <input
                            value={row.hintFa}
                            placeholder="مثلاً عکس شروع و پایان باید کادر مشابه داشته باشند"
                            onChange={(e) => update(index, { hintFa: e.target.value })}
                        />
                    </label>
                    <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => onChange(value.filter((_, i) => i !== index))}
                    >
                        حذف ورودی
                    </button>
                </div>
            ))}
            <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => onChange([...value, { ...EMPTY_MODE_INPUT }])}
            >
                افزودن ورودی
            </button>
        </div>
    );
}
