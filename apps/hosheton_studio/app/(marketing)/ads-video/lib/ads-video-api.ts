import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import type { AdsCutElementState } from './cut-inspect';

// ────────────────────────────── Types ──────────────────────────────

export interface AdsAttachment {
    assetId?: string;
    url?: string;
    type?: 'image' | 'video' | 'audio' | 'text';
    fileId?: string;
    fileKey?: string;
    label?: string;
}

export interface AdsCutVersion {
    version: number;
    html: string;
    prompt?: string;
    modelId?: string;
    modelName?: string;
    attachments?: AdsAttachment[];
    createdAt?: string;
}

/**
 * متادیتای یک نسخه‌ی کات — بدون HTML. سند هر نسخه با getVersionHtml به‌صورت
 * on-demand خوانده می‌شود تا fetch کات با زیاد شدن نسخه‌ها سنگین نشود.
 */
export interface AdsCutVersionMeta {
    version: number;
    prompt?: string;
    modelId?: string;
    modelName?: string;
    createdAt?: string;
    /** حجم سند HTML این نسخه به بایت — برای نمایش لیست بدون دانلود سند */
    sizeBytes?: number;
}

export interface AdsCutSfx {
    sfxId: string;
    prompt: string;
    audioUrl?: string;
    fileKey?: string;
    durationSeconds?: number;
    volume?: number;
    startAt?: number;
    createdAt?: string;
}

export interface AdsVoiceover {
    text?: string;
    audioUrl?: string;
    fileKey?: string;
    durationSeconds?: number;
    voiceId?: string;
    modelId?: string;
    modelName?: string;
    provider?: string;
    createdAt?: string;
}

/** کات در حالت لیست — ورژن‌ها حذف شده و فقط HTML نسخه‌ی فعلی برگشته است */
export interface AdsCutListItem {
    _id: string;
    projectId: string;
    title: string;
    order: number;
    durationSeconds: number;
    currentVersion: number;
    versionCount: number;
    html: string;
    attachments: AdsAttachment[];
    /** اسکرین‌شات ffmpeg از نقطه‌ی شروع کات — با هر نسخه‌ی جدید دوباره گرفته و قبلی حذف می‌شود */
    thumbnailUrl?: string | null;
    /** مقادیر سفارشی‌شده‌ی المان‌های قابل‌ویرایش (window.__adsElements) */
    elementOverrides?: Record<string, unknown> | null;
    voiceover: AdsVoiceover | null;
    soundEffects: AdsCutSfx[];
    createdAt?: string;
    updatedAt?: string;
}

/** کات کامل — HTML نسخه‌ی فعلی + فقط متادیتای بقیه‌ی نسخه‌ها (بدون HTML آن‌ها) */
export interface AdsCutFull extends Omit<AdsCutListItem, 'html' | 'versionCount'> {
    html: string;
    versionCount: number;
    versions: AdsCutVersionMeta[];
}

export interface AdsExportJob {
    jobId: string;
    status: 'queued' | 'rendering' | 'completed' | 'failed';
    resolution: string;
    fps: number;
    includeVoiceover: boolean;
    includeSfx: boolean;
    progress?: string;
    videoUrl?: string;
    fileKey?: string;
    durationSeconds?: number;
    error?: string;
    createdAt?: string;
    completedAt?: string;
}

/** یک آیتم مدیا در برند کیت — فایل/منبعی که در تولید ویدیو مجاز به استفاده است */
export interface AdsBrandMedia {
    id: string;
    title: string;
    type: 'sfx' | 'music' | 'image' | 'video' | 'font';
    url?: string;
    note?: string;
}

/** یادداشت متنی عنوان‌دار برند کیت — راهنمای صداگذاری، سبک افکت‌ها و… */
export interface AdsBrandNote {
    id: string;
    title: string;
    body: string;
}

export interface AdsProject {
    _id: string;
    title: string;
    description?: string;
    aspectRatio: string;
    fps: number;
    defaultModel?: { providerId?: string; modelId?: string; modelName?: string } | null;
    /** برند کیت — توکن‌های طراحی که در پرامپت همه‌ی تولیدها تزریق می‌شود */
    brandKit?: {
        palette?: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string };
        fontFamily?: string;
        logoUrl?: string;
        tone?: string;
        /** پیام‌رسانی برند — شعار، فراخوان پایانی، مخاطب هدف و ممنوعیت‌ها */
        tagline?: string;
        ctaText?: string;
        audience?: string;
        avoid?: string;
        /** مدیای مجاز تولید — افکت صوتی، موسیقی، تصویر، ویدیو، فونت */
        media?: AdsBrandMedia[];
        /** یادداشت‌های متنی عنوان‌دار — دستورالعمل‌های آزاد برای AI */
        notes?: AdsBrandNote[];
    } | null;
    cutCount?: number;
    exports?: AdsExportJob[];
    createdAt?: string;
    updatedAt?: string;
}

