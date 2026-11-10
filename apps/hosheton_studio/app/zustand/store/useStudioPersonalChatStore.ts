import { create } from 'zustand';

type StudioPersonalChatStore = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
    /**
     * گرید explore جا برای پنل چت باز کرده (فقط دسکتاپ). عمداً جدا از `open` و با تأخیر
     * عوض می‌شود تا چیدمان سنگین گرید هم‌زمان با انیمیشن کشویی پنل اجرا نشود.
     */
    docked: boolean;
    setDocked: (docked: boolean) => void;
    /** نمای تاریخچه‌ی چت در سایدبار استودیو تبلیغات — جایگزین نمای چت می‌شود */
    historyOpen: boolean;
    setHistoryOpen: (open: boolean) => void;
    toggleHistory: () => void;
};

export const useStudioPersonalChatStore = create<StudioPersonalChatStore>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
    docked: false,
    setDocked: (docked) => set({ docked }),
    historyOpen: false,
    setHistoryOpen: (open) => set({ historyOpen: open }),
    toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
}));
