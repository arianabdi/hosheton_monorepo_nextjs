'use client';

import { useEffect, useState } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import styles from './OpsSettings.module.scss';
import chatStyles from './ChatSettings.module.scss';

/** همان کلید عمومی که استودیو می‌خواند (system-setting → public/studio.chat) */
const STUDIO_CHAT_KEY = 'studio.chat';

type StudioChatSetting = { catEnabled?: boolean };

const META = {
    group: 'studio',
    label: 'تنظیمات چت استودیو',
    description: 'ظاهر چت استودیو؛ مثلاً روشن/خاموش بودن گربهٔ روی چت‌باکس',
};

function normalize(payload: unknown): StudioChatSetting {
    return payload && typeof payload === 'object' ? (payload as StudioChatSetting) : {};
}

/** تب «چت» در تنظیمات هوش مصنوعی */
export default function ChatSettings() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [setting, setSetting] = useState<StudioChatSetting>({});

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        loadSetting<StudioChatSetting>(baseUrl, token, STUDIO_CHAT_KEY, META, { catEnabled: true }, normalize)
            .then(({ value }) => {
                if (!cancelled) setSetting(value);
            })
            .catch(ErrorToaster)
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [baseUrl, token]);

    // نبودِ مقدار یعنی روشن (پیش‌فرض استودیو)
    const catEnabled = setting.catEnabled !== false;

    const toggleCat = async () => {
        if (!token || saving) return;
        const previous = setting;
        const next = { ...setting, catEnabled: !catEnabled };
        setSetting(next);
        setSaving(true);
        try {
            await saveSetting(baseUrl, token, STUDIO_CHAT_KEY, next);
            SuccessToaster({ message: next.catEnabled ? 'گربهٔ چت روشن شد' : 'گربهٔ چت خاموش شد' });
        } catch (err) {
            setSetting(previous);
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className={styles.loading}>در حال بارگذاری...</p>;

    return (
        <div className={styles.grid}>
            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>گربهٔ روی چت‌باکس</h2>
                    <p className={styles.cardDesc}>
                        یک گربهٔ متحرک که هر چند وقت یک بار روی لبهٔ بالای چت‌باکس استودیو می‌آید: راه می‌رود،
                        می‌خوابد، با توپ بازی می‌کند یا ماوس را دنبال می‌کند و بعد می‌رود. فقط تزئینی است و روی
                        تایپ و ارسال پیام اثری ندارد.
                    </p>
                </div>

                <div className={chatStyles.switchRow}>
                    <span className={chatStyles.switchMeta}>
                        <span id="catEnabledLabel" className={chatStyles.switchLabel}>
                            نمایش گربه روی چت
                        </span>
                        <span className={chatStyles.switchHint}>
                            {catEnabled
                                ? 'روشن است: گربه برای همهٔ کاربران استودیو در صفحهٔ چت ظاهر می‌شود.'
                                : 'خاموش است: گربه برای هیچ کاربری نمایش داده نمی‌شود.'}
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={catEnabled}
                        aria-labelledby="catEnabledLabel"
                        disabled={saving}
                        onClick={toggleCat}
                        className={`${chatStyles.switch} ${catEnabled ? chatStyles.switchOn : ''}`}
                    >
                        <span className={chatStyles.switchThumb} />
                    </button>
                </div>

                <div className={styles.helpBox}>
                    تغییر بلافاصله ذخیره می‌شود و کاربران با باز کردن یا رفرش صفحهٔ چت نتیجه را می‌بینند. کاربرانی
                    که در سیستم‌عامل «کاهش حرکت» را روشن کرده‌اند نسخهٔ آرام‌تر گربه را می‌بینند.
                </div>
            </section>
        </div>
    );
}