export interface AdsTemplate {
    _id: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    durationSeconds: number;
    aspectRatio?: string;
    thumbnailUrl?: string;
    usageCount: number;
    createdAt?: string;
}

export interface AdsVoiceItem {
    voiceId: string;
    name: string;
}

/** یک ردیف چک‌لیست زنده‌ی job — یک کات و وضعیت ساختش */
export interface AdsAutoJobStep {
    title: string;
    durationSeconds?: number;
    status: 'pending' | 'generating' | 'sound' | 'done' | 'failed';
    cutId?: string;
    error?: string;
    startedAt?: string;
    finishedAt?: string;
}

/** اجرای «ساخت خودکار ویدیو» — استوری‌بورد توسط AI چیده و کات‌ها پشت‌سرهم ساخته می‌شوند */
export interface AdsAutoJob {
    jobId: string;
    /** video = ساخت خودکار ویدیو | bulk = اعمال یک ویرایش روی همه‌ی کات‌ها */
    kind?: string;
    status: 'planning' | 'generating' | 'completed' | 'failed';
    prompt?: string;
    totalCuts: number;
    generatedCuts: number;
    cutIds: string[];
    /** چک‌لیست کات‌ها — بعد از برنامه‌ریزی (ساخت خودکار) یا از ابتدا (ویرایش گروهی) */
    steps?: AdsAutoJobStep[];
    errors: string[];
    error?: string;
    createdAt?: string;
    completedAt?: string;
}

const BASE = '/api/studio/ads-video';

/** خلاصه‌ی یک المان قابل‌ویرایش کات — از iframe خوانده و به AI فرستاده می‌شود */
export interface AdsElementSummary {
    id: string;
    label?: string;
    type?: 'text' | 'color' | 'number' | 'image' | string;
    value?: unknown;
}

/** یک تغییر پیشنهادی AI روی المان‌ها */
export interface AdsElementChange {
    id: string;
    value: unknown;
}

export interface AdsElementPlanResult {
    summary: string;
    changes: AdsElementChange[];
}

// ────────────────────────────── API ──────────────────────────────

