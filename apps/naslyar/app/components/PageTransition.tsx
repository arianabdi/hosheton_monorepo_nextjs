// app/components/PageTransition.js
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, type ReactNode} from "react";
import {pageTransitionKey} from '@/app/config/page-shells';

export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter()

    useEffect(() => {
        // این کار باعث می‌شود هر بار که کامپوننت لود شد (حتی از کش)،
        // یک بار دیتای تازه از سرور گرفته شود
        router.refresh()
    }, [])
    return (
        <AnimatePresence mode="wait">
            <motion.div
                // ماژول‌های تب‌دار (config/page-shells) یک کلید دارند تا layout تب‌ها ری‌مانت نشود
                key={pageTransitionKey(pathname)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}