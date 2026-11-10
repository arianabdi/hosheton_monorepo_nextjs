'use client';

import { create } from 'zustand';
import type { MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';

type ExploreDetailState = {
    /** Last template the user clicked in the grid — lets the detail route render instantly. */
    selectedItem: MarketplaceTemplateItem | null;
    setSelectedItem: (item: MarketplaceTemplateItem | null) => void;
    /** List URL the detail was opened from (/explore or a category landing) — closing returns here. */
    returnPath: string | null;
    setReturnPath: (path: string | null) => void;
};

export const useExploreDetailStore = create<ExploreDetailState>((set) => ({
    selectedItem: null,
    setSelectedItem: (item) => set({ selectedItem: item }),
    returnPath: null,
    setReturnPath: (path) => set({ returnPath: path }),
}));
