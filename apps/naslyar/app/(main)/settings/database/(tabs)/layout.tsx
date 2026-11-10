'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LuDatabaseBackup, LuHistory, LuLoaderCircle } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useDatabase } from '../lib/DatabaseProvider';
import BackupNowDialog from '../components/BackupNowDialog';
import RestoreDialog from '../components/RestoreDialog';
import UndoDialog from '../components/UndoDialog';
import HealthLine from '../components/HealthLine';
import JobLine from '../components/JobLine';
import styles from '../Database.module.scss';

type PageHead = { title: string; subtitle: string; restore: boolean };

/** each page of the «دیتابیس» menu has its own header (the sidebar replaces the old tabs) */
const PAGES: Record<string, PageHead> = {
    '/settings/database': {
        title: 'داده‌ها',
        subtitle: 'مجموعه‌ها و سندهای دیتابیس را ببینید، جستجو کنید و در صورت نیاز تغییر دهید.',
        restore: false,
    },
    '/settings/database/backups': {
        title: 'بک‌آپ',
        subtitle: 'از داده‌ها بک‌آپ بگیرید و هر وقت مشکلی پیش آمد، با یک کلیک برگردانید.',
        restore: true,
    },
    '/settings/database/jobs': {
        title: 'لاگ‌ها',
        subtitle: 'سابقهٔ کامل هر بک‌آپ‌گیری و بازگردانی: کی، توسط چه کسی، چقدر طول کشید و چه شد.',
        restore: true,
    },
};

/**
 * Shared shell of the «دیتابیس» pages: status line, running job and dialogs stay mounted while only
 * the page content changes (PageTransition treats this subtree as one key — config/page-shells).
 */
export default function DatabaseTabsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const head = PAGES[pathname.replace(/\/$/, '')] || PAGES['/settings/database'];
    const { overview, job, jobRunning, openBackupNow, openRestore } = useDatabase();
    const toolsOk = !!overview?.tools.mongodump.ok && !!overview?.tools.mongorestore.ok;
    const blockedReason = !overview
        ? 'در حال بررسی…'
        : !toolsOk
          ? 'ابزار بک‌آپ روی سرور نصب نیست'
          : jobRunning
            ? 'تا پایان کار فعلی صبر کنید'
            : undefined;

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>{head.title}</h1>
                            <p className={styles.subtitle}>{head.subtitle}</p>
                        </div>
                        <div className={styles.headerActions}>
                            {head.restore && (
                                <button type="button" className={styles.secondaryBtn} onClick={() => openRestore()} disabled={!!blockedReason} title={blockedReason}>
                                    <LuHistory /> بازگردانی
                                </button>
                            )}
                            <button
                                type="button"
                                className={head.restore ? styles.primaryBtn : styles.secondaryBtn}
                                onClick={openBackupNow}
                                disabled={!!blockedReason}
                                title={blockedReason || (head.restore ? undefined : 'قبل از تغییر داده‌ها یک بک‌آپ بگیرید')}
                            >
                                {jobRunning && job?.op === 'dump' ? <LuLoaderCircle className={styles.spin} /> : <LuDatabaseBackup />}
                                {jobRunning && job?.op === 'dump' ? 'در حال بک‌آپ‌گیری…' : 'بک‌آپ‌گیری الان'}
                            </button>
                        </div>
                    </header>

                    <HealthLine />
                    <JobLine />

                    <div className={styles.outlet}>{children}</div>

                    <BackupNowDialog />
                    <RestoreDialog />
                    <UndoDialog />
                </div>
            </Wrapper>
        </Container>
    );
}
