'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../blog/Blog.module.scss';
import DocsForm from '../components/DocsForm';

export default function EditDocPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>ویرایش مستندات</h1>
                    <p className={styles.subtitle}>ویرایش محتوای صفحه راهنما</p>
                </div>
                <Link href="/docs" className={styles.secondaryBtn}>بازگشت</Link>
            </header>
            <DocsForm docId={params?.id} onSaved={() => router.push('/docs')} />
        </div>
    );
}
