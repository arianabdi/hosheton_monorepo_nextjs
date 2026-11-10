/**
 * «فایل‌های ورودی» مدل متنی (LLM) — همان کاتالوگ API
 * (`my-workspace-api/apps/hosheton_studio/src/(studio)/media/utils/chat-file-text.util.ts`).
 *
 * هر مدل زبانی متن می‌فهمد: سرور استودیو فایل را به متن تبدیل می‌کند (PDF، Word، Excel، اسلاید، کد…) و همراه پیام
 * به مدل می‌فرستد؛ پس این‌جا فقط تعیین می‌شود کاربر برای این مدل چه قالب‌هایی را می‌تواند پیوست کند.
 * عکس جداست: ورودی تصویر مدل‌های vision از route مدل (imageCount) می‌آید.
 */
export type ModelFileInputsForm = {
    enabled: boolean;
    formats: string[];
    maxFiles: number | '';
    maxFileMb: number | '';
};

export type FileFormatGroup = {
    id: string;
    title: string;
    hint: string;
    formats: string[];
};

export const FILE_FORMAT_GROUPS: FileFormatGroup[] = [
    { id: 'documents', title: 'اسناد', hint: 'PDF، Word، متن ساده، RTF، Markdown، OpenDocument', formats: ['pdf', 'docx', 'txt', 'rtf', 'md', 'odt'] },
    { id: 'data', title: 'جدول و داده', hint: 'Excel، CSV/TSV، OpenDocument Spreadsheet، JSON، XML، YAML', formats: ['xlsx', 'xls', 'csv', 'tsv', 'ods', 'json', 'jsonl', 'xml', 'yaml', 'yml'] },
    { id: 'presentations', title: 'ارائه', hint: 'PowerPoint و OpenDocument Presentation (متن اسلایدها و یادداشت‌ها)', formats: ['pptx', 'odp'] },
    { id: 'web', title: 'صفحات وب', hint: 'HTML، CSS، JavaScript — خام، برای بررسی کد', formats: ['html', 'htm', 'css', 'js'] },
    { id: 'code', title: 'برنامه‌نویسی', hint: 'Python، Java، C/C++، C#، PHP، TypeScript، SQL، Shell، PowerShell، Batch و…', formats: ['py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'ts', 'tsx', 'jsx', 'go', 'rb', 'rs', 'kt', 'swift', 'sql', 'sh', 'ps1', 'bat'] },
    { id: 'subtitles', title: 'زیرنویس و زمان‌بندی', hint: 'SRT، VTT، ASS', formats: ['srt', 'vtt', 'ass'] },
    { id: 'config', title: 'تنظیمات و پیکربندی', hint: 'INI، CONF، ENV، TOML، تقویم/مخاطب (ICS/VCF)، لاگ', formats: ['ini', 'conf', 'env', 'toml', 'ics', 'vcf', 'log'] },
    { id: 'ebook', title: 'کتاب الکترونیکی', hint: 'EPUB', formats: ['epub'] },
];

export const ALL_FILE_FORMATS = FILE_FORMAT_GROUPS.flatMap((group) => group.formats);

/** قالب‌هایی که پشتیبانی نمی‌شوند و چرا — فقط برای راهنمای ادمین */
export const UNSUPPORTED_FILE_NOTE = 'doc/ppt قدیمی (باینری) و zip پشتیبانی نمی‌شوند: کاربر باید docx/pptx بفرستد. PDF اسکن‌شده (بدون متن) هم خوانده نمی‌شود — عکس صفحه‌ها را به مدل vision بدهید.';

export function emptyFileInputs(): ModelFileInputsForm {
    return { enabled: false, formats: [], maxFiles: 5, maxFileMb: 20 };
}

export function fileInputsFromApi(raw: unknown): ModelFileInputsForm {
    if (!raw || typeof raw !== 'object') return emptyFileInputs();
    const value = raw as { enabled?: boolean; formats?: unknown; maxFiles?: unknown; maxFileMb?: unknown };
    const allowed = new Set(ALL_FILE_FORMATS);
    return {
        enabled: value.enabled === true,
        formats: (Array.isArray(value.formats) ? value.formats : [])
            .map((item) => String(item || '').toLowerCase())
            .filter((item) => allowed.has(item)),
        maxFiles: Number(value.maxFiles) > 0 ? Number(value.maxFiles) : 5,
        maxFileMb: Number(value.maxFileMb) > 0 ? Number(value.maxFileMb) : 20,
    };
}

export function buildFileInputsPayload(form: ModelFileInputsForm) {
    return {
        enabled: form.enabled,
        formats: form.formats,
        maxFiles: Number(form.maxFiles) > 0 ? Number(form.maxFiles) : 5,
        maxFileMb: Number(form.maxFileMb) > 0 ? Number(form.maxFileMb) : 20,
    };
}
