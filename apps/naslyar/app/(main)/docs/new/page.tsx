'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../blog/Blog.module.scss';
import DocsForm from '../components/DocsForm';

export default function NewDocPage() {
    const router = useRouter();

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>صفحه مستندات جدید</h1>
                    <p className={styles.subtitle}>ایجاد محتوای راهنما برای بخش docs</p>
                </div>
                <Link href="/docs" className={styles.secondaryBtn}>بازگشت</Link>
            </header>
            <DocsForm onSaved={() => router.push('/docs')} />
        </div>
    );
}
