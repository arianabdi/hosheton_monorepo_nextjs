// components/withAuth.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {useAuthStore} from "@/app/zustand/store/authStore";

export function WithAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    redirectTo: string = '/explore'
) {
    return function WithAuthComponent(props: P) {
        const router = useRouter();
        const { token, isLoading, isVerifying } = useAuthStore();

        useEffect(() => {
            if (!isLoading && !isVerifying && !token) {
                router.push(redirectTo);
            }
        }, [token, isLoading, isVerifying, router]);

        if (isLoading || isVerifying) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        return token ? <WrappedComponent {...props} /> : null;
    };
}