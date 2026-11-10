'use client';

import { Container, Wrapper } from '@/app/(main)/layout';
import FileManager from './components/FileManager';
import styles from './Files.module.scss';

export default function FilesPage() {
    return (
        <Container>
            <Wrapper>
                <div className={styles.rtl}>
                    <header className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>مدیریت فایل</h1>
                        <p className={styles.pageSubtitle}>
                            آپلود، مرور و مدیریت فایل‌های پنل — فایل‌ها بر اساس نوع در دسته‌بندی‌ها سازمان‌دهی می‌شوند.
                        </p>
                    </header>
                    <FileManager />
                </div>
            </Wrapper>
        </Container>
    );
}
