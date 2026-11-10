/**
 * مدل فرم «فیلدهای تنظیمات» مدل (ProviderModel.settingsSchema) + تبدیل به/از API.
 * کامپوننت ویرایشگر در SettingFieldEditor.tsx است؛ این فایل فقط داده و توابع خالص دارد.
 */

export type NodeSettingFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'slider'
    | 'derived';

export interface NodeSettingFieldOption {
    value: string;
    label: string;
    iconSvg?: string;
    /** شناسه آیکون عمومی که iconSvg از آن انتخاب شده — ویرایش آن آیکون این گزینه را هم به‌روز می‌کند */
    platformIconId?: string;
    /** URL نمونه (صوت/عکس/ویدیو) برای پیش‌نمایش گزینه در استودیو — به provider ارسال نمی‌شود */
    preview?: string;
}

/** نحوه نمایش گزینه‌های select در استودیو (چت هوشتون) */
export type NodeSettingOptionsDisplay = 'auto' | 'chips' | 'grid' | 'list' | 'dropdown';

/** فعال/غیرفعال بودن هر نوع پیش‌نمایش گزینه‌ها در استودیو */
export interface NodeSettingOptionsPreview {
    icon: boolean;
    audio: boolean;
    image: boolean;
    video: boolean;
}

export const OPTIONS_DISPLAY_CHOICES: { value: NodeSettingOptionsDisplay; label: string; hint: string }[] = [
    { value: 'auto', label: 'خودکار', hint: 'همه‌ی گزینه‌ها آیکون/تصویر/ویدیو دارند → کارت، نمونه صدا دارند → لیست، بیش از ۱۲ گزینه → Select، بقیه → Badge' },
    { value: 'chips', label: 'Badge', hint: 'برچسب‌های کوچک کنار هم؛ دکمه پخش صدا داخل خود badge' },
    { value: 'grid', label: 'کارت', hint: 'کارت با آیکون / تصویر / ویدیو و عنوان زیر آن' },
    { value: 'list', label: 'لیست', hint: 'ردیف‌های تمام‌عرض: پیش‌نمایش + عنوان + دکمه پخش' },
    { value: 'dropdown', label: 'Select', hint: 'فقط گزینه انتخاب‌شده دیده می‌شود؛ با کلیک لیست باز می‌شود (بیش از ۱۰ گزینه → با جستجو)' },
];

export const OPTIONS_PREVIEW_KINDS: { key: keyof NodeSettingOptionsPreview; label: string }[] = [
    { key: 'icon', label: 'آیکون' },
    { key: 'audio', label: 'صدا' },
    { key: 'image', label: 'تصویر' },
    { key: 'video', label: 'ویدیو' },
];

const ALL_OPTION_PREVIEWS_ON: NodeSettingOptionsPreview = { icon: true, audio: true, image: true, video: true };

/**
 * منبع گزینه‌های select:
 *  - none     → فقط لیست ثابت گزینه‌ها
 *  - provider → optionsSource (مثلاً voices از API خود provider)
 *  - url      → urlSource (هر آدرس دلخواه)
 */
export type NodeSettingDynamicSource = 'none' | 'provider' | 'url';

