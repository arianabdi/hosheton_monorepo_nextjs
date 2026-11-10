import type { ReactNode } from 'react';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { QaConsole } from '@/app/components/qa-testing/QaConsole';
import { DeveloperToolsHost } from '@/app/components/developer-menu';
import { ContentHeader } from './_content/ContentHeader';
import { ContentFooter } from './_content/ContentFooter';
import styles from './_content/content.module.scss';
import PageMaintenanceBoundary from '@/app/components/MaintenanceGate/PageMaintenanceBoundary';

/**
 * بلاگ و آموزش‌ها — بدون سایدبار اصلی استودیو؛ یک ستون وسط‌چین با هدر سبک خودش.
 * لینک ورود به این بخش در منوی پروفایل است (ProfileMenu).
 */
export default function ContentLayout({ children }: { children: ReactNode }) {
    return (
        <div className={`${styles.shell} ${iransansxvf.className}`} dir="rtl">
            <div className={styles.container}>
                <ContentHeader />
                <PageMaintenanceBoundary>{children}</PageMaintenanceBoundary>
                <ContentFooter />
            </div>
            <QaConsole />
            <DeveloperToolsHost />
        </div>
    );
}
