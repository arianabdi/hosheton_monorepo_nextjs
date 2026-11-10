'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../../blog/Blog.module.scss';
import ChangelogForm from '../components/ChangelogForm';

export default function NewChangelogPage() {
    const router = useRouter();

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>نسخه جدید</h1>
                    <p className={styles.subtitle}>ثبت changelog برای نمایش در لندینگ</p>
                </div>
                <Link href="/settings/changelog" className={styles.secondaryBtn}>بازگشت</Link>
            </header>
            <ChangelogForm onSaved={() => router.push('/settings/changelog')} />
        </div>
    );
}