export interface NodeSettingFieldForm {
    /** فقط برای key لیست در UI */
    uid: string;
    key: string;
    label: string;
    labelFa: string;
    type: NodeSettingFieldType;
    placeholder: string;
    /**
     * راهنمای کاربر — با کلیک روی آیکون علامت تعجب کنار عنوان تنظیم در chat/workflow نمایش داده می‌شود.
     * hintFa قدیمی هنگام بارگذاری در همین فیلد ادغام می‌شود (یک متن راهنما برای هر تنظیم).
     */
    helpFa: string;
    defaultText: string;
    min: string;
    max: string;
    step: string;
    optionsSource: string;
    optionsText: string; // one option per line: "value|label" (pipe; supports values like 9:16)
    optionsRows: NodeSettingFieldOption[];
    optionsDisplay: NodeSettingOptionsDisplay;
    optionsPreview: NodeSettingOptionsPreview;
    payloadPath: string;
    transform: '' | 'string' | 'number' | 'boolean' | 'lowercase' | 'uppercase';
    /** legacy = بدون علامت صریح (مسیر قدیمی adapter)؛ no = هرگز در درخواست هوش مصنوعی ارسال نشود */
    sendToProvider: 'legacy' | 'yes' | 'no';
    // فیلد ترکیبی (derived): مقدار از ترکیب مقادیر فیلدهای دیگر ساخته می‌شود
    dependsOnText: string; // کلید فیلدهای مبدأ، جدا شده با کاما (ترتیب مهم است)
    mappingRows: Array<{ values: string[]; output: string }>; // هر ردیف = یک ترکیب → مقدار نهایی
    showToUser: boolean;
    /** number/select/slider: مقدار این فیلد = تعداد خروجی یک درخواست (مثل n در GPT Image) */
    controlsOutputCount: boolean;
    dynamicSource: NodeSettingDynamicSource;
    // Dynamic options from an arbitrary URL (NodeSettingField.urlSource)
    urlSourceUrl: string;
    urlSourceMethod: 'GET' | 'POST';
    urlSourceHeaders: string; // one header per line: "Key: Value"
    urlSourceItemsPath: string;
    urlSourceValuePath: string;
    urlSourceLabelPath: string;
}

export interface NodeSettingUrlSourcePayload {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    itemsPath?: string;
    valuePath?: string;
    labelPath?: string;
}

export const NODE_FIELD_TYPES: { label: string; value: NodeSettingFieldType }[] = [
    { label: 'متن (text)', value: 'text' },
    { label: 'متن بلند (textarea)', value: 'textarea' },
    { label: 'عدد (number)', value: 'number' },
    { label: 'انتخاب (select)', value: 'select' },
    { label: 'چک‌باکس (checkbox)', value: 'checkbox' },
    { label: 'اسلایدر (slider)', value: 'slider' },
    { label: 'ترکیبی (derived)', value: 'derived' },
];

/** فیلدهایی که می‌توانند «تعداد خروجی» را کنترل کنند (مقدارشان عدد است) */
export const OUTPUT_COUNT_FIELD_TYPES: NodeSettingFieldType[] = ['number', 'select', 'slider'];

/** آیا مقدار این فیلد در درخواست هوش مصنوعی ارسال می‌شود؟ (legacy هم ارسال می‌شود) */
export function settingIsSent(field: Pick<NodeSettingFieldForm, 'sendToProvider'>): boolean {
    return field.sendToProvider !== 'no';
}

/**
 * hintFa (متن کوتاه زیر فیلد) و helpFa (پنجره‌ی راهنما) هر دو توضیح همان تنظیم برای کاربرند؛
 * در یک متن ادغام می‌شوند تا ادمین فقط یک راهنما بنویسد.
 */
export function mergeHelpText(hint?: unknown, help?: unknown): string {
    const short = String(hint ?? '').trim();
    const full = String(help ?? '').trim();
    if (!short) return full;
    if (!full || full === short) return short;
    if (full.includes(short)) return full;
    return `${short}\n\n${full}`;
}

/** کلیدهای dependsOn را از متن کاما-جدا می‌گیرد (ترتیب = ترتیب کلیدهای mapping) */
export function parseDependsOnText(text: string): string[] {
    return String(text || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}

function mappingToRows(
    mapping: Record<string, string> | undefined,
    depCount: number,
): Array<{ values: string[]; output: string }> {
    const width = Math.max(1, depCount);
    return Object.entries(mapping || {}).map(([key, output]) => {
        const values = key.split('|');
        while (values.length < width) values.push('');
        return { values: values.slice(0, width), output: String(output ?? '') };
    });
}

function rowsToMapping(rows: Array<{ values: string[]; output: string }>): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const row of rows || []) {
        const key = (row.values || []).map((value) => String(value || '').trim()).join('|');
        const output = String(row.output || '').trim();
        if (key.replace(/\|/g, '').trim() && output) mapping[key] = output;
    }
    return mapping;
}

