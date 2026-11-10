// components/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {useAuthStore} from "@/app/zustand/store/authStore";


interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export function ProtectedRoute({
   children,
   redirectTo = '/login'
}: ProtectedRouteProps) {
    const router = useRouter();
    const { token, isLoading, isVerifying } = useAuthStore();

    useEffect(() => {
        // Wait for verification to complete
        if (!isLoading && !isVerifying && !token) {
            router.push(redirectTo);
        }
    }, [token, isLoading, isVerifying, router, redirectTo]);

    // Show loading while verifying
    if (isLoading || isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Only render children if authenticated
    return token ? <>{children}</> : null;
}