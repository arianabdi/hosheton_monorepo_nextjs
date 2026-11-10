'use client'

import styles from './layout.module.scss';
import PageTransition from "@/app/components/PageTransition";
import Sidebar from "@/app/components/sidebar";
import {AppHeader} from "@/app/components/AppHeader";
import UploadQueueProvider from "@/app/(main)/components/UploadQueueProvider/UploadQueueProvider";
export const dynamic = 'force-dynamic';
import { iransansxvf } from "@my-workspace/fonts/iransansxvf";
import {ProtectedRoute} from "@/app/components/ProtectedRoute";
import { useFilteredNavItems } from '@/app/hooks/useFilteredNavItems';
import { useRequirePermission } from '@/app/hooks/useRequirePermission';

function MainShell({ children }: { children: React.ReactNode }) {
    const filteredNavItems = useFilteredNavItems();
    useRequirePermission();

    return (
        <div className={`${styles.container} ${iransansxvf.className}`}>
            <div className={styles.shell}>
                <Sidebar isRTL={true} navItems={filteredNavItems} />
                <div className={styles.contentColumn}>
                    <AppHeader />
                    <main className={styles.outlet}>
                        <PageTransition>{children}</PageTransition>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <UploadQueueProvider>
                <MainShell>{children}</MainShell>
            </UploadQueueProvider>
        </ProtectedRoute>
    );
}


export function Container({...props}) {
    return (
        <div {...props} className={`${styles.pageContainer} ${props.className || ''}`}>
            {props.children}
        </div>
    )
}

export function Wrapper({...props}) {
    return (
        <div {...props} className={`${styles.wrapper} ${props.className || ''}`}>
            {props.children}
        </div>
    )
}

export function FormCard({...props}) {
    return (
        <div {...props} className={`${styles.formCard} ${props.className || ''}`}>
            {props.children}
        </div>
    )
}
