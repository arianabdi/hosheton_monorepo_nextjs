'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from './TelegramBots.module.scss';
import parentStyles from '../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import Link from 'next/link';
import { createBot, deleteBot, deleteWebhook, listBots, setWebhook, validateToken } from './telegram-bots-api';
import type { TelegramBot } from './telegram-bots.types';

export default function TelegramBotsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [bots, setBots] = useState<TelegramBot[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [botToken, setBotToken] = useState('');
    const [description, setDescription] = useState('');
    const [publicBaseUrl, setPublicBaseUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [usernamePreview, setUsernamePreview] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const result = await listBots(baseUrl, token);
            setBots(result.items ?? []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const checkToken = async () => {
        if (!botToken.trim() || !token) return;
        try {
            const me = await validateToken(baseUrl, token, botToken.trim());
            setUsernamePreview(`@${me.username}`);
        } catch (e) {
            setUsernamePreview('');
            ErrorToaster(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !name.trim() || !botToken.trim()) return;
        try {
            setSaving(true);
            const bot = await createBot(baseUrl, token, {
                name: name.trim(),
                botToken: botToken.trim(),
                description: description.trim() || undefined,
            });
            SuccessToaster({ message: `بات @${bot.username} ساخته شد. حالا سناریو را در ادیتور طراحی کنید.` });
            setShowForm(false);
            setName('');
            setBotToken('');
            setDescription('');
            setUsernamePreview('');
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    const toggleWebhook = async (bot: TelegramBot) => {
        if (!token) return;
        try {
            if (bot.isActive) {
                await deleteWebhook(baseUrl, token, bot._id);
                SuccessToaster({ message: 'بات غیرفعال شد' });
            } else {
                await setWebhook(baseUrl, token, bot._id, publicBaseUrl.trim() || undefined);
                SuccessToaster({ message: 'وب‌هوک ثبت و بات فعال شد' });
            }
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const removeBot = async (bot: TelegramBot) => {
        if (!token || !window.confirm(`بات «${bot.name}» حذف شود؟`)) return;
        try {
            await deleteBot(baseUrl, token, bot._id);
            SuccessToaster({ message: 'بات حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>سازنده بات تلگرام</h1>
                            <p className={parentStyles.subtitle}>ساخت بات با سناریوی بصری: پیام، دکمه، شرط، فرم و درخواست HTTP</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => setShowForm(true)}>
                            + بات جدید
                        </button>
                    </header>

                    <div className={parentStyles.field}>
                        <label>آدرس عمومی سرور (برای ثبت وب‌هوک)</label>
                        <input
                            dir="ltr"
                            placeholder="https://api.example.com"
                            value={publicBaseUrl}
                            onChange={(e) => setPublicBaseUrl(e.target.value)}
                        />
                        <p className={styles.hint}>اگر خالی باشد، از متغیر محیطی TELEGRAM_BOT_WEBHOOK_BASE_URL سرور استفاده می‌شود.</p>
                    </div>

                    <div className={parentStyles.connectionGrid}>
                        {bots.length === 0 ? (
                            <div className={parentStyles.emptyState}>هنوز باتی ساخته نشده است</div>
                        ) : (
                            bots.map((bot) => (
                                <div key={bot._id} className={parentStyles.connectionCard}>
                                    <h3>
                                        <span className={`${styles.statusDot} ${bot.isActive ? styles.active : styles.inactive}`} />
                                        {bot.name}
                                    </h3>
                                    <p dir="ltr" style={{ textAlign: 'left' }}>@{bot.username || '—'}</p>
                                    <p>{bot.description || '—'}</p>
                                    <span className={`${parentStyles.badge} ${bot.isActive ? parentStyles.badgeActive : parentStyles.badgeInactive}`}>
                                        {bot.isActive ? 'فعال' : 'غیرفعال'}
                                    </span>
                                    {bot.lastError ? <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{bot.lastError}</p> : null}
                                    <div className={parentStyles.cardActions} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <Link href={`/telegram-bots/${bot._id}`} className={parentStyles.editLink}>
                                            طراحی سناریو
                                        </Link>
                                        <button type="button" className={styles.smallBtn} onClick={() => toggleWebhook(bot)}>
                                            {bot.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی (وب‌هوک)'}
                                        </button>
                                        <button type="button" className={parentStyles.deleteBtn} onClick={() => removeBot(bot)}>
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>ساخت بات جدید</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}>
                                        <label>نام بات</label>
                                        <input value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>توکن بات (از BotFather)</label>
                                        <input dir="ltr" value={botToken} onChange={(e) => { setBotToken(e.target.value); setUsernamePreview(''); }} onBlur={checkToken} required />
                                        {usernamePreview ? <p className={styles.hint} style={{ color: '#10b981' }}>✓ {usernamePreview}</p> : null}
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>توضیح</label>
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                                    </div>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn} disabled={saving}>
                                            {saving ? 'در حال ساخت...' : 'ساخت بات'}
                                        </button>
                                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => setShowForm(false)}>
                                            انصراف
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
