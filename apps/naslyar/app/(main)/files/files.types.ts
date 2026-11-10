// انواع داده ماژول مدیریت فایل

/** رکورد فایل — خروجی GET /api/file/explore */
export interface FileManagerFile {
    _id: string;
    userId?: string;
    /** اگر این فایل یک thumbnail از فایل دیگر باشد، شناسه فایل اصلی */
    parentId?: string;
    isThumbnail?: boolean;
    mimetype?: string;
    originalname?: string;
    name?: string;
    ext?: string;
    /** آدرس کامل عمومی فایل در استوریج */
    path?: string;
    key?: string;
    size?: number;
    metadata?: {
        thumbnailUrl?: string;
        thumbnailId?: string;
        [key: string]: unknown;
    };
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    /** مالک فایل (فقط در فهرست ادمین) — از دیتابیس کاربران */
    owner?: { name: string; email: string };
    /** Child files: thumbnails, chat-optimized copies, and any other parentId link. */
    related?: FileManagerFile[];
}

export type FileVariantFilter = 'all' | 'original' | 'chat-optimized' | 'thumbnail';

/** منبع فایل‌ها در پنل ادمین: همه، آپلودشده (جدول files) یا خروجی تولیدی مدل‌ها (اجراهای استودیو) */
export type FileSource = 'all' | 'uploaded' | 'generated';

/** پیشنهاد کاربر در فیلتر «کاربر» */
export interface FileOwnerOption {
    userId: string;
    name: string;
    email: string;
}

export interface FileBrowseStats {
    all: { count: number; totalSize: number };
    buckets: Record<string, { count: number; totalSize: number }>;
}

export interface FileListQuery {
    page?: number;
    limit?: number;
    q?: string;
    bucket?: string;
    userId?: string;
    /** ایمیل (یا بخشی از ایمیل) مالک */
    email?: string;
    minSize?: number;
    maxSize?: number;
    from?: string;
    to?: string;
    variant?: FileVariantFilter;
    includeRelated?: boolean;
}

/** دسته‌بندی‌های فایل — بر اساس نوع mimetype */
export type FileCategory = 'all' | 'images' | 'videos' | 'audios' | 'documents' | 'other';

export interface FileCategoryStat {
    id: FileCategory;
    label: string;
    count: number;
    totalSize: number;
}

export type FileManagerView = 'list' | 'grid';

/** حالت‌هایی که picker می‌تواند محدود کند */
export type FilePickerAccept = 'all' | 'images' | 'videos' | 'audios' | 'documents';
