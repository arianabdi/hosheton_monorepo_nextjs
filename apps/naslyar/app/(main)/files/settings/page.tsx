'use client';

import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { resolveAppVariant } from '@/app/config/navigation-utils';
import ImageOptimizeSettingsPanel from '../image-optimize/ImageOptimizeSettings';
import StorageSettingsPanel from '../storage/StorageSettingsPanel';
import StorageFlowGuide from '../storage/StorageFlowGuide';
import styles from '../Files.module.scss';

export default function FileSettingsPage() {
    const { appName, appVariant, baseUrl } = useAppStore();
    // image generation flow + chat image optimizer exist only in the studio API;
    // every other app (blogger, …) gets the shared storage settings only
    const isStudio = resolveAppVariant(appVariant, baseUrl, appName) === 'hosheton_studio';

    return (
        <Container>
            <Wrapper>
                <div className={styles.rtl}>
                    <header className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>تنظیمات</h1>
                        <p className={styles.pageSubtitle}>
                            {isStudio
                                ? 'استوریج محل ذخیرهٔ فایل‌ها و بهینه‌سازی اندازه تصویرهایی که از چت وارد مدل می‌شوند.'
                                : 'استوریج محل ذخیرهٔ فایل‌های این اپ، استوریج‌های قبلی و بک‌آپ فایل‌ها.'}
                        </p>
                    </header>
                    {isStudio ? <StorageFlowGuide /> : null}
                    <StorageSettingsPanel />
                    {isStudio ? <ImageOptimizeSettingsPanel /> : null}
                </div>
            </Wrapper>
        </Container>
    );
}
