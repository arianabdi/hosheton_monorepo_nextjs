// hooks/useAuthGuard.ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {useAuthStore} from "@/app/zustand/store/authStore";

export function useAuthGuard(redirectTo: string = '/login') {
    const router = useRouter();
    const { token, isLoading, isVerifying } = useAuthStore();

    useEffect(() => {
        if (!isLoading && !isVerifying && !token) {
            router.push(redirectTo);
        }
    }, [token, isLoading, isVerifying, router, redirectTo]);

    return {
        isAuthenticated: !!token,
        isLoading: isLoading || isVerifying,
    };
}