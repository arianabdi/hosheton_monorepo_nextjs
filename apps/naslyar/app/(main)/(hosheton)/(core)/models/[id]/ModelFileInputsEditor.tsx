'use client';

import ToggleSwitch from './ToggleSwitch';
import ModelEditTabCard from './ModelEditTabCard';
import { ALL_FILE_FORMATS, FILE_FORMAT_GROUPS, UNSUPPORTED_FILE_NOTE, type ModelFileInputsForm } from './fileInputs';
import styles from './ModelFileInputsEditor.module.scss';

/**
 * تب «فایل‌های ورودی» — فقط مدل‌های متنی (LLM). جدا از بقیه‌ی تنظیمات مدل تا قیمت، مود و route دست نخورند.
 */
export default function ModelFileInputsEditor({
    value,
    onChange,
}: {
    value: ModelFileInputsForm;
    onChange: (next: ModelFileInputsForm) => void;
}) {
    const selected = new Set(value.formats);
    const setFormats = (formats: Iterable<string>) => {
        const set = new Set(formats);
        onChange({ ...value, formats: ALL_FILE_FORMATS.filter((item) => set.has(item)) });
    };
    const toggleFormat = (format: string) => {
        const next = new Set(selected);
        if (next.has(format)) next.delete(format);
        else next.add(format);
        setFormats(next);
    };
    const toggleGroup = (formats: string[], on: boolean) => {
        const next = new Set(selected);
        for (const format of formats) {
            if (on) next.add(format);
            else next.delete(format);
        }
        setFormats(next);
    };
    const allOn = ALL_FILE_FORMATS.every((format) => selected.has(format));

    return (
        <ModelEditTabCard
            title="فایل‌های ورودی (مدل متنی)"
            subtitle="کاربر در چت متنی این قالب‌ها را پیوست می‌کند؛ سرور متن فایل را استخراج و همراه پیام به مدل می‌فرستد. ورودی عکس جداست و از route مدل می‌آید."
        >
            <ToggleSwitch
                checked={value.enabled}
                onChange={(enabled) => onChange({
                    ...value,
                    enabled,
                    // روشن کردن اول کار: همه‌ی قالب‌ها (بعد می‌شود کم کرد)
                    formats: enabled && !value.formats.length ? [...ALL_FILE_FORMATS] : value.formats,
                })}
                label="پذیرش فایل در چت"
                description={value.enabled
                    ? `${selected.size} قالب مجاز`
                    : 'خاموش — دکمه‌ی پیوست برای فایل‌های متنی این مدل نمایش داده نمی‌شود'}
            />

            {value.enabled ? (
                <>
                    <div className={styles.limits}>
                        <label>
                            حداکثر تعداد فایل در هر پیام
                            <input
                                type="number"
                                min={1}
                                max={20}
                                className="form-control form-control-sm"
                                value={value.maxFiles}
                                onChange={(event) => onChange({ ...value, maxFiles: event.target.value === '' ? '' : Number(event.target.value) })}
                            />
                        </label>
                        <label>
                            حداکثر حجم هر فایل (مگابایت)
                            <input
                                type="number"
                                min={1}
                                max={100}
                                className="form-control form-control-sm"
                                value={value.maxFileMb}
                                onChange={(event) => onChange({ ...value, maxFileMb: event.target.value === '' ? '' : Number(event.target.value) })}
                            />
                        </label>
                    </div>

                    <div className={styles.toolbar}>
                        <span>قالب‌های مجاز</span>
                        <button type="button" onClick={() => setFormats(allOn ? [] : ALL_FILE_FORMATS)}>
                            {allOn ? 'برداشتن همه' : 'انتخاب همه'}
                        </button>
                    </div>

                    <div className={styles.groups}>
                        {FILE_FORMAT_GROUPS.map((group) => {
                            const count = group.formats.filter((format) => selected.has(format)).length;
                            const groupOn = count === group.formats.length;
                            return (
                                <div key={group.id} className={styles.group}>
                                    <div className={styles.groupHead}>
                                        <label className={styles.groupTitle}>
                                            <input
                                                type="checkbox"
                                                checked={groupOn}
                                                ref={(node) => { if (node) node.indeterminate = count > 0 && !groupOn; }}
                                                onChange={() => toggleGroup(group.formats, !groupOn)}
                                            />
                                            {group.title}
                                            <span className={styles.groupCount}>{count}/{group.formats.length}</span>
                                        </label>
                                        <span className={styles.groupHint}>{group.hint}</span>
                                    </div>
                                    <div className={styles.formats}>
                                        {group.formats.map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                className={`${styles.format} ${selected.has(format) ? styles.formatOn : ''}`}
                                                aria-pressed={selected.has(format)}
                                                onClick={() => toggleFormat(format)}
                                            >
                                                .{format}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className={styles.note}>{UNSUPPORTED_FILE_NOTE}</p>
                </>
            ) : null}
        </ModelEditTabCard>
    );
}
