'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ExploreSearchContextValue = {
    search: string;
    setSearch: (value: string) => void;
    mobileSearchOpen: boolean;
    setMobileSearchOpen: (open: boolean) => void;
};

const ExploreSearchContext = createContext<ExploreSearchContextValue | null>(null);

export function ExploreSearchProvider({ children }: { children: ReactNode }) {
    const [search, setSearch] = useState('');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const value = useMemo(
        () => ({ search, setSearch, mobileSearchOpen, setMobileSearchOpen }),
        [search, mobileSearchOpen],
    );

    return (
        <ExploreSearchContext.Provider value={value}>
            {children}
        </ExploreSearchContext.Provider>
    );
}

export function useExploreSearch() {
    return useContext(ExploreSearchContext);
}
