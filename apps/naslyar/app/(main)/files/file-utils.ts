import type { FileManagerFile } from './files.types';

/** رنگ نشان فایل بر اساس پسوند */
export function fileBadgeColor(file: FileManagerFile): string {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico', 'heic'].includes(ext)) return '#6366f1';
    if (['pdf'].includes(ext)) return '#ef4444';
    if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return '#2563eb';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '#16a34a';
    if (['ppt', 'pptx'].includes(ext)) return '#f97316';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#eab308';
    if (['mp4', 'mov', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'm4v'].includes(ext)) return '#8b5cf6';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return '#ec4899';
    if (['txt', 'md'].includes(ext)) return '#3b82f6';
    return '#94a3b8';
}

export function relatedFileLabel(file: FileManagerFile): string {
    if (file.isThumbnail) return 'بندانگشتی';
    if (file.metadata?.role === 'chat-optimized') return 'بهینه چت';
    if (isGeneratedFile(file)) return 'تولیدشده';
    const role = file.metadata?.role;
    if (typeof role === 'string' && role) return role;
    return file.parentId ? 'مرتبط' : 'اصلی';
}

/** آیا فایل خروجی تولیدی مدل است (فقط‌خواندنی، بیرون از جدول files) */
export function isGeneratedFile(file: FileManagerFile): boolean {
    return file.metadata?.source === 'generated';
}

export function ownerLabel(file: FileManagerFile): string {
    if (file.owner?.email || file.owner?.name) return file.owner.email || file.owner.name;
    const id = file.userId ? String(file.userId) : '';
    if (!id) return '—';
    return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

/** آدرس قابل نمایش برای پیش‌نمایش (تصویر اصلی یا thumbnail) */
export function filePreviewUrl(file: FileManagerFile): string | null {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase().replace('.', '');
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'ico'];
    if (imageExts.includes(ext) || file.mimetype?.startsWith('image/')) {
        return file.path || null;
    }
    if (['mp4', 'mov', 'webm', 'm4v'].includes(ext) || file.mimetype?.startsWith('video/')) {
        const thumb = file.metadata?.thumbnailUrl;
        return typeof thumb === 'string' && thumb ? thumb : null;
    }
    return null;
}

/** آیا فایل قابل پیش‌نمایش تصویری/ویدیویی است */
export function isPreviewable(file: FileManagerFile): boolean {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase().replace('.', '');
    return (
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].includes(ext) ||
        file.mimetype?.startsWith('image/') ||
        ['mp4', 'webm', 'mov'].includes(ext) ||
        file.mimetype?.startsWith('video/') ||
        file.mimetype?.startsWith('audio/') === true
    );
}

export function fileExtLabel(file: FileManagerFile): string {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase().replace('.', '');
    const alias: Record<string, string> = {
        jpeg: 'JPG',
        jpg: 'JPG',
        png: 'PNG',
        gif: 'GIF',
        webp: 'WEBP',
        svg: 'SVG',
        pdf: 'PDF',
        doc: 'DOC',
        docx: 'DOC',
        rtf: 'DOC',
        txt: 'TXT',
        md: 'TXT',
        xls: 'XLS',
        xlsx: 'XLS',
        csv: 'CSV',
        ppt: 'PPT',
        pptx: 'PPT',
        zip: 'ZIP',
        rar: 'RAR',
        mp4: 'MP4',
        mov: 'MOV',
        webm: 'WEBM',
        mp3: 'MP3',
        wav: 'WAV',
    };
    if (!ext) return 'FILE';
    return alias[ext] || ext.slice(0, 4).toUpperCase();
}

export function fileDisplayName(file: FileManagerFile): string {
    return file.originalname || file.name || file.key?.split('/').pop() || 'بدون نام';
}
