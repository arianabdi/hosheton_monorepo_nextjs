'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../../blog/Blog.module.scss';
import ChangelogForm from "@/app/(main)/settings/changelog/components/ChangelogForm";


export default function EditChangelogPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>ویرایش نسخه</h1>
                    <p className={styles.subtitle}>ویرایش changelog</p>
                </div>
                <Link href="/settings/changelog" className={styles.secondaryBtn}>بازگشت</Link>
            </header>
            <ChangelogForm changelogId={params.id} onSaved={() => router.push('/settings/changelog')} />
        </div>
    );
}
