'use client';

import React, { useState } from 'react';
import styles from '../../SupportPage.module.scss';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { notifyError } from '@/app/lib/errors';
import { supportApi } from '@/app/(developers)/support/lib/support-api';
import { isRtlLanguage } from '@/app/lib/i18n/config';

export default function NewTicket() {
    const { t, i18n } = useTranslation('support');
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [department, setDepartment] = useState('technical');
    const [priority, setPriority] = useState('medium');
    const [relatedRef, setRelatedRef] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const rtl = isRtlLanguage(i18n.language);

    const deptLabel = (value: string) => {
        if (value === 'billing') return t('dept_billing');
        if (value === 'sales') return t('dept_sales');
        return t('dept_tech');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        try {
            setLoading(true);

            const formattedContent = `
${t('dept_prefix', { dept: deptLabel(department) })}
${relatedRef ? t('related_ref', { ref: relatedRef }) : ''}

${message}
            `.trim();

            await supportApi.createTicket({
                title: subject.trim(),
                priority,
                content: formattedContent,
            });

            router.push('/support');
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.listPage} ${rtl ? styles.rtl : ''}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            <div className={styles.layoutGrid}>
                <section className={styles.formSection}>
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>{t('new_request')}</h2>

                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('ticket_subject')}</label>
                                <input
                                    type="text"
                                    placeholder={t('subject_placeholder')}
                                    className={styles.input}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className={styles.rowGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('department')}</label>
                                    <select
                                        className={styles.select}
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="technical">{t('dept_tech')}</option>
                                        <option value="billing">{t('dept_billing')}</option>
                                        <option value="sales">{t('dept_sales')}</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('priority_level')}</label>
                                    <select
                                        className={styles.select}
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="low">{t('low')}</option>
                                        <option value="medium">{t('medium')}</option>
                                        <option value="high">{t('urgent_critical')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('related_id')}</label>
                                <input
                                    type="text"
                                    placeholder={t('related_placeholder')}
                                    className={`${styles.input} ${styles.ltrInput}`}
                                    value={relatedRef}
                                    onChange={(e) => setRelatedRef(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('request_body')}</label>
                                <textarea
                                    rows={5}
                                    placeholder={t('message_placeholder')}
                                    className={styles.textarea}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                {loading ? t('sending_ticket') : t('send_ticket')}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}
