'use client'

import type { ReactNode } from 'react';
import styles from './layout.module.scss';
import AppSidebar from "@/app/components/sidebar/AppSidebar";
import {ProtectedRoute} from "@/app/components/ProtectedRoute";
import {QaConsole} from "@/app/components/qa-testing/QaConsole";
import {DeveloperToolsHost} from "@/app/components/developer-menu";
import {iransansxvf} from "@my-workspace/fonts/iransansxvf";
import PageMaintenanceBoundary from "@/app/components/MaintenanceGate/PageMaintenanceBoundary";

export default function StudioLayout({children}: { children: ReactNode }) {
    return (
        <ProtectedRoute>
            <div className={`${styles.wrapper} ${iransansxvf.className}`} style={{flexDirection: 'row'}}>
                <AppSidebar />
                <div className={styles.applicationView}>
                    <div className={styles.outlet}>
                        <PageMaintenanceBoundary>{children}</PageMaintenanceBoundary>
                    </div>
                </div>
            </div>
            <QaConsole />
            <DeveloperToolsHost />
        </ProtectedRoute>
    );
}