export const adsVideoApi = {
    // Projects
    async listProjects(): Promise<{ projects: AdsProject[] }> {
        const res = await createApiClient().get(`${BASE}/projects`);
        return unwrapApiData(res);
    },

    async createProject(body: { title?: string; description?: string; aspectRatio?: string; fps?: number }): Promise<{ project: AdsProject }> {
        const res = await createApiClient().post(`${BASE}/projects`, body);
        return unwrapApiData(res);
    },

    async getProject(projectId: string): Promise<{ project: AdsProject; cuts: AdsCutListItem[] }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}`);
        return unwrapApiData(res);
    },

    async updateProject(projectId: string, body: Partial<{ title: string; description: string; aspectRatio: string; fps: number; defaultModel: Record<string, unknown>; brandKit: Record<string, unknown> | null }>): Promise<{ project: AdsProject }> {
        const res = await createApiClient().patch(`${BASE}/projects/${projectId}`, body);
        return unwrapApiData(res);
    },

    async deleteProject(projectId: string): Promise<{ deleted: boolean }> {
        const res = await createApiClient().delete(`${BASE}/projects/${projectId}`);
        return unwrapApiData(res);
    },

    // Cuts
    async createCut(projectId: string, body: { title?: string; durationSeconds?: number; templateId?: string; prompt?: string; modelId?: string; attachments?: AdsAttachment[]; withSound?: boolean }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/cuts`, body, { timeout: 240_000 });
        return unwrapApiData(res);
    },

    async getCut(cutId: string): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().get(`${BASE}/cuts/${cutId}`);
        return unwrapApiData(res);
    },

    /** سند HTML یک نسخه‌ی مشخص — برای switch بین نسخه‌ها بدون دانلود همه‌ی نسخه‌ها */
    async getVersionHtml(cutId: string, version: number): Promise<{ version: number; html: string; prompt?: string }> {
        const res = await createApiClient().get(`${BASE}/cuts/${cutId}/versions/${version}`);
        return unwrapApiData(res);
    },

    async updateCut(cutId: string, body: { title?: string; order?: number; durationSeconds?: number; elementOverrides?: Record<string, unknown> }): Promise<{ cut: AdsCutListItem }> {
        const res = await createApiClient().patch(`${BASE}/cuts/${cutId}`, body);
        return unwrapApiData(res);
    },

    async deleteCut(cutId: string): Promise<{ deleted: boolean }> {
        const res = await createApiClient().delete(`${BASE}/cuts/${cutId}`);
        return unwrapApiData(res);
    },

    /** تکثیر یک کات (HTML فعلی + overrides) — در انتهای استوری‌بورد اضافه می‌شود */
    async duplicateCut(cutId: string): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/duplicate`);
        return unwrapApiData(res);
    },

    /**
     * ویرایش سریع المان‌ها با AI — بدون بازتولید HTML. خروجی فقط «پیشنهاد
     * تغییر» است؛ اعمال نهایی با تأیید کاربر از طریق updateCut انجام می‌شود.
     */
    async patchCutElements(cutId: string, body: { prompt: string; modelId?: string; elements: AdsElementSummary[] }): Promise<AdsElementPlanResult> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/patch-elements`, body, { timeout: 120_000 });
        return unwrapApiData(res);
    },

    /**
     * تولید/ویرایش یک کات با AI — ممکن است تا چند دقیقه طول بکشد.
     * elementStates: اسنپ‌شات زنده‌ی المان‌ها/موشن‌ها از iframe پیش‌نمایش —
     * در حالت ویرایش به مدل داده می‌شود تا دقیقاً بداند چه چیزی را ویرایش می‌کند.
     */
    async generateCut(cutId: string, body: {
        prompt: string;
        modelId?: string;
        attachments?: AdsAttachment[];
        /** 0 = خودکار — مدل خودش طول مناسب را انتخاب و اعلام می‌کند */
        durationSeconds?: number;
        elementStates?: AdsCutElementState[];
        withSound?: boolean;
    }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/generate`, body, { timeout: 240_000 });
        return unwrapApiData(res);
    },

    async saveCutVersion(cutId: string, body: { html: string; prompt?: string }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/versions`, body);
        return unwrapApiData(res);
    },

    async activateVersion(cutId: string, version: number): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().put(`${BASE}/cuts/${cutId}/activate`, { version });
        return unwrapApiData(res);
    },

    // Template cuts
    async listTemplates(): Promise<{ templates: AdsTemplate[] }> {
        const res = await createApiClient().get(`${BASE}/templates`);
        return unwrapApiData(res);
    },

    async createTemplate(cutId: string, body: { name: string; description?: string; category?: string; tags?: string[]; thumbnailUrl?: string }): Promise<{ template: AdsTemplate }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/template`, body);
        return unwrapApiData(res);
    },

    async deleteTemplate(templateId: string): Promise<{ deleted: boolean }> {
        const res = await createApiClient().delete(`${BASE}/templates/${templateId}`);
        return unwrapApiData(res);
    },

    // Voiceover & SFX
    async listVoices(modelId?: string): Promise<{ voices: AdsVoiceItem[]; provider: string }> {
        const res = await createApiClient().get(`${BASE}/voiceover/voices`, { params: modelId ? { modelId } : {} });
        return unwrapApiData(res);
    },

    async generateVoiceover(cutId: string, body: { text?: string; autoWrite?: boolean; modelId?: string; textModelId?: string; voiceId?: string; voiceSettings?: Record<string, unknown> }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/voiceover`, body, { timeout: 180_000 });
        return unwrapApiData(res);
    },

    async deleteVoiceover(cutId: string): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().delete(`${BASE}/cuts/${cutId}/voiceover`);
        return unwrapApiData(res);
    },

    async generateSfx(cutId: string, body: { prompt: string; modelId?: string; durationSeconds?: number; volume?: number; startAt?: number }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().post(`${BASE}/cuts/${cutId}/sfx`, body, { timeout: 180_000 });
        return unwrapApiData(res);
    },

    async updateSfx(cutId: string, sfxId: string, body: { volume?: number; startAt?: number }): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().patch(`${BASE}/cuts/${cutId}/sfx/${sfxId}`, body);
        return unwrapApiData(res);
    },

    async deleteSfx(cutId: string, sfxId: string): Promise<{ cut: AdsCutFull }> {
        const res = await createApiClient().delete(`${BASE}/cuts/${cutId}/sfx/${sfxId}`);
        return unwrapApiData(res);
    },

    // Auto video — یک پرامپت → کل ویدیو
    async startAutoVideo(projectId: string, body: { prompt: string; modelId?: string; attachments?: AdsAttachment[]; cutsCount?: number; withSound?: boolean }): Promise<{ job: AdsAutoJob }> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/auto`, body, { timeout: 60_000 });
        return unwrapApiData(res);
    },

    async listAutoJobs(projectId: string): Promise<{ jobs: AdsAutoJob[] }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/auto`);
        return unwrapApiData(res);
    },

    /** اعمال یک ویرایش روی همه‌ی کات‌های پروژه — پس‌زمینه، فونت، رنگ، صدا و… */
    async startBulkEdit(projectId: string, body: { prompt: string; modelId?: string; withSound?: boolean }): Promise<{ job: AdsAutoJob }> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/bulk-edit`, body, { timeout: 60_000 });
        return unwrapApiData(res);
    },

    // Export
    async startExport(projectId: string, body: { resolution?: string; fps?: number; includeVoiceover?: boolean; includeSfx?: boolean }): Promise<{ export: AdsExportJob }> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/export`, body);
        return unwrapApiData(res);
    },

    async listExports(projectId: string): Promise<{ exports: AdsExportJob[] }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/exports`);
        return unwrapApiData(res);
    },
};
