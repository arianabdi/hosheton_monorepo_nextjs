'use client';

import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { LuChevronDown, LuCircleAlert, LuGripVertical, LuTrash2 } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';

import styles from './SettingFieldEditor.module.scss';
import pageStyles from './ModelEditPage.module.scss';
import ToggleSwitch from './ToggleSwitch';
import SettingOptionsTable from './SettingOptionsTable';
import SettingStudioDisplay from './SettingStudioDisplay';
import SettingUrlSource from './SettingUrlSource';
import type { PlatformIconItem } from '../../ai-settings/usePlatformIcons';
import {
    NODE_FIELD_TYPES,
    depCombosFromSchema,
    formatOptionsToText,
    parseDependsOnText,
    settingIsSent,
    type NodeSettingFieldForm,
    type NodeSettingFieldOption,
    type NodeSettingFieldType,
} from './settingFieldForm';

function Section({ title, hint, aside, children }: { title: string; hint?: ReactNode; aside?: ReactNode; children: ReactNode }) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHead}>
                <div>
                    <span className={styles.sectionTitle}>{title}</span>
                    {hint ? <span className={styles.sectionHint}>{hint}</span> : null}
                </div>
                {aside}
            </div>
            {children}
        </div>
    );
}

/** فیلد ترکیبی: مبدأها → گزینه‌های خروجی → جدول حالات */
function DerivedEditor({
    field,
    schema,
    icons,
    onPatch,
}: {
    field: NodeSettingFieldForm;
    schema: NodeSettingFieldForm[];
    icons: PlatformIconItem[];
    onPatch: (patch: Partial<NodeSettingFieldForm>) => void;
}) {
    const depKeys = parseDependsOnText(field.dependsOnText);
    const depFields = depKeys
        .map((key) => schema.find((f) => f.key === key))
        .filter((f): f is NodeSettingFieldForm => Boolean(f));
    const combos = depCombosFromSchema(schema, field.dependsOnText);
    const selectionMap = new Map((field.mappingRows || []).map((row) => [row.values.join('|'), row.output]));
    const filledCount = (field.mappingRows || [])
        .filter((row) => row.output.trim() && combos.some((combo) => combo.join('|') === row.values.join('|'))).length;
    const outputOptions = (field.optionsRows || []).filter((row) => row.value.trim());
    const sourceCandidates = schema.filter((f) => f.type === 'select' && f.key.trim() && f.key !== field.key);
    const columns = { gridTemplateColumns: `${depKeys.map(() => 'minmax(0, 1fr)').join(' ')} minmax(0, 1.4fr)` };

    const toggleDep = (depKey: string) => {
        const next = depKeys.includes(depKey) ? depKeys.filter((k) => k !== depKey) : [...depKeys, depKey];
        const nextCombos = new Set(depCombosFromSchema(schema, next.join(', ')).map((combo) => combo.join('|')));
        onPatch({
            dependsOnText: next.join(', '),
            mappingRows: (field.mappingRows || []).filter((row) => nextCombos.has(row.values.join('|'))),
        });
    };

    const setComboOutput = (comboValues: string[], output: string) => {
        const key = comboValues.join('|');
        const rest = (field.mappingRows || []).filter((row) => row.values.join('|') !== key);
        onPatch({ mappingRows: output ? [...rest, { values: comboValues, output }] : rest });
    };

    return (
        <>
            <Section
                title="۱. فیلدهای مبدأ"
                hint="مقدار این فیلد از ترکیب انتخاب کاربر در این فیلدها ساخته می‌شود (فقط فیلدهای select)."
            >
                {sourceCandidates.length === 0 ? (
                    <span className={styles.hint}>اول یک فیلد از نوع «انتخاب (select)» تعریف کنید.</span>
                ) : (
                    <div className={styles.depChips}>
                        {sourceCandidates.map((f) => {
                            const active = depKeys.includes(f.key);
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    aria-pressed={active}
                                    className={`${styles.depChip} ${active ? styles.depChipActive : ''}`}
                                    onClick={() => toggleDep(f.key)}
                                >
                                    {active ? '✓ ' : ''}{f.labelFa || f.label || f.key}
                                    <span className={styles.fieldCode}>{f.key}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {depFields.some((f) => settingIsSent(f)) ? (
                    <span className={`${styles.hint} ${styles.hintWarn}`}>
                        {depFields.filter((f) => settingIsSent(f)).map((f) => f.key).join('، ')} هنوز جداگانه هم ارسال می‌شود؛
                        اگر provider فقط مقدار ترکیبی را می‌خواهد، «ارسال در درخواست» آن را خاموش کنید.
                    </span>
                ) : null}
            </Section>

            <Section title="۲. مقادیر نهایی" hint="انتخاب‌های ستون «مقدار نهایی» در جدول حالات؛ به‌عنوان گزینه‌های فیلد هم ذخیره می‌شوند.">
                <SettingOptionsTable
                    rows={field.optionsRows || []}
                    text={field.optionsText}
                    icons={icons}
                    withMedia={false}
                    valuePlaceholder="1280x720"
                    labelPlaceholder="1280 × 720"
                    onRowsChange={(rows) => onPatch({ optionsRows: rows, optionsText: formatOptionsToText(rows) })}
                    onTextChange={(text, rows) => onPatch({ optionsText: text, optionsRows: rows })}
                    onPickIcon={() => undefined}
                    onIconChange={() => undefined}
                />
            </Section>

            <Section
                title="۳. جدول حالات"
                hint="برای هر ترکیب از مبدأها، مقدار نهایی را انتخاب کنید. ترکیب بدون مقدار در استودیو جلوی ارسال را می‌گیرد."
                aside={combos.length ? <span className={styles.hint}>{filledCount} از {combos.length} پر شده</span> : null}
            >
                {depKeys.length === 0 ? (
                    <span className={styles.hint}>اول فیلدهای مبدأ را انتخاب کنید.</span>
                ) : combos.length === 0 ? (
                    <span className={styles.hint}>یکی از فیلدهای مبدأ گزینه ندارد.</span>
                ) : combos.length > 200 ? (
                    <span className={`${styles.hint} ${styles.hintWarn}`}>تعداد حالات ({combos.length}) زیاد است — گزینه‌های مبدأها را کم کنید.</span>
                ) : (
                    <div className={styles.comboTable}>
                        <div className={`${styles.comboRow} ${styles.comboHead}`} style={columns}>
                            {depFields.map((f) => <span key={f.key}>{f.labelFa || f.label || f.key}</span>)}
                            <span>مقدار نهایی</span>
                        </div>
                        {combos.map((combo) => {
                            const comboKey = combo.join('|');
                            const selected = selectionMap.get(comboKey) || '';
                            return (
                                <div key={comboKey} className={`${styles.comboRow} ${selected ? '' : styles.comboMissing}`} style={columns}>
                                    {combo.map((value, valueIdx) => {
                                        const option = (depFields[valueIdx]?.optionsRows || []).find((row) => row.value === value);
                                        return (
                                            <span key={valueIdx}>
                                                {option?.label || value}
                                                <span className={styles.comboCode}>{value}</span>
                                            </span>
                                        );
                                    })}
                                    <select value={selected} onChange={(e) => setComboOutput(combo, e.target.value)}>
                                        <option value="">— انتخاب —</option>
                                        {outputOptions.map((row) => (
                                            <option key={row.value} value={row.value}>{row.label || row.value}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Section>

            <Section title="نمایش به کاربر">
                <ToggleSwitch
                    checked={field.showToUser}
                    onChange={(checked) => onPatch({ showToUser: checked })}
                    label="مقدار محاسبه‌شده به کاربر نشان داده شود"
                    description={field.showToUser
                        ? 'در استودیو به‌صورت فقط‌خواندنی زیر تنظیمات دیده می‌شود.'
                        : 'مخفی است؛ مقدار پشت صحنه محاسبه و ارسال می‌شود.'}
                />
            </Section>
        </>
    );
}

/** کنترل مقدار پیش‌فرض متناسب با نوع فیلد */
function DefaultValueInput({ field, onPatch }: { field: NodeSettingFieldForm; onPatch: (patch: Partial<NodeSettingFieldForm>) => void }) {
    const label = <span className={styles.fieldLabel}>مقدار پیش‌فرض <span className={styles.fieldCode}>default</span></span>;
    if (field.type === 'checkbox') {
        return (
            <label className={styles.field}>
                {label}
                <select value={field.defaultText} onChange={(e) => onPatch({ defaultText: e.target.value })}>
                    <option value="">بدون پیش‌فرض</option>
                    <option value="true">روشن (true)</option>
                    <option value="false">خاموش (false)</option>
                </select>
            </label>
        );
    }
    if (field.type === 'select') {
        const options = (field.optionsRows || []).filter((row) => row.value.trim());
        const known = options.some((row) => row.value.trim() === field.defaultText.trim());
        return (
            <label className={styles.field}>
                {label}
                <select value={field.defaultText} onChange={(e) => onPatch({ defaultText: e.target.value })}>
                    <option value="">بدون پیش‌فرض</option>
                    {options.map((row) => (
                        <option key={row.value} value={row.value.trim()}>{row.label || row.value}</option>
                    ))}
                    {field.defaultText && !known ? <option value={field.defaultText}>{field.defaultText}</option> : null}
                </select>
            </label>
        );
    }
    const numeric = field.type === 'number' || field.type === 'slider';
    return (
        <label className={styles.field}>
            {label}
            <input
                value={field.defaultText}
                type={numeric ? 'number' : 'text'}
                placeholder={numeric ? (field.min || '—') : 'خالی = بدون پیش‌فرض'}
                onChange={(e) => onPatch({ defaultText: e.target.value })}
            />
        </label>
    );
}

export default function SettingFieldEditor({
    field,
    index,
    schema,
    open,
    onToggle,
    onPatch,
    onRemove,
    token,
    baseUrl,
    providerName,
    icons,
    onPickIcon,
    onIconChange,
    dragHandleProps,
    dragging = false,
    dropIndicator = null,
}: {
    field: NodeSettingFieldForm;
    index: number;
    schema: NodeSettingFieldForm[];
    open: boolean;
    onToggle: () => void;
    onPatch: (patch: Partial<NodeSettingFieldForm>) => void;
    onRemove: () => void;
    token: string | null;
    baseUrl: string;
    providerName?: string;
    icons: PlatformIconItem[];
    onPickIcon: (rowIdx: number) => void;
    onIconChange: (rowIdx: number, patch: Pick<NodeSettingFieldOption, 'iconSvg' | 'platformIconId'>) => void;
    /** رویدادهای دستگیره‌ی جابه‌جایی (useSortableList) */
    dragHandleProps?: HTMLAttributes<HTMLElement>;
    dragging?: boolean;
    /** خط راهنمای محل رها کردن، بالا یا پایین همین کارت */
    dropIndicator?: 'before' | 'after' | null;
}) {
    const [helpOpen, setHelpOpen] = useState(false);
    const sent = settingIsSent(field);
    const typeLabel = NODE_FIELD_TYPES.find((item) => item.value === field.type)?.label || field.type;
    const staticOptions = (field.optionsRows || []).filter((row) => row.value.trim()).length;
    const dynamicOn = field.dynamicSource !== 'none';
    const warning = !field.key.trim()
        ? 'کلید ندارد — ذخیره نمی‌شود'
        : field.type === 'select' && !staticOptions && !dynamicOn
            ? 'گزینه ندارد'
            : '';
    const setSent = (checked: boolean) => onPatch({ sendToProvider: checked ? 'yes' : 'no' });

    return (
        <div
            id={`model-setting-${index}`}
            className={[
                styles.card,
                open ? styles.cardOpen : '',
                dragging ? styles.cardDragging : '',
                dropIndicator === 'before' ? styles.dropBefore : '',
                dropIndicator === 'after' ? styles.dropAfter : '',
            ].join(' ')}
        >
            <div id={`model-setting-header-${index}`} className={styles.header} onClick={onToggle} aria-expanded={open}>
                {dragHandleProps ? (
                    <button
                        type="button"
                        id={`model-setting-handle-${index}`}
                        className={styles.dragHandle}
                        title="برای تغییر ترتیب بکشید (یا با ↑ / ↓)"
                        aria-label={`جابه‌جایی ${field.key || `فیلد ${index + 1}`} — با کلیدهای بالا و پایین`}
                        {...dragHandleProps}
                    >
                        <LuGripVertical size={15} aria-hidden />
                    </button>
                ) : null}
                <LuChevronDown size={15} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden />
                <div className={styles.headTitle}>
                    {field.key ? <span className={styles.headKey}>{field.key}</span> : <span className={styles.headKeyEmpty}>بدون کلید</span>}
                    {field.labelFa ? <span className={styles.headLabel}>{field.labelFa}</span> : null}
                    <span className={styles.typeTag}>{field.type}</span>
                    {warning ? <span className={styles.headWarn}>{warning}</span> : null}
                </div>
                <div className={styles.headActions}>
                    <span
                        className={`${styles.sendToggle} ${sent ? '' : styles.sendToggleOff}`}
                        title={sent ? 'مقدار این فیلد در درخواست هوش مصنوعی ارسال می‌شود' : 'فقط داخل استودیو استفاده می‌شود و ارسال نمی‌شود'}
                    >
                        <ToggleSwitch checked={sent} onChange={setSent} ariaLabel={`ارسال ${field.key || 'فیلد'} در درخواست هوش مصنوعی`} />
                        <span className={styles.sendToggleText}>{sent ? 'ارسال به AI' : 'فقط داخلی'}</span>
                    </span>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="حذف فیلد"
                        aria-label={`حذف فیلد ${field.key || index + 1}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                    >
                        <LuTrash2 size={14} aria-hidden />
                    </button>
                </div>
            </div>

            {open ? (
                <div className={styles.body}>
                    <Section title="مشخصات فیلد">
                        <div className={`${styles.grid} ${styles.grid4}`}>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>کلید <span className={styles.fieldCode}>key</span> *</span>
                                <input
                                    value={field.key}
                                    className={styles.ltr}
                                    placeholder="aspectRatio"
                                    onChange={(e) => onPatch({ key: e.target.value })}
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>نوع فیلد *</span>
                                <select value={field.type} onChange={(e) => onPatch({ type: e.target.value as NodeSettingFieldType })}>
                                    {NODE_FIELD_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>عنوان فارسی <span className={styles.fieldCode}>labelFa</span></span>
                                <input value={field.labelFa} placeholder="نسبت تصویر" onChange={(e) => onPatch({ labelFa: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>عنوان انگلیسی <span className={styles.fieldCode}>label</span></span>
                                <input value={field.label} className={styles.ltr} placeholder="Aspect ratio" onChange={(e) => onPatch({ label: e.target.value })} />
                            </label>
                        </div>
                        <span className={styles.hint}>کلید همان نام متغیر در nodeData.modelSettings است — {typeLabel}.</span>
                    </Section>

                    <Section
                        title="راهنمای کاربر"
                        hint="کاربر در چت و ورک‌فلو با کلیک روی آیکون (!) کنار عنوان تنظیم این متن را می‌بیند. خالی بماند، آیکون نمایش داده نمی‌شود."
                        aside={(
                            <button type="button" className={styles.ghostBtn} disabled={!field.helpFa.trim()} onClick={() => setHelpOpen(true)}>
                                <LuCircleAlert size={13} aria-hidden /> پیش‌نمایش
                            </button>
                        )}
                    >
                        <label className={styles.field}>
                            <textarea
                                rows={3}
                                dir="auto"
                                value={field.helpFa}
                                placeholder={'این تنظیم چه‌کار می‌کند و روی خروجی چه اثری دارد؟ مثلاً:\n«نسبت عرض به ارتفاع ویدیو. ۱۶:۹ برای یوتیوب و ۹:۱۶ برای استوری مناسب است.»'}
                                onChange={(e) => onPatch({ helpFa: e.target.value })}
                            />
                        </label>
                    </Section>

                    {field.type === 'number' || field.type === 'slider' ? (
                        <Section title="محدوده و پیش‌فرض" hint="پیش‌فرض خالی باشد، استودیو از حداقل شروع می‌کند.">
                            <div className={`${styles.grid} ${styles.grid4}`}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>حداقل <span className={styles.fieldCode}>min</span></span>
                                    <input type="number" value={field.min} onChange={(e) => onPatch({ min: e.target.value })} />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>حداکثر <span className={styles.fieldCode}>max</span></span>
                                    <input type="number" value={field.max} onChange={(e) => onPatch({ max: e.target.value })} />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>گام <span className={styles.fieldCode}>step</span></span>
                                    <input type="number" value={field.step} placeholder="1" onChange={(e) => onPatch({ step: e.target.value })} />
                                </label>
                                <DefaultValueInput field={field} onPatch={onPatch} />
                            </div>
                        </Section>
                    ) : null}

                    {field.type === 'text' || field.type === 'textarea' || field.type === 'checkbox' ? (
                        <Section title="مقدار پیش‌فرض" hint="اگر کاربر مقداری ندهد همین مقدار ارسال می‌شود.">
                            <div className={styles.grid}>
                                <DefaultValueInput field={field} onPatch={onPatch} />
                                {field.type !== 'checkbox' ? (
                                    <label className={styles.field}>
                                        <span className={styles.fieldLabel}>متن داخل کادر خالی <span className={styles.fieldCode}>placeholder</span></span>
                                        <input value={field.placeholder} onChange={(e) => onPatch({ placeholder: e.target.value })} />
                                    </label>
                                ) : null}
                            </div>
                        </Section>
                    ) : null}

                    {field.type === 'select' ? (
                        <>
                            <Section title="گزینه‌ها" aside={<div className={styles.sectionAside}><DefaultValueInput field={field} onPatch={onPatch} /></div>}>
                                {dynamicOn ? (
                                    <p className={styles.note}>
                                        منبع داینامیک روشن است: در ورک‌فلو گزینه‌ها از API خوانده می‌شوند و این لیست فقط در چت و
                                        به‌عنوان بک‌آپ استفاده می‌شود.
                                    </p>
                                ) : null}
                                <SettingOptionsTable
                                    rows={field.optionsRows || []}
                                    text={field.optionsText}
                                    icons={icons}
                                    onRowsChange={(rows) => onPatch({ optionsRows: rows, optionsText: formatOptionsToText(rows) })}
                                    onTextChange={(text, rows) => onPatch({ optionsText: text, optionsRows: rows })}
                                    onPickIcon={onPickIcon}
                                    onIconChange={onIconChange}
                                />
                            </Section>

                            <Section title="منبع داینامیک گزینه‌ها">
                                <div className={`${styles.switchBlock} ${dynamicOn ? styles.switchBlockOn : ''}`}>
                                    <ToggleSwitch
                                        checked={dynamicOn}
                                        onChange={(checked) => onPatch({
                                            dynamicSource: checked ? (field.urlSourceUrl.trim() || !field.optionsSource.trim() ? 'url' : 'provider') : 'none',
                                        })}
                                        label="گزینه‌ها از API دریافت شوند"
                                        description={dynamicOn
                                            ? 'به‌جای لیست بالا، استودیو گزینه‌ها را هنگام باز شدن تنظیمات از API می‌گیرد.'
                                            : 'خاموش: فقط از لیست گزینه‌های بالا استفاده می‌شود (مثلاً صداهای ElevenLabs را می‌شود زنده گرفت).'}
                                    />
                                    {dynamicOn ? (
                                        <div className={styles.switchBlockBody}>
                                            <div className={styles.radioRow} role="radiogroup" aria-label="نوع منبع">
                                                <label className={styles.radio}>
                                                    <input
                                                        type="radio"
                                                        checked={field.dynamicSource === 'url'}
                                                        onChange={() => onPatch({ dynamicSource: 'url' })}
                                                    />
                                                    آدرس دلخواه (urlSource)
                                                </label>
                                                <label className={styles.radio}>
                                                    <input
                                                        type="radio"
                                                        checked={field.dynamicSource === 'provider'}
                                                        onChange={() => onPatch({ dynamicSource: 'provider' })}
                                                    />
                                                    منبع آماده‌ی provider (optionsSource)
                                                </label>
                                            </div>
                                            {field.dynamicSource === 'provider' ? (
                                                <label className={styles.field}>
                                                    <span className={styles.fieldLabel}>نام منبع</span>
                                                    <input
                                                        value={field.optionsSource}
                                                        className={styles.ltr}
                                                        placeholder="voices"
                                                        onChange={(e) => onPatch({ optionsSource: e.target.value })}
                                                    />
                                                    <span className={styles.hint}>
                                                        مثلاً voices → /api/ai/{providerName || '<provider>'}/options/voices
                                                    </span>
                                                </label>
                                            ) : (
                                                <SettingUrlSource
                                                    field={field}
                                                    token={token}
                                                    baseUrl={baseUrl}
                                                    providerName={providerName}
                                                    onPatch={onPatch}
                                                />
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </Section>

                            <Section
                                title="نمایش در استودیو"
                                hint="ظاهر گزینه‌ها در پاپ‌اور تنظیمات چت و ورک‌فلو — فقط روی نمایش اثر دارد، نه روی درخواست."
                            >
                                <SettingStudioDisplay field={field} onPatch={onPatch} onOpenHelp={() => setHelpOpen(true)} />
                            </Section>
                        </>
                    ) : null}

                    {field.type === 'derived' ? (
                        <DerivedEditor field={field} schema={schema} icons={icons} onPatch={onPatch} />
                    ) : null}

                    <Section title="ارسال در درخواست هوش مصنوعی">
                        <div className={`${styles.switchBlock} ${sent ? styles.switchBlockOn : ''}`}>
                            <ToggleSwitch
                                checked={sent}
                                onChange={setSent}
                                label={sent ? 'کلید و مقدار این فیلد ارسال می‌شود' : 'ارسال نمی‌شود — فقط داخل استودیو'}
                                description={sent
                                    ? 'مقدار انتخاب‌شده‌ی کاربر (یا پیش‌فرض) در body درخواست provider قرار می‌گیرد.'
                                    : 'برای فیلدهایی که فقط مبدأ یک فیلد ترکیبی‌اند یا فقط رفتار استودیو را تغییر می‌دهند.'}
                            />
                            {sent ? (
                                <div className={styles.switchBlockBody}>
                                    <div className={`${styles.grid} ${styles.grid3}`}>
                                        <label className={`${styles.field} ${styles.span2}`}>
                                            <span className={styles.fieldLabel}>مسیر در body <span className={styles.fieldCode}>payloadPath</span></span>
                                            <input
                                                value={field.payloadPath}
                                                className={styles.ltr}
                                                placeholder={field.key || 'generationConfig.imageConfig.aspectRatio'}
                                                onChange={(e) => onPatch({ payloadPath: e.target.value })}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span className={styles.fieldLabel}>تبدیل مقدار</span>
                                            <select
                                                value={field.transform}
                                                onChange={(e) => onPatch({ transform: e.target.value as NodeSettingFieldForm['transform'] })}
                                            >
                                                <option value="">بدون تبدیل</option>
                                                <option value="string">string</option>
                                                <option value="number">number</option>
                                                <option value="boolean">boolean</option>
                                                <option value="lowercase">lowercase</option>
                                                <option value="uppercase">uppercase</option>
                                            </select>
                                        </label>
                                    </div>
                                    <span className={styles.hint}>
                                        {field.payloadPath.trim()
                                            ? `مقدار در ${field.payloadPath.trim()} قرار می‌گیرد؛ بخش‌های عددی یعنی آرایه (مثل tools.0.size).`
                                            : `خالی: با همان نام کلید (${field.key || 'key'}) به provider ارسال می‌شود.`}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </Section>
                </div>
            ) : null}

            <ModalHelper
                open={helpOpen && Boolean(field.helpFa.trim())}
                onClose={() => setHelpOpen(false)}
                size="md"
                sheetTitle={field.labelFa || field.label || field.key}
                component={helpOpen && field.helpFa.trim()
                    ? <p className={pageStyles.helpPreviewText} dir="auto">{field.helpFa.trim()}</p>
                    : null}
            />
        </div>
    );
}
