// components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import {useAuthStore} from "@/app/zustand/store/authStore";
import {AuthLoadingScreen} from "@/app/components/AuthLoadingScreen";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const initializeAuth = useAuthStore((state) => state.initializeAuth);
    const isLoading = useAuthStore((state) => state.isLoading);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    // Show loading state while verifying token
    if (isLoading) {
        return <AuthLoadingScreen/>;
    }

    return <>{children}</>;
}