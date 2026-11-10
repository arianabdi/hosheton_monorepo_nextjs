import { create } from 'zustand';

interface MobileShellStore {
    sidebarOpen: boolean;
    editorPanelOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    setEditorPanelOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    toggleEditorPanel: () => void;
    closeAll: () => void;
}

export const useMobileShellStore = create<MobileShellStore>((set) => ({
    sidebarOpen: false,
    editorPanelOpen: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setEditorPanelOpen: (open) => set({ editorPanelOpen: open }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen, editorPanelOpen: false })),
    toggleEditorPanel: () => set((state) => ({ editorPanelOpen: !state.editorPanelOpen, sidebarOpen: false })),
    closeAll: () => set({ sidebarOpen: false, editorPanelOpen: false }),
}));
