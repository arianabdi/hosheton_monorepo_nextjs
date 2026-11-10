import { create } from 'zustand';

/**
 * همگام‌سازی استودیو تبلیغات (ads-2video) با چتِ ساکن در layout گروه (marketing):
 * صفحه و چت هر دو پروژه‌ی فعال را از اینجا می‌خوانند — صفحه با تعویض پروژه
 * اینجا می‌نویسد، چت بعد از هر تولید با notifyProjectChanged صفحه را برای
 * رفرش خبر می‌کند و با requestCut درخواست پرش به کات تازه را می‌دهد.
 */
type AdsCutRequest = { cutId: string; seq: number };

type AdsStudioSyncState = {
    /** پروژه‌ی فعال — null یعنی هنوز پروژه‌ای انتخاب نشده (حالت دمو) */
    activeProjectId: string | null;
    /** کات انتخابی صفحه — هدف ویرایشِ چت */
    activeCutId: string | null;
    /** شمارنده‌ی تغییرهای پروژه/کات‌ها — صفحه با شنیدن آن رفرش می‌کند */
    changeSeq: number;
    cutRequest: AdsCutRequest | null;
    setActiveProject(projectId: string | null): void;
    setActiveCut(cutId: string | null): void;
    notifyProjectChanged(): void;
    requestCut(cutId: string): void;
    clearCutRequest(): void;
};

export const useAdsStudioSyncStore = create<AdsStudioSyncState>((set, get) => ({
    activeProjectId: null,
    activeCutId: null,
    changeSeq: 0,
    cutRequest: null,
    setActiveProject: (projectId) => {
        if (get().activeProjectId !== projectId) set({ activeProjectId: projectId });
    },
    setActiveCut: (cutId) => {
        if (get().activeCutId !== cutId) set({ activeCutId: cutId });
    },
    notifyProjectChanged: () => set((state) => ({ changeSeq: state.changeSeq + 1 })),
    requestCut: (cutId) => set((state) => ({
        cutRequest: { cutId, seq: (state.cutRequest?.seq || 0) + 1 },
    })),
    clearCutRequest: () => {
        if (get().cutRequest) set({ cutRequest: null });
    },
}));
