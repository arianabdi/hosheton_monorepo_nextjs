'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import CastPersonForm from '../../cast/components/CastPersonForm';
import styles from '../../films/FilmsList.module.scss';

export default function EditDirectorPage() {
    const { id } = useParams();

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>ویرایش کارگردان</h1>
                        <p className={styles.subtitle}>اطلاعات کارگردان را به‌روزرسانی کنید.</p>
                    </div>
                    <Link href="/directors" className={styles.btnEdit}>
                        بازگشت به لیست
                    </Link>
                </div>
                <CastPersonForm type="directors" personId={id as string} />
            </Wrapper>
        </Container>
    );
}