/** حاصل‌ضرب دکارتی لیست مقادیر فیلدهای مبدأ = همه‌ی حالات ممکن */
function cartesianCombos(depValues: string[][]): string[][] {
    return depValues.reduce<string[][]>((acc, values) => {
        if (!values.length) return [];
        if (!acc.length) return values.map((value) => [value]);
        return acc.flatMap((row) => values.map((value) => [...row, value]));
    }, []);
}

/** حالات ممکن بر اساس فیلدهای مبدأ انتخاب‌شده از بین تنظیمات فعلی مدل */
export function depCombosFromSchema(schema: NodeSettingFieldForm[], dependsOnText: string): string[][] {
    const depFields = parseDependsOnText(dependsOnText)
        .map((key) => schema.find((item) => item.key === key))
        .filter((item): item is NodeSettingFieldForm => Boolean(item));
    return cartesianCombos(depFields.map((item) => parseOptionsText(item.optionsText).map((option) => option.value)));
}

/** شناسه‌ی پایدار سمت کلاینت برای key لیست (جابه‌جایی ترتیب) — به API ارسال نمی‌شود */
export function newSettingFieldUid(): string {
    return `sf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptySettingField(): NodeSettingFieldForm {
    return {
        uid: newSettingFieldUid(),
        key: '',
        label: '',
        labelFa: '',
        type: 'text',
        placeholder: '',
        helpFa: '',
        defaultText: '',
        min: '',
        max: '',
        step: '',
        optionsSource: '',
        optionsText: '',
        optionsRows: [],
        optionsDisplay: 'auto',
        optionsPreview: { ...ALL_OPTION_PREVIEWS_ON },
        payloadPath: '',
        transform: '',
        sendToProvider: 'yes',
        dependsOnText: '',
        mappingRows: [],
        showToUser: true,
        controlsOutputCount: false,
        dynamicSource: 'none',
        urlSourceUrl: '',
        urlSourceMethod: 'GET',
        urlSourceHeaders: '',
        urlSourceItemsPath: '',
        urlSourceValuePath: '',
        urlSourceLabelPath: '',
    };
}

function sanitizeHttpInput(value: unknown): string {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F​-‍﻿]/g, '')
        .trim();
}

function parseHeaderLines(text: string): Record<string, string> | null {
    const headers: Record<string, string> = {};
    String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx <= 0) return;
        const key = sanitizeHttpInput(line.slice(0, colonIdx));
        const value = sanitizeHttpInput(line.slice(colonIdx + 1));
        if (key) headers[key] = value;
    });
    return Object.keys(headers).length ? headers : null;
}

function formatHeadersToText(headers?: Record<string, string>): string {
    return Object.entries(headers || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

export function buildUrlSourcePayload(f: NodeSettingFieldForm): NodeSettingUrlSourcePayload | null {
    const url = sanitizeHttpInput(f.urlSourceUrl);
    if (!url) return null;
    const out: NodeSettingUrlSourcePayload = { url, method: f.urlSourceMethod };
    const headers = parseHeaderLines(f.urlSourceHeaders);
    if (headers) out.headers = headers;
    if (f.urlSourceItemsPath.trim()) out.itemsPath = f.urlSourceItemsPath.trim();
    if (f.urlSourceValuePath.trim()) out.valuePath = f.urlSourceValuePath.trim();
    if (f.urlSourceLabelPath.trim()) out.labelPath = f.urlSourceLabelPath.trim();
    return out;
}

export function parseOptionsText(text: string): NodeSettingFieldOption[] {
    return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
        // Prefer `|` so values like aspect ratios (9:16) stay intact.
        const pipeIdx = line.indexOf('|');
        if (pipeIdx > 0) {
            return { value: line.slice(0, pipeIdx).trim(), label: line.slice(pipeIdx + 1).trim() || line.slice(0, pipeIdx).trim() };
        }
        // Legacy fallback: first `:` only (breaks for 9:16:9:16 — migrate to pipe)
        const colonIdx = line.indexOf(':');
        if (colonIdx <= 0) return { value: line, label: line };
        return { value: line.slice(0, colonIdx).trim(), label: line.slice(colonIdx + 1).trim() };
    });
}

export function formatOptionsToText(options: NodeSettingFieldOption[]): string {
    return (options || []).map(o => `${o.value}|${o.label}`).join('\n');
}

function toOptionRows(options?: Array<{ value?: string; label?: string; iconSvg?: string; platformIconId?: string; preview?: string }>): NodeSettingFieldOption[] {
    return (options || []).map((option) => ({
        value: String(option.value || ''),
        label: String(option.label || option.value || ''),
        iconSvg: String(option.iconSvg || ''),
        platformIconId: String(option.platformIconId || ''),
        preview: String(option.preview || ''),
    }));
}

export function syncRowsFromText(text: string, prev: NodeSettingFieldOption[]): NodeSettingFieldOption[] {
    const parsed = parseOptionsText(text);
    const byValue = new Map(prev.map((row) => [row.value, row]));
    return parsed.map((item) => ({
        ...item,
        iconSvg: byValue.get(item.value)?.iconSvg || '',
        platformIconId: byValue.get(item.value)?.platformIconId || '',
        preview: byValue.get(item.value)?.preview || '',
    }));
}

export function settingFieldFromApi(f: any): NodeSettingFieldForm {
    const urlSource = f?.urlSource || {};
    const optionsSource = String(f.optionsSource || '');
    const urlSourceUrl = String(urlSource.url || '');
    return {
        uid: newSettingFieldUid(),
        key: String(f.key || ''),
        label: String(f.label || ''),
        labelFa: String(f.labelFa || ''),
        type: (f.type as NodeSettingFieldType) || 'text',
        placeholder: String(f.placeholder || ''),
        helpFa: mergeHelpText(f.hintFa, f.helpFa),
        defaultText: f.default != null ? String(f.default) : '',
        min: f.min != null ? String(f.min) : '',
        max: f.max != null ? String(f.max) : '',
        step: f.step != null ? String(f.step) : '',
        optionsSource,
        optionsText: formatOptionsToText(f.options || []),
        optionsRows: toOptionRows(f.options || []),
        optionsDisplay: OPTIONS_DISPLAY_CHOICES.some((choice) => choice.value === f.optionsDisplay)
            ? f.optionsDisplay
            : 'auto',
        optionsPreview: {
            icon: f.optionsPreview?.icon !== false,
            audio: f.optionsPreview?.audio !== false,
            image: f.optionsPreview?.image !== false,
            video: f.optionsPreview?.video !== false,
        },
        payloadPath: String(f.payloadPath || ''),
        transform: f.transform || '',
        sendToProvider: f.sendToProvider === true ? 'yes' : f.sendToProvider === false ? 'no' : 'legacy',
        dependsOnText: Array.isArray(f.dependsOn) ? f.dependsOn.join(', ') : '',
        mappingRows: mappingToRows(f.mapping, Array.isArray(f.dependsOn) ? f.dependsOn.length : 1),
        showToUser: f.showToUser !== false,
        controlsOutputCount: f.controlsOutputCount === true,
        // استودیو اول urlSource و بعد optionsSource را می‌خواند
        dynamicSource: urlSourceUrl ? 'url' : optionsSource ? 'provider' : 'none',
        urlSourceUrl,
        urlSourceMethod: urlSource.method === 'POST' ? 'POST' : 'GET',
        urlSourceHeaders: formatHeadersToText(urlSource.headers),
        urlSourceItemsPath: String(urlSource.itemsPath || ''),
        urlSourceValuePath: String(urlSource.valuePath || ''),
        urlSourceLabelPath: String(urlSource.labelPath || ''),
    };
}

export function buildSettingFieldPayload(f: NodeSettingFieldForm): any {
    const out: any = { key: f.key.trim(), label: f.label.trim(), type: f.type };
    if (f.labelFa.trim()) out.labelFa = f.labelFa.trim();
    if (f.placeholder.trim()) out.placeholder = f.placeholder.trim();
    if (f.helpFa.trim()) out.helpFa = f.helpFa.trim();
    {
        const rawDefault = f.defaultText.trim();
        if (rawDefault !== '') {
            if (f.type === 'number' || f.type === 'slider') {
                const num = Number(rawDefault);
                if (Number.isFinite(num)) out.default = num;
            } else if (f.type === 'checkbox') {
                out.default = rawDefault === 'true' || rawDefault === '1';
            } else {
                out.default = rawDefault;
            }
        }
    }
    if (f.min !== '') out.min = Number(f.min);
    if (f.max !== '') out.max = Number(f.max);
    if (f.step !== '') out.step = Number(f.step);
    if (f.dynamicSource === 'provider' && f.optionsSource.trim()) out.optionsSource = f.optionsSource.trim();
    // مسیر و تبدیل فقط وقتی معنی دارند که مقدار ارسال شود
    if (f.sendToProvider !== 'no') {
        if (f.payloadPath.trim()) out.payloadPath = f.payloadPath.trim();
        if (f.transform) out.transform = f.transform;
    }
    if (f.sendToProvider !== 'legacy') out.sendToProvider = f.sendToProvider === 'yes';
    if (f.controlsOutputCount && OUTPUT_COUNT_FIELD_TYPES.includes(f.type)) out.controlsOutputCount = true;
    if (f.type === 'derived') {
        const dependsOn = parseDependsOnText(f.dependsOnText);
        out.dependsOn = dependsOn;
        out.mapping = rowsToMapping(f.mappingRows);
        const options = (f.optionsRows || [])
            .filter((row) => row.value.trim())
            .map((row) => ({ value: row.value.trim(), label: (row.label || row.value).trim() }));
        if (options.length) out.options = options;
        if (!f.showToUser) out.showToUser = false;
        return out;
    }
    if (f.type === 'select') {
        const rows = (f.optionsRows || []).filter((row) => row.value.trim());
        if (rows.length) {
            out.options = rows.map((row) => {
                const option: NodeSettingFieldOption = {
                    value: row.value.trim(),
                    label: (row.label || row.value).trim(),
                };
                if (row.iconSvg?.trim()) option.iconSvg = row.iconSvg.trim();
                if (row.iconSvg?.trim() && row.platformIconId) option.platformIconId = row.platformIconId;
                if (row.preview?.trim()) option.preview = row.preview.trim();
                return option;
            });
        } else if (f.optionsText.trim()) {
            out.options = parseOptionsText(f.optionsText);
        }
        if (f.optionsDisplay && f.optionsDisplay !== 'auto') out.optionsDisplay = f.optionsDisplay;
        // فقط پیش‌نمایش‌های خاموش ذخیره می‌شوند؛ نبودِ کلید یعنی روشن
        const disabledPreviews = OPTIONS_PREVIEW_KINDS.filter(({ key }) => f.optionsPreview?.[key] === false);
        if (disabledPreviews.length) {
            out.optionsPreview = Object.fromEntries(disabledPreviews.map(({ key }) => [key, false]));
        }
    }
    if (f.dynamicSource === 'url') {
        const urlSource = buildUrlSourcePayload(f);
        if (urlSource) out.urlSource = urlSource;
    }
    return out;
}

const OPTION_PREVIEW_AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'];
const OPTION_PREVIEW_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp'];
const OPTION_PREVIEW_VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

export type OptionPreviewKind = 'audio' | 'image' | 'video';

/** تشخیص نوع مدیا از پسوند فایل — برای پیش‌نمایش صوت/عکس/ویدیوی گزینه‌ها */
export function optionPreviewKind(url: string): OptionPreviewKind | null {
    const clean = String(url || '').split(/[?#]/)[0].toLowerCase();
    const dot = clean.lastIndexOf('.');
    const ext = dot >= 0 ? clean.slice(dot + 1) : '';
    if (OPTION_PREVIEW_AUDIO_EXTS.includes(ext)) return 'audio';
    if (OPTION_PREVIEW_IMAGE_EXTS.includes(ext)) return 'image';
    if (OPTION_PREVIEW_VIDEO_EXTS.includes(ext)) return 'video';
    return null;
}
