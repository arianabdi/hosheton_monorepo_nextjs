'use client';

import Link from 'next/link';
import { Container, Wrapper } from '@/app/(main)/layout';

import styles from '../../films/FilmsList.module.scss';
import CastPersonForm from "@/app/(main)/(lingeeko)/cast/components/CastPersonForm";

export default function NewActorPage() {
    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>افزودن بازیگر جدید</h1>
                        <p className={styles.subtitle}>اطلاعات بازیگر را وارد کنید تا در بانک مرکزی ذخیره شود.</p>
                    </div>
                    <Link href="/actors" className={styles.btnEdit}>
                        بازگشت به لیست
                    </Link>
                </div>
                <CastPersonForm type="actors" />
            </Wrapper>
        </Container>
    );
}
