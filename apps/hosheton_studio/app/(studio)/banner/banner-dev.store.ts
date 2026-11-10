import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * کلید توسعه‌دهنده برای دیدن لوکیشن بنرها روی صفحات.
 * از منوی شناور Developer فعال/غیرفعال می‌شود و انتخاب در localStorage می‌ماند.
 */
interface BannerDevState {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    toggle: () => void;
}

export const useBannerDevStore = create<BannerDevState>()(
    persist(
        (set) => ({
            enabled: false,
            setEnabled: (enabled) => set({ enabled }),
            toggle: () => set((state) => ({ enabled: !state.enabled })),
        }),
        { name: 'banner-dev-highlight' },
    ),
);
