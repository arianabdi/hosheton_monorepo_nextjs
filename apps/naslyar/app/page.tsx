'use client'

import {useRouter} from "next/navigation";
import {useEffect} from "react";
import {useAuthStore} from "@/app/zustand/store/authStore";

export default function Home() {

    const router = useRouter();
    const token = useAuthStore((s) => s.token);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isVerifying = useAuthStore((s) => s.isVerifying);

    useEffect(()=>{
        if (isLoading || isVerifying) return;
        router.replace(token ? '/home' : '/login')
    }, [token, isLoading, isVerifying, router])

    return null;
}
