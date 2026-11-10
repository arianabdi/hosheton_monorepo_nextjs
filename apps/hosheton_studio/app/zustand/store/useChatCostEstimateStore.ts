'use client';

import { create } from 'zustand';

interface ChatCostEstimateState {
    /** آیکون تخمین هزینه کنار کادر چت نمایش داده شود یا نه */
    buttonEnabled: boolean;
    toggleChatCostEstimate: () => void;
}

/**
 * منوی شناور developer فقط آیکون تخمین هزینه چت را روشن/خاموش می‌کند.
 * هیچ درخواستی زده نمی‌شود تا وقتی popup آیکون باز شود؛ بعد از رفرش هم خاموش است.
 */
export const useChatCostEstimateStore = create<ChatCostEstimateState>((set) => ({
    buttonEnabled: false,
    toggleChatCostEstimate: () => set((state) => ({ buttonEnabled: !state.buttonEnabled })),
}));
