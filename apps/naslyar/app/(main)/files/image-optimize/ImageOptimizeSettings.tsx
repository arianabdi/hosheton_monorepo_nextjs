'use client';

import { useEffect, useState } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getImageOptimizeSettings, saveImageOptimizeSettings, type ImageOptimizeSettings } from './image-optimize-api';
import styles from './ImageOptimizeSettings.module.scss';

const DEFAULTS: ImageOptimizeSettings = { enabled: false, maxEdgePx: 1024, quality: 82 };

export default function ImageOptimizeSettingsPanel() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [settings, setSettings] = useState<ImageOptimizeSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        getImageOptimizeSettings(baseUrl, token)
            .then((next) => {
                if (!cancelled) setSettings({ ...DEFAULTS, ...next });
            })
            .catch((error) => ErrorToaster(error))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [baseUrl, token]);

    const save = async () => {
        if (!token) return;
        try {
            setSaving(true);
            const saved = await saveImageOptimizeSettings(baseUrl, token, settings);
            setSettings(saved);
            SuccessToaster({ message: saved.enabled ? 'بهینه‌سازی تصویر فعال شد' : 'بهینه‌سازی تصویر خاموش شد' });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className={styles.page}>
            <section className={styles.card}>
                <p className={styles.lead}>
                    وقتی این بخش روشن باشد، تصویری که کاربر در چت آپلود می‌کند و ضلع بزرگ‌ترش از حد مجاز بیشتر است،
                    یک نسخه کوچک‌تر کنار فایل اصلی ذخیره می‌شود و همان نسخه در چت به مدل داده می‌شود.
                    فایل اصلی در کتابخانه می‌ماند. برای مقایسه نتیجه، همین کلید را خاموش کنید تا چت دوباره از تصویر اصلی استفاده کند.
                </p>
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    بهینه‌سازی خودکار تصویر چت
                </label>
                <div className={styles.fields}>
                    <label className={styles.field}>
                        بیشترین ضلع (پیکسل)
                        <input
                            type="number"
                            min={256}
                            max={4096}
                            value={settings.maxEdgePx}
                            onChange={(event) => setSettings((current) => ({ ...current, maxEdgePx: Number(event.target.value) }))}
                        />
                    </label>
                    <label className={styles.field}>
                        کیفیت JPEG
                        <input
                            type="number"
                            min={40}
                            max={95}
                            value={settings.quality}
                            onChange={(event) => setSettings((current) => ({ ...current, quality: Number(event.target.value) }))}
                        />
                    </label>
                </div>
                <p className={styles.status}>
                    {settings.enabled
                        ? `تصویرهای بزرگ‌تر از ${settings.maxEdgePx} پیکسل با کیفیت ${settings.quality} کوچک می‌شوند.`
                        : 'این قابلیت خاموش است و چت همان فایل آپلودشده را استفاده می‌کند.'}
                </p>
                <div className={styles.actions}>
                    <button type="button" className={styles.primaryBtn} disabled={saving} onClick={() => void save()}>
                        {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                    </button>
                </div>
            </section>
        </div>
    );
}
