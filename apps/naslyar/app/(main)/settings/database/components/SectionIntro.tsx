'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LuBookOpen } from 'react-icons/lu';
import styles from '../Database.module.scss';

/** معرفی کوتاه بالای هر تب (مثل سایت‌مپ) + لینک به همان بخش در راهنمای کامل */
export default function SectionIntro({ topic, children }: { topic: string; children: ReactNode }) {
    return (
        <div className={styles.sectionIntro}>
            <p>{children}</p>
            <Link href={`/settings/database/docs#${topic}`} className={styles.introLink}>
                <LuBookOpen /> آموزش این بخش
            </Link>
        </div>
    );
}
